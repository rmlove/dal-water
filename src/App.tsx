import { useEffect, useMemo, useState } from 'react'
import FilterBar from './components/FilterBar'
import MapView from './components/MapView'
import IncidentList from './components/IncidentList'
import { fetchWaterIncidents, ALL_CATEGORIES } from './api/dallas311'
import { geocodeAddress } from './api/geocode'
import { haversineMiles } from './utils/distance'
import type { IncidentCategory, WaterIncident } from './types'
import './App.css'

const DAY_MS = 24 * 60 * 60 * 1000

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function daysAgo(n: number): string {
  return formatDate(new Date(Date.now() - n * DAY_MS))
}

function today(): string {
  return formatDate(new Date())
}

export type RadiusMiles = 1 | 3 | 5

function App() {
  const [startDate, setStartDate] = useState(() => daysAgo(30))
  const [endDate, setEndDate] = useState(() => today())
  const [incidents, setIncidents] = useState<WaterIncident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategories, setActiveCategories] = useState<Set<IncidentCategory>>(
    new Set(ALL_CATEGORIES)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(3)

  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('googleMapsApiKey') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  )
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number; label: string } | null>(
    null
  )
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('googleMapsApiKey', apiKey)
  }, [apiKey])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch on mount/dep change
    setLoading(true)
    setError(null)

    fetchWaterIncidents({ startDate, endDate })
      .then((data) => {
        if (!cancelled) setIncidents(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load incidents.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  const handleDateChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart)
    setEndDate(newEnd)
  }

  const handleToggleCategory = (category: IncidentCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const handleSelectAllCategories = () => setActiveCategories(new Set(ALL_CATEGORIES))
  const handleClearCategories = () => setActiveCategories(new Set())

  const handleSearchAddress = async (address: string) => {
    if (!apiKey) {
      setSearchError('Add a Google Maps API key to enable address search.')
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const result = await geocodeAddress(address, apiKey)
      setSearchCenter({ lat: result.lat, lng: result.lng, label: result.formattedAddress })
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (!activeCategories.has(incident.category)) return false
      if (searchCenter) {
        if (haversineMiles(searchCenter, incident) > radiusMiles) return false
      }
      return true
    })
  }, [incidents, activeCategories, searchCenter, radiusMiles])

  const openCount = useMemo(
    () => filteredIncidents.filter((i) => !i.status.toLowerCase().includes('closed')).length,
    [filteredIncidents]
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1>Dallas Water Watch</h1>
            <p>Live 311 reports — main breaks, sewer problems, flooding, and water pollution across Dallas</p>
          </div>
          <div className="app-header-stats">
            <span className="stat">
              <strong>{filteredIncidents.length}</strong> incidents
            </span>
            <span className="stat open">
              <strong>{openCount}</strong> open
            </span>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <FilterBar
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
            activeCategories={activeCategories}
            onToggleCategory={handleToggleCategory}
            onSelectAll={handleSelectAllCategories}
            onClearAll={handleClearCategories}
            onSearchAddress={handleSearchAddress}
            searching={searching}
            searchError={searchError}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            radiusMiles={radiusMiles}
            onRadiusChange={setRadiusMiles}
          />
          {searchCenter && (
            <div className="search-result">
              <div>
                Within <strong>{radiusMiles} mi</strong> of <strong>{searchCenter.label}</strong>
              </div>
              <button onClick={() => setSearchCenter(null)}>Clear search</button>
            </div>
          )}
          <IncidentList
            incidents={filteredIncidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
            error={error}
          />
        </aside>

        <main className="map-pane">
          <MapView
            apiKey={apiKey}
            incidents={filteredIncidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            center={searchCenter}
          />
        </main>
      </div>
    </div>
  )
}

export default App
