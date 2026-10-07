import type { IncidentCategory, WaterIncident } from '../types'

// 311 Service Requests — October 1, 2020 to Present (daily updates)
const BASE_URL = 'https://www.dallasopendata.com/resource/d7e7-envw.json'

// Exact service_request_type values from the Dallas 311 dataset that are
// water-related (department = "Dallas Water Utilities" or "Office of Env Quality").
const WATER_KEYWORDS = [
  'Water Main',
  'Sewer',
  'Sewage',
  'Storm Drain',
  'Storm Sewer',
  'Stormwater',
  'Flooding',
  'Flooded',
  'Creek',
  'Water Pollution',
  'Chemical Spill',
  'Swimming Pool Discharge',
  'Floodplain',
  'Water/Sanitary',
  'Water/Wastewater',
]

const CATEGORY_RULES: { category: IncidentCategory; match: RegExp }[] = [
  { category: 'Water Main Break', match: /water\s*main\s*leak|water\s*main\s*break/i },
  { category: 'Sewer Problem', match: /sewer\s*problem|sewage/i },
  { category: 'Water Pollution', match: /water\s*pollution|chemical\s*spill|swimming\s*pool\s*discharge/i },
  { category: 'Drainage / Storm Water', match: /storm\s*drain|storm\s*sewer|stormwater|flood|creek|culvert|inlet/i },
  { category: 'Water / Sewer Construction', match: /construction|line\s*locate/i },
]

export function categorize(type: string): IncidentCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(type)) return rule.category
  }
  return 'Other Water'
}

export const ALL_CATEGORIES: IncidentCategory[] = [
  'Water Main Break',
  'Sewer Problem',
  'Water Pollution',
  'Drainage / Storm Water',
  'Water / Sewer Construction',
  'Other Water',
]

interface RawRecord {
  [key: string]: unknown
}

function toIso(date: Date): string {
  return date.toISOString().split('.')[0]
}

function buildWhereClause(startDate: string, endDate: string): string {
  const typeClauses = WATER_KEYWORDS.map(
    (kw) => `upper(service_request_type) like upper('%${kw.replace(/'/g, "''")}%')`
  ).join(' OR ')

  const start = toIso(new Date(`${startDate}T00:00:00`))
  const end = toIso(new Date(`${endDate}T23:59:59`))

  return `(${typeClauses}) AND created_date between '${start}' AND '${end}'`
}

function getNumber(record: RawRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const val = record[key]
    if (val !== undefined && val !== null && val !== '') {
      const num = typeof val === 'number' ? val : parseFloat(String(val))
      if (!Number.isNaN(num)) return num
    }
  }
  return undefined
}

function getString(record: RawRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = record[key]
    if (val !== undefined && val !== null && val !== '') return String(val)
  }
  return undefined
}

function extractCoordinates(record: RawRecord): { lat?: number; lng?: number } {
  // Many SODA datasets expose a Point column as GeoJSON: { coordinates: [lng, lat] }
  const point = record['point'] ?? record['geocoded_column'] ?? record['location']
  if (point && typeof point === 'object') {
    const coords = (point as RawRecord)['coordinates']
    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords as [number, number]
      return { lat, lng }
    }
  }

  // The Dallas 311 dataset exposes coordinates as a "(lat,lng)" string.
  const latLocation = getString(record, ['lat_location'])
  if (latLocation) {
    const match = latLocation.match(/\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/)
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
    }
  }

  return {
    lat: getNumber(record, ['latitude', 'lat', 'latitude_x', 'y_coordinate']),
    lng: getNumber(record, ['longitude', 'long', 'lng', 'longitude_x', 'x_coordinate']),
  }
}

function normalize(record: RawRecord): WaterIncident | null {
  const { lat, lng } = extractCoordinates(record)
  if (lat === undefined || lng === undefined) return null
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  // Sanity check: keep within roughly the DFW area.
  if (lat < 31 || lat > 34 || lng < -98 || lng > -95) return null

  const type = getString(record, ['service_request_type', 'sr_type', 'type']) ?? 'Unknown'
  const id =
    getString(record, ['service_request_number', 'service_request_id', 'sr_number', 'case_number', 'objectid']) ??
    `${type}-${lat}-${lng}-${getString(record, ['created_date']) ?? Math.random()}`

  return {
    id,
    type,
    category: categorize(type),
    status:
      getString(record, ['service_request_status', 'status', 'sr_status']) ?? 'Unknown',
    address:
      getString(record, ['address', 'street_address', 'incident_address']) ??
      'Address unavailable',
    createdDate: getString(record, ['created_date', 'date_created']) ?? '',
    closedDate: getString(record, ['closed_date', 'date_closed']),
    councilDistrict: getString(record, ['city_council_district', 'council_district']),
    outcome: getString(record, ['outcome']),
    lat,
    lng,
  }
}

export interface FetchOptions {
  startDate: string
  endDate: string
  limit?: number
}

export async function fetchWaterIncidents({
  startDate,
  endDate,
  limit = 2000,
}: FetchOptions): Promise<WaterIncident[]> {
  const where = buildWhereClause(startDate, endDate)
  const params = new URLSearchParams({
    $where: where,
    $order: 'created_date DESC',
    $limit: String(limit),
  })

  const response = await fetch(`${BASE_URL}?${params.toString()}`)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let detail = body
    try {
      const parsed = JSON.parse(body) as { message?: string }
      if (parsed.message) detail = parsed.message
    } catch {
      // body wasn't JSON; use it as-is
    }
    throw new Error(
      `Dallas 311 API request failed: ${response.status} ${response.statusText}${
        detail ? ` — ${detail}` : ''
      }`
    )
  }

  const data = (await response.json()) as RawRecord[]
  const incidents: WaterIncident[] = []
  for (const record of data) {
    const incident = normalize(record)
    if (incident) incidents.push(incident)
  }
  return incidents
}
