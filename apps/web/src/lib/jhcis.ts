import mysql, { type RowDataPacket } from 'mysql2/promise'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const THAILAND_BOUNDS = {
  minLat: 5,
  maxLat: 21,
  minLng: 97,
  maxLng: 106,
}

type GlobalWithJhcis = typeof globalThis & {
  jhcisPool?: mysql.Pool
}

const globalForJhcis = globalThis as GlobalWithJhcis

function loadEnvFile(filepath: string) {
  if (!existsSync(filepath)) return

  const content = readFileSync(filepath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const rawValue = trimmed.slice(separator + 1).trim()
    const value = rawValue.replace(/^["']|["']$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

function loadJhcisEnvFallback() {
  if (process.env.JHCIS_DB_HOST && process.env.JHCIS_DB_NAME) return

  loadEnvFile(resolve(process.cwd(), '.env'))
  loadEnvFile(resolve(process.cwd(), '..', '..', '.env'))
}

function requiredEnv(name: string) {
  loadJhcisEnvFallback()
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

export function getJhcisPool() {
  if (!globalForJhcis.jhcisPool) {
    globalForJhcis.jhcisPool = mysql.createPool({
      host: requiredEnv('JHCIS_DB_HOST'),
      port: Number(process.env.JHCIS_DB_PORT || 3306),
      user: requiredEnv('JHCIS_DB_USER'),
      password: process.env.JHCIS_DB_PASSWORD || '',
      database: requiredEnv('JHCIS_DB_NAME'),
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      dateStrings: false,
    })
  }

  return globalForJhcis.jhcisPool
}

export async function jhcisQuery<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const [rows] = await getJhcisPool().query<T[]>(sql, params)
  return rows
}

export function jhcisPersonId(pcucodeperson: string, pid: number | string) {
  return `${pcucodeperson}:${pid}`
}

export function jhcisHouseId(pcucode: string, hcode: number | string) {
  return `${pcucode}:${hcode}`
}

function isValidThaiCoordinate(lat: number, lng: number) {
  return (
    lat >= THAILAND_BOUNDS.minLat &&
    lat <= THAILAND_BOUNDS.maxLat &&
    lng >= THAILAND_BOUNDS.minLng &&
    lng <= THAILAND_BOUNDS.maxLng
  )
}

export function normalizeJhcisCoordinate(rawX: unknown, rawY: unknown) {
  const first = typeof rawX === 'number' ? rawX : parseFloat(String(rawX ?? ''))
  const second = typeof rawY === 'number' ? rawY : parseFloat(String(rawY ?? ''))

  if (!Number.isFinite(first) || !Number.isFinite(second)) return { lat: null, lng: null }
  if (isValidThaiCoordinate(first, second)) return { lat: first, lng: second }
  if (isValidThaiCoordinate(second, first)) return { lat: second, lng: first }
  return { lat: null, lng: null }
}

export function genderFromJhcis(sex: unknown) {
  if (String(sex) === '1') return 'MALE'
  if (String(sex) === '2') return 'FEMALE'
  return 'UNKNOWN'
}

export function riskFromChronic(chronicCount: unknown) {
  return Number(chronicCount || 0) > 0 ? 'HIGH' : 'NORMAL'
}

export function riskFromHouseFactors({
  bedriddenCount,
  chronicCount,
  elderlyCount,
}: {
  bedriddenCount: unknown
  chronicCount: unknown
  elderlyCount: unknown
}) {
  if (Number(bedriddenCount || 0) > 0) return 'CRITICAL'
  if (Number(chronicCount || 0) > 0) return 'HIGH'
  if (Number(elderlyCount || 0) > 0) return 'MEDIUM'
  return 'NORMAL'
}
