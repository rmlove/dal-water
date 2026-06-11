export type IncidentCategory =
  | 'Water Leak'
  | 'Water Main Break'
  | 'Water Waste'
  | 'Water Pressure'
  | 'Water Quality'
  | 'Drainage / Storm Water'
  | 'Other Water'

export interface WaterIncident {
  id: string
  type: string
  category: IncidentCategory
  status: string
  address: string
  createdDate: string
  closedDate?: string
  lat: number
  lng: number
}
