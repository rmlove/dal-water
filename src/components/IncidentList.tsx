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
  const s = status.toLowerCase()
  if (s.includes('closed') || s.includes('resolved') || s.includes('complete')) return 'status-closed'
  if (s.includes('progress') || s.includes('open') || s.includes('pending')) return 'status-open'
  return 'status-other'
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function IncidentList({ incidents, selectedId, onSelect, loading, error }: IncidentListProps) {
  if (loading) {
    return (
      <div className="incident-list skeleton-list">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-item">
            <div className="skeleton-dot" />
            <div className="skeleton-lines">
              <div className="skeleton-line wide" />
              <div className="skeleton-line narrow" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="incident-list-message error">
        <div className="error-title">Could not load incidents</div>
        <div className="error-detail">{error}</div>
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="incident-list-message">
        <div className="empty-icon">🔍</div>
        <div>No incidents found for this date range and filters.</div>
        <div className="empty-hint">Try expanding the date range or enabling more categories.</div>
      </div>
    )
  }

  const openCount = incidents.filter((i) => !i.status.toLowerCase().includes('closed')).length

  return (
    <div className="incident-list">
      <div className="incident-list-header">
        <span>{incidents.length} incidents</span>
        {openCount > 0 && (
          <span className="open-badge">{openCount} open</span>
        )}
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
                <span className="incident-date">{relativeDate(incident.createdDate)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
