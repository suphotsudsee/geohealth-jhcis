import mysql from 'mysql2/promise'
import prisma from '@/lib/prisma'

export interface JHCISConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export interface SyncResult {
  tableName: string
  recordsProcessed: number
  recordsInserted: number
  recordsUpdated: number
  errors: string[]
  durationMs: number
}

export class JHCISSyncConnector {
  private config: JHCISConfig
  private pool?: mysql.Pool

  constructor(config: JHCISConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    })
  }

  async disconnect(): Promise<void> {
    if (this.pool) await this.pool.end()
  }

  private async getPool(): Promise<mysql.Pool> {
    if (!this.pool) await this.connect()
    return this.pool!
  }

  // ── Sync Villages ──
  async syncVillages(): Promise<SyncResult> {
    const start = Date.now()
    const result: SyncResult = { tableName: 'village', recordsProcessed: 0, recordsInserted: 0, recordsUpdated: 0, errors: [], durationMs: 0 }

    try {
      const pool = await this.getPool()
      const [rows] = await pool.query(
        'SELECT pcucode, villcode, villno, villname, latitude, longitude FROM village WHERE outdate IS NULL OR outdate = 0'
      ) as any[]

      result.recordsProcessed = rows.length

      for (const row of rows) {
        const code = `${row.pcucode}${String(row.villcode).padStart(2, '0')}`
        try {
          await prisma.village.upsert({
            where: { code },
            update: {
              name: row.villname || `หมู่ ${row.villno}`,
              moo: row.villno,
              subDistrictCode: row.pcucode?.substring(0, 6),
              centerLat: row.latitude,
              centerLng: row.longitude,
            },
            create: {
              code,
              name: row.villname || `หมู่ ${row.villno}`,
              moo: row.villno,
              subDistrictCode: row.pcucode?.substring(0, 6),
              centerLat: row.latitude,
              centerLng: row.longitude,
            },
          })
          result.recordsUpdated++
        } catch (err: any) {
          result.errors.push(`Village ${code}: ${err.message}`)
        }
      }

      result.recordsInserted = result.recordsUpdated // upsert counts as update
    } catch (err: any) {
      result.errors.push(err.message)
    }

    result.durationMs = Date.now() - start
    return result
  }

  // ── Sync Houses ──
  async syncHouses(): Promise<SyncResult> {
    const start = Date.now()
    const result: SyncResult = { tableName: 'house', recordsProcessed: 0, recordsInserted: 0, recordsUpdated: 0, errors: [], durationMs: 0 }

    try {
      const pool = await this.getPool()
      const [rows] = await pool.query(
        `SELECT h.pcucode, h.hcode, h.hno, h.villcode, h.xgis, h.ygis, h.hid, h.telephonehouse ` +
        `FROM house h WHERE h.hno IS NOT NULL AND h.hno != ''`
      ) as any[]

      result.recordsProcessed = rows.length

      for (const row of rows) {
        const villageCode = `${row.pcucode}${String(row.villcode).padStart(2, '0')}`
        const lat = parseFloat(row.ygis)
        const lng = parseFloat(row.xgis)
        const hasValidCoord = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0

        // Find village
        const village = await prisma.village.findUnique({ where: { code: villageCode } })
        if (!village) continue

        try {
          await prisma.house.upsert({
            where: { id: `${row.pcucode}-${row.hcode}` },
            update: {
              houseNo: row.hno,
              address: `หมู่ ${row.villcode} ${village.name}`,
              lat: hasValidCoord ? lat : undefined,
              lng: hasValidCoord ? lng : undefined,
              villageId: village.id,
            },
            create: {
              id: `${row.pcucode}-${row.hcode}`,
              houseNo: row.hno,
              address: `หมู่ ${row.villcode} ${village.name}`,
              villageId: village.id,
              lat: hasValidCoord ? lat : undefined,
              lng: hasValidCoord ? lng : undefined,
            },
          })
          result.recordsUpdated++
        } catch (err: any) {
          result.errors.push(`House ${row.pcucode}-${row.hcode}: ${err.message}`)
        }
      }
    } catch (err: any) {
      result.errors.push(err.message)
    }

    result.durationMs = Date.now() - start
    return result
  }

  // ── Sync Persons ──
  async syncPersons(): Promise<SyncResult> {
    const start = Date.now()
    const result: SyncResult = { tableName: 'person', recordsProcessed: 0, recordsInserted: 0, recordsUpdated: 0, errors: [], durationMs: 0 }

    try {
      const pool = await this.getPool()
      const [rows] = await pool.query(
        `SELECT p.pcucodeperson, p.pid, p.idcard, p.fname, p.lname, p.birth, p.sex, ` +
        `p.hcode, p.mobile, p.prename, p.nation, p.dateupdate, ` +
        `p.persondisease, p.allergic, p.bloodgroup, p.occupa, p.educate ` +
        `FROM person p WHERE p.idcard IS NOT NULL AND p.idcard != ''`
      ) as any[]

      result.recordsProcessed = rows.length

      for (const row of rows) {
        // Calculate age
        const birthDate = row.birth ? new Date(row.birth) : null
        let age: number | null = null
        if (birthDate) {
          const today = new Date()
          age = today.getFullYear() - birthDate.getFullYear()
          const m = today.getMonth() - birthDate.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
        }

        // Find house
        const houseId = row.hcode ? `${row.pcucodeperson}-${row.hcode}` : null

        try {
          await prisma.patient.upsert({
            where: { cid: row.idcard },
            update: {
              hn: String(row.pid),
              fullName: `${row.prename || ''} ${row.fname || ''} ${row.lname || ''}`.trim(),
              firstName: row.fname,
              lastName: row.lname,
              birthDate: birthDate,
              age,
              gender: row.sex === '1' ? 'MALE' : row.sex === '2' ? 'FEMALE' : 'UNKNOWN',
              phone: row.mobile?.trim() || null,
              houseId: houseId || null,
              chronicDisease: row.persondisease || null,
              drugAllergy: row.allergic || null,
              lastSyncAt: new Date(),
              disability: undefined,
              bedridden: undefined,
            },
            create: {
              cid: row.idcard,
              hn: String(row.pid),
              fullName: `${row.prename || ''} ${row.fname || ''} ${row.lname || ''}`.trim(),
              firstName: row.fname,
              lastName: row.lname,
              birthDate: birthDate,
              age,
              gender: row.sex === '1' ? 'MALE' : row.sex === '2' ? 'FEMALE' : 'UNKNOWN',
              phone: row.mobile?.trim() || null,
              houseId: houseId || null,
              chronicDisease: row.persondisease || null,
              drugAllergy: row.allergic || null,
              riskLevel: 'NORMAL',
              lastSyncAt: new Date(),
            },
          })
          result.recordsUpdated++
        } catch (err: any) {
          result.errors.push(`Person ${row.idcard}: ${err.message}`)
        }
      }

      result.recordsInserted = result.recordsUpdated
    } catch (err: any) {
      result.errors.push(err.message)
    }

    result.durationMs = Date.now() - start
    return result
  }

  // ── Sync All ──
  async syncAll(): Promise<{
    villages: SyncResult
    houses: SyncResult
    persons: SyncResult
  }> {
    const villages = await this.syncVillages()
    const houses = await this.syncHouses()
    const persons = await this.syncPersons()
    return { villages, houses, persons }
  }
}

export default JHCISSyncConnector
