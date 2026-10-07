import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
const VALID_RADII: RadiusMiles[] = [1, 3, 5]

interface HashState {
  start?: string
  end?: string
  cats?: string
  lat?: string
  lng?: string
  label?: string
  radius?: string
}

// Read hash once at module level — it never changes on initial load
function readHash(): HashState {
  try {
    const raw = window.location.hash.slice(1)
    if (!raw) return {}
    return Object.fromEntries(new URLSearchParams(raw)) as HashState
  } catch {
    return {}
  }
}

function writeHash(state: HashState) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(state)) {
    if (v !== undefined && v !== '') params.set(k, v)
  }
  const str = params.toString()
  history.replaceState(null, '', str ? `#${str}` : window.location.pathname)
}

const INITIAL_HASH = readHash()

function App() {
  const [startDate, setStartDate] = useState(INITIAL_HASH.start ?? daysAgo(30))
  const [endDate, setEndDate] = useState(INITIAL_HASH.end ?? today())
  const [incidents, setIncidents] = useState<WaterIncident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategories, setActiveCategories] = useState<Set<IncidentCategory>>(() => {
    if (INITIAL_HASH.cats) {
      const saved = new Set(INITIAL_HASH.cats.split(',') as IncidentCategory[])
      const valid = ALL_CATEGORIES.filter((c) => saved.has(c))
      if (valid.length > 0) return new Set(valid)
    }
    return new Set(ALL_CATEGORIES)
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(() => {
    const r = Number(INITIAL_HASH.radius)
    return VALID_RADII.includes(r as RadiusMiles) ? (r as RadiusMiles) : 3
  })

  const [apiKey] = useState(
    () => localStorage.getItem('googleMapsApiKey') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  )
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number; label: string } | null>(
    INITIAL_HASH.lat && INITIAL_HASH.lng
      ? { lat: Number(INITIAL_HASH.lat), lng: Number(INITIAL_HASH.lng), label: decodeURIComponent(INITIAL_HASH.label ?? '') }
      : null
  )
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  // Keep URL hash in sync; skip initial write
  const syncHash = useRef(false)
  useEffect(() => {
    if (!syncHash.current) { syncHash.current = true; return }
    writeHash({
      start: startDate,
      end: endDate,
      cats: [...activeCategories].join(','),
      lat: searchCenter ? String(searchCenter.lat) : undefined,
      lng: searchCenter ? String(searchCenter.lng) : undefined,
      label: searchCenter ? encodeURIComponent(searchCenter.label) : undefined,
      radius: String(radiusMiles),
    })
  }, [startDate, endDate, activeCategories, searchCenter, radiusMiles])

  const handleApiKeyChange = (newKey: string) => {
    localStorage.setItem('googleMapsApiKey', newKey)
    // Maps JS SDK only accepts one key per page load — reload to reinitialize cleanly
    window.location.reload()
  }

  // Debounce date-driven fetches so rapid date input doesn't fire N requests
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current)
    fetchTimer.current = setTimeout(() => {
      let cancelled = false
      setLoading(true)
      setError(null)

      fetchWaterIncidents({ startDate, endDate })
        .then((data) => {
          if (!cancelled) {
            setIncidents(data)
            if (data.length >= 2000) {
              console.warn('Hit 2000 record limit — some incidents may be missing. Try a narrower date range.')
            }
          }
        })
        .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load incidents.') })
        .finally(() => { if (!cancelled) setLoading(false) })

      return () => { cancelled = true }
    }, 400)

    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current) }
  }, [startDate, endDate])

  const handleDateChange = useCallback((newStart: string, newEnd: string) => {
    setStartDate(newStart)
    setEndDate(newEnd)
  }, [])

  const handleToggleCategory = useCallback((category: IncidentCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  const handleSelectAllCategories = useCallback(() => setActiveCategories(new Set(ALL_CATEGORIES)), [])
  const handleClearCategories = useCallback(() => setActiveCategories(new Set()), [])
  const handleClearSearch = useCallback(() => setSearchCenter(null), [])

  const handleSearchAddress = useCallback(async (address: string) => {
    setSearching(true)
    setSearchError(null)
    try {
      const result = await geocodeAddress(address)
      setSearchCenter({ lat: result.lat, lng: result.lng, label: result.formattedAddress })
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }, [])

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setSearchError('Your browser does not support geolocation.')
      return
    }
    setLocating(true)
    setSearchError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My location' })
        setLocating(false)
      },
      () => {
        setSearchError('Could not get your location. Check browser permissions.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }, [])

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (!activeCategories.has(incident.category)) return false
      if (searchCenter && haversineMiles(searchCenter, incident) > radiusMiles) return false
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
          <div className="app-title-group">
            <h1>Dallas Water Watch</h1>
            <p>Live 311 reports — main breaks, sewer problems, flooding &amp; water pollution across Dallas</p>
          </div>
          <div className="app-header-stats">
            <div className="stat">
              <strong>{loading ? '…' : filteredIncidents.length}</strong>
              <span>incidents</span>
            </div>
            <div className="stat-divider" />
            <div className="stat open">
              <strong>{loading ? '…' : openCount}</strong>
              <span>open</span>
            </div>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-filters">
            <FilterBar
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
              activeCategories={activeCategories}
              onToggleCategory={handleToggleCategory}
              onSelectAll={handleSelectAllCategories}
              onClearAll={handleClearCategories}
              onSearchAddress={handleSearchAddress}
              onNearMe={handleNearMe}
              searching={searching}
              locating={locating}
              searchError={searchError}
              apiKey={apiKey}
              onApiKeyChange={handleApiKeyChange}
              radiusMiles={radiusMiles}
              onRadiusChange={setRadiusMiles}
            />
            {searchCenter && (
              <div className="search-result">
                <div className="search-result-text">
                  <span className="search-result-icon">📍</span>
                  <span>
                    <strong>{radiusMiles} mi</strong> from{' '}
                    <strong>{searchCenter.label}</strong>
                  </span>
                </div>
                <button
                  className="clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear location filter"
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>
          <IncidentList
            incidents={filteredIncidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
            error={error}
            openCount={openCount}
          />
        </aside>

        <main className="map-pane">
          <MapView
            key={apiKey}
            apiKey={apiKey}
            incidents={filteredIncidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            center={searchCenter}
          />
        </main>
      </div>

      <footer className="app-footer">
        <span>
          Data: <a href="https://www.dallasopendata.com/City-Services/311-Service-Requests-October-1-2020-to-Present/d7e7-envw" target="_blank" rel="noreferrer">Dallas 311 Open Data</a>
          {' '}· Updated daily · <a href="https://311.cityofdallas.org" target="_blank" rel="noreferrer">Report an issue</a>
        </span>
      </footer>
    </div>
  )
}

export default App
