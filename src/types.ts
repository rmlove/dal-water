export type IncidentCategory =
  | 'Water Main Break'
  | 'Sewer Problem'
  | 'Water Pollution'
  | 'Drainage / Storm Water'
  | 'Water / Sewer Construction'
  | 'Other Water'

export interface WaterIncident {
  id: string
  type: string
  category: IncidentCategory
  status: string
  address: string
  createdDate: string
  closedDate?: string
  councilDistrict?: string
  outcome?: string
  lat: number
  lng: number
}
