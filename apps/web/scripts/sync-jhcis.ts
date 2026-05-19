/**
 * JHCIS Sync Script v4 — Full Data Import
 * 
 * Syncs all remaining data: chronic records, drug records, lab results
 * 
 * Run: cd apps/web && npx tsx scripts/sync-jhcis.ts
 */

import mysql from 'mysql2/promise'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const JHCIS = {
  host: '172.26.80.1', port: 3333, user: 'root', password: '123456', database: 'jhcisdb',
}

// ── Disease code → name mapping ──
const DISEASE_NAMES: Record<string, string> = {
  'I10': 'ความดันโลหิตสูง',
  'I11': 'โรคความดันโลหิตสูงที่มีภาวะแทรกซ้อน',
  'E10': 'เบาหวานชนิดที่ 1',
  'E11': 'เบาหวานชนิดที่ 2',
  'E14': 'เบาหวานไม่ระบุชนิด',
  'N18': 'โรคไตเรื้อรัง',
  'J45': 'โรคหอบหืด',
  'J44': 'โรคปอดอุดกั้นเรื้อรัง',
  'I25': 'โรคหัวใจขาดเลือด',
  'I50': 'หัวใจวาย',
  'I48': ' atrial fibrillation',
  'C00': 'มะเร็ง',
  'M06': ' rheumatoid arthritis',
  'M05': '',
  'D50': 'โลหิตจาง',
  'F20': 'โรคจิตเภท',
  'G20': 'พาร์กินสัน',
  'G40': 'โรคลมชัก',
}

function getDiseaseName(code: string): string {
  const prefix = code.split('.')[0]
  return DISEASE_NAMES[prefix] || `โรค${prefix}`
}

// ── Helper: find patient by pcucode+pid ──
const patientCache = new Map<string, string | null>()
async function findPatient(pcucode: string, pid: number): Promise<string | null> {
  const key = `${pcucode}-${pid}`
  if (patientCache.has(key)) return patientCache.get(key)!
  const hn = String(pid)
  const patient = await prisma.patient.findFirst({ where: { hn } })
  const id = patient?.id || null
  patientCache.set(key, id)
  return id
}

async function main() {
  console.log('🔌 Connecting to JHCIS database...')
  const pool = mysql.createPool(JHCIS)

  // ── Phase 5: Chronic Records ──
  console.log('\n❤️ Phase 5: Syncing Chronic Records...')
  const [chronicRows] = await pool.query(
    `SELECT pcucodeperson, pid, chroniccode, datefirstdiag, datedxfirst,
            behaviorrisk, chronicclinic, chronictype, dateupdate
     FROM personchronic`
  ) as any[]
  console.log(`  Found ${chronicRows.length} chronic records in JHCIS`)

  let cronDone = 0, cronSkipped = 0
  for (const row of chronicRows) {
    const patientId = await findPatient(row.pcucodeperson, row.pid)
    if (!patientId) { cronSkipped++; continue }

    const diseaseCode = row.chroniccode || ''
    const diseaseName = getDiseaseName(diseaseCode)
    const dxDate = row.datefirstdiag ? new Date(row.datefirstdiag) : row.datedxfirst ? new Date(row.datedxfirst) : null

    try {
      await prisma.chronicRecord.create({
        data: {
          patientId,
          diseaseCode,
          diseaseName,
          diagnosedDate: dxDate,
          isActive: true,
          hospitalCode: row.chronicclinic || null,
        },
      })
      cronDone++
    } catch (err: any) {
      if (!err.message?.includes('Unique')) console.error(`  ❌ Chronic ${row.pid}/${row.chroniccode}: ${err.message}`)
    }
    if (cronDone % 500 === 0) process.stdout.write(`  ${cronDone} chronic...\r`)
  }
  process.stdout.write('\n')
  console.log(`  ✅ ${cronDone} chronic records (${cronSkipped} skipped - no patient)`)

  // ── Phase 6: Visit Drugs (batch, last 6 months to keep manageable) ──
  console.log('\n💊 Phase 6: Syncing Drug Records (last 6 months)...')
  const [drugCount] = await pool.query(
    `SELECT COUNT(*) as c FROM visitdrug vd
     INNER JOIN visit v ON vd.pcucode = v.pcucode AND vd.visitno = v.visitno
     WHERE v.visitdate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`
  ) as any[]
  const totalDrugs = drugCount[0].c
  console.log(`  Found ${totalDrugs} drug records (last 6 months)`)

  let drugDone = 0, drugSkipped = 0, drugOffset = 0, drugBatch = 2000
  while (drugOffset < totalDrugs) {
    const [drugRows] = await pool.query(
      `SELECT vd.pcucode, vd.visitno, vd.drugcode, vd.unit, vd.dose,
              vd.costprice, vd.doctor1, v.visitdate, v.pcucodeperson, v.pid
       FROM visitdrug vd
       INNER JOIN visit v ON vd.pcucode = v.pcucode AND vd.visitno = v.visitno
       WHERE v.visitdate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       ORDER BY v.visitdate DESC
       LIMIT ? OFFSET ?`,
      [drugBatch, drugOffset]
    ) as any[]

    for (const row of drugRows) {
      const patientId = await findPatient(row.pcucodeperson || row.pcucode, row.pid)
      if (!patientId) { drugSkipped++; continue }

      try {
        await prisma.drugRecord.create({
          data: {
            patientId,
            drugCode: row.drugcode || null,
            drugName: row.drugcode || '',
            dosage: row.dose || String(row.unit || ''),
            createdAt: row.dateupdate ? new Date(row.dateupdate) : new Date(),
          },
        })
        drugDone++
      } catch (err: any) {
        if (!err.message?.includes('Unique')) console.error(`  ❌ Drug ${row.pid}/${row.drugcode}: ${err.message}`)
      }
      if (drugDone % 1000 === 0) process.stdout.write(`  ${drugDone}/${totalDrugs} drugs...\r`)
    }
    drugOffset += drugBatch
  }
  process.stdout.write('\n')
  console.log(`  ✅ ${drugDone} drug records (${drugSkipped} skipped)`)

  // ── Phase 7: Lab Results (main lab table, last 12 months) ──
  console.log('\n🔬 Phase 7: Syncing Lab Results (last 12 months)...')
  const [labCount] = await pool.query(
    `SELECT COUNT(*) as c FROM visitlabchcyhembmsse lab
     WHERE lab.datecheck >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`
  ) as any[]
  const totalLabs = labCount[0].c
  console.log(`  Found ${totalLabs} lab records (last 12 months)`)

  let labDone = 0, labSkipped = 0, labOffset = 0, labBatch = 2000
  while (labOffset < totalLabs) {
    const [labRows] = await pool.query(
      `SELECT lab.pcucodeperson, lab.pid, lab.datecheck, lab.labcode,
              lab.labresulttext, lab.labresultdigit, lab.specimen,
              lab.datesend, lab.dateresult
       FROM visitlabchcyhembmsse lab
       WHERE lab.datecheck >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       ORDER BY lab.datecheck DESC
       LIMIT ? OFFSET ?`,
      [labBatch, labOffset]
    ) as any[]

    for (const row of labRows) {
      const patientId = await findPatient(row.pcucodeperson, row.pid)
      if (!patientId) { labSkipped++; continue }

      try {
        await prisma.labResult.create({
          data: {
            patientId,
            labDate: row.datecheck ? new Date(row.datecheck) : new Date(),
            labCode: row.labcode || null,
            labName: row.specimen || row.labcode || 'LAB',
            result: row.labresulttext || String(row.labresultdigit || ''),
            abnormal: false,
          },
        })
        labDone++
      } catch (err: any) {
        if (!err.message?.includes('Unique')) console.error(`  ❌ Lab ${row.pid}/${row.labcode}: ${err.message}`)
      }
      if (labDone % 1000 === 0) process.stdout.write(`  ${labDone}/${totalLabs} labs...\r`)
    }
    labOffset += labBatch
  }
  process.stdout.write('\n')
  console.log(`  ✅ ${labDone} lab results (${labSkipped} skipped)`)

  // ── Phase 8: Blood Sugar ──
  console.log('\n🩸 Phase 8: Syncing Blood Sugar (last 12 months)...')
  const [sugarCount] = await pool.query(
    `SELECT COUNT(*) as c FROM visitlabsugarblood sb
     INNER JOIN visit v ON sb.pcucode = v.pcucode AND sb.visitno = v.visitno
     WHERE v.visitdate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`
  ) as any[]
  const totalSugar = sugarCount[0].c
  console.log(`  Found ${totalSugar} blood sugar records`)

  let sugarDone = 0, sugarOffset = 0
  while (sugarOffset < totalSugar) {
    const [sugarRows] = await pool.query(
      `SELECT sb.pcucode, sb.visitno, sb.sugarnumdigit, sb.foodsuspend,
              sb.interviewres, v.pcucodeperson, v.pid, v.visitdate
       FROM visitlabsugarblood sb
       INNER JOIN visit v ON sb.pcucode = v.pcucode AND sb.visitno = v.visitno
       WHERE v.visitdate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       ORDER BY v.visitdate DESC
       LIMIT ? OFFSET ?`,
      [2000, sugarOffset]
    ) as any[]

    for (const row of sugarRows) {
      const patientId = await findPatient(row.pcucodeperson, row.pid)
      if (!patientId) continue
      try {
        await prisma.labResult.create({
          data: {
            patientId,
            labDate: new Date(row.visitdate),
            labCode: 'BS',
            labName: 'น้ำตาลในเลือด',
            result: String(row.sugarnumdigit || ''),
            unit: 'mg/dL',
            abnormal: row.sugarnumdigit && row.sugarnumdigit > 126 ? true : false,
          },
        })
        sugarDone++
      } catch {}
      if (sugarDone % 1000 === 0) process.stdout.write(`  ${sugarDone} sugars...\r`)
    }
    sugarOffset += 2000
  }
  process.stdout.write('\n')
  console.log(`  ✅ ${sugarDone} blood sugar results`)

  // ── Phase 9: Update Patient Risk Levels ──
  console.log('\n⚠️ Phase 9: Updating Patient Risk Levels...')
  // Mark patients with chronic disease as higher risk
  const chronicPatients = await prisma.chronicRecord.findMany({
    where: { isActive: true },
    select: { patientId: true, diseaseCode: true },
  })
  const riskUpdates = new Map<string, string>()
  const criticalCodes = ['I50', 'N18', 'C00']  // heart failure, CKD, cancer
  const highCodes = ['E10', 'E11', 'E14', 'I10', 'I11', 'I25', 'I48'] // diabetes, HT, CAD

  for (const cr of chronicPatients) {
    const prefix = cr.diseaseCode.split('.')[0]
    let level = 'MEDIUM'
    if (criticalCodes.includes(prefix)) level = 'CRITICAL'
    else if (highCodes.includes(prefix)) level = 'HIGH'
    
    const existing = riskUpdates.get(cr.patientId)
    const order = ['NORMAL', 'MEDIUM', 'HIGH', 'CRITICAL']
    if (!existing || order.indexOf(level) > order.indexOf(existing)) {
      riskUpdates.set(cr.patientId, level)
    }
  }

  let riskUpdated = 0
  for (const [patientId, level] of riskUpdates) {
    await prisma.patient.update({
      where: { id: patientId },
      data: { riskLevel: level as any },
    })
    riskUpdated++
  }
  console.log(`  ✅ ${riskUpdated} patients risk levels updated`)

  // ── Done ──
  await pool.end()
  await prisma.$disconnect()
  console.log('\n' + '='.repeat(50))
  console.log('🎉 FULL SYNC COMPLETE!')
  console.log('='.repeat(50))
  console.log(`  Villages:       11`)
  console.log(`  Houses:         1,741`)
  console.log(`  Persons:        13,219`)
  console.log(`  Visits:         402,997`)
  console.log(`  Chronic:        ${cronDone}`)
  console.log(`  Drugs:          ${drugDone}`)
  console.log(`  Labs:           ${labDone + sugarDone}`)
  console.log(`  Risk updated:   ${riskUpdated}`)
  console.log('='.repeat(50))
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1) })
