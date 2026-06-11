import type { WaterIncident } from '../types'
import { CATEGORY_COLORS } from '../categoryColors'
import './IncidentList.css'

interface IncidentListProps {
  incidents: WaterIncident[]
  selectedId: string | null
  onSelect: (id: string) => void
  loading: boolean
  error: string | null
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized.includes('closed') || normalized.includes('resolved')) return 'status-closed'
  if (normalized.includes('progress') || normalized.includes('open')) return 'status-open'
  return 'status-other'
}

export default function IncidentList({ incidents, selectedId, onSelect, loading, error }: IncidentListProps) {
  if (loading) return <div className="incident-list-message">Loading incidents...</div>
  if (error) return <div className="incident-list-message error">{error}</div>
  if (incidents.length === 0) {
    return <div className="incident-list-message">No water incidents found for this range and filters.</div>
  }

  return (
    <div className="incident-list">
      <div className="incident-list-header">
        {incidents.length} incident{incidents.length === 1 ? '' : 's'}
      </div>
      <ul>
        {incidents.map((incident) => (
          <li
            key={incident.id}
            className={`incident-item${selectedId === incident.id ? ' selected' : ''}`}
            onClick={() => onSelect(incident.id)}
          >
            <span className="category-dot" style={{ background: CATEGORY_COLORS[incident.category] }} />
            <div className="incident-details">
              <div className="incident-type">{incident.type}</div>
              <div className="incident-address">{incident.address}</div>
              <div className="incident-meta">
                <span className={`status-badge ${statusClass(incident.status)}`}>{incident.status}</span>
                <span className="incident-date">{incident.createdDate.split('T')[0]}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
