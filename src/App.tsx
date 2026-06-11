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

const DEFAULT_END = new Date()
const DEFAULT_START = new Date(DEFAULT_END.getTime() - 90 * DAY_MS)

const SEARCH_RADIUS_MILES = 3

function App() {
  const [startDate, setStartDate] = useState(formatDate(DEFAULT_START))
  const [endDate, setEndDate] = useState(formatDate(DEFAULT_END))
  const [incidents, setIncidents] = useState<WaterIncident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategories, setActiveCategories] = useState<Set<IncidentCategory>>(
    new Set(ALL_CATEGORIES)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const handleSearchAddress = async (address: string) => {
    if (!apiKey) {
      setSearchError('Add a Google Maps API key below to enable address search.')
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
        const distance = haversineMiles(searchCenter, incident)
        if (distance > SEARCH_RADIUS_MILES) return false
      }
      return true
    })
  }, [incidents, activeCategories, searchCenter])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dallas Water Watch</h1>
        <p>Reported water issues from Dallas 311 — leaks, main breaks, waste, pressure, and quality.</p>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <FilterBar
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
            activeCategories={activeCategories}
            onToggleCategory={handleToggleCategory}
            onSearchAddress={handleSearchAddress}
            searching={searching}
            searchError={searchError}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
          {searchCenter && (
            <div className="search-result">
              Showing incidents within {SEARCH_RADIUS_MILES} miles of <strong>{searchCenter.label}</strong>
              <button onClick={() => setSearchCenter(null)}>Clear</button>
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
