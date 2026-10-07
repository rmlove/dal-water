import { useMemo, useState } from 'react'
import type { IncidentCategory } from '../types'
import type { RadiusMiles } from '../App'
import { ALL_CATEGORIES } from '../api/dallas311'
import { CATEGORY_COLORS } from '../categoryColors'
import './FilterBar.css'

const DAY_MS = 24 * 60 * 60 * 1000

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysAgo(n: number): string {
  return formatDate(new Date(Date.now() - n * DAY_MS))
}

function today(): string {
  return formatDate(new Date())
}

const DATE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const RADIUS_OPTIONS: RadiusMiles[] = [1, 3, 5]

interface FilterBarProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  activeCategories: Set<IncidentCategory>
  onToggleCategory: (category: IncidentCategory) => void
  onSelectAll: () => void
  onClearAll: () => void
  onSearchAddress: (address: string) => void
  onNearMe: () => void
  searching: boolean
  locating: boolean
  searchError: string | null
  apiKey: string
  onApiKeyChange: (key: string) => void
  radiusMiles: RadiusMiles
  onRadiusChange: (r: RadiusMiles) => void
}

export default function FilterBar({
  startDate,
  endDate,
  onDateChange,
  activeCategories,
  onToggleCategory,
  onSelectAll,
  onClearAll,
  onSearchAddress,
  onNearMe,
  searching,
  locating,
  searchError,
  apiKey,
  onApiKeyChange,
  radiusMiles,
  onRadiusChange,
}: FilterBarProps) {
  const [addressInput, setAddressInput] = useState('')
  // Local draft for API key — only commit on blur or Enter to avoid reloading on every keystroke
  const [keyDraft, setKeyDraft] = useState(apiKey)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addressInput.trim()) onSearchAddress(addressInput.trim())
  }

  const commitKey = () => {
    const trimmed = keyDraft.trim()
    if (trimmed !== apiKey) onApiKeyChange(trimmed)
  }

  // Memoize so Date.now() isn't called on every render for every preset
  const activePresetDays = useMemo(() => {
    const todayStr = today()
    return DATE_PRESETS.find((p) => daysAgo(p.days) === startDate && endDate === todayStr)?.days
  }, [startDate, endDate])

  return (
    <div className="filter-bar">
      {/* Search */}
      <section className="filter-section">
        <label className="section-label" htmlFor="address-search">Find near an address</label>
        <form className="address-search" onSubmit={handleSubmit}>
          <input
            id="address-search"
            type="text"
            placeholder="Address or zip code…"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            aria-label="Street address or zip code"
          />
          <button
            type="submit"
            disabled={searching || locating}
            aria-label="Search address"
          >
            {searching ? '…' : '↵'}
          </button>
        </form>
        <div className="search-row">
          <button
            type="button"
            className="near-me-btn"
            onClick={onNearMe}
            disabled={locating || searching}
            aria-label="Use my current location"
          >
            {locating ? 'Locating…' : '📍 Near me'}
          </button>
          <div className="radius-group">
            <span className="radius-label" id="radius-label">Radius</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`radius-btn${radiusMiles === r ? ' active' : ''}`}
                onClick={() => onRadiusChange(r)}
                aria-pressed={radiusMiles === r}
                aria-label={`${r} mile radius`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
        {searchError && <div className="search-error" role="alert">{searchError}</div>}
      </section>

      {/* Date range */}
      <section className="filter-section">
        <div className="section-label">Date range</div>
        <div className="date-presets">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`preset-btn${activePresetDays === p.days ? ' active' : ''}`}
              onClick={() => onDateChange(daysAgo(p.days), today())}
              aria-pressed={activePresetDays === p.days}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="date-range">
          <label>
            From
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              aria-label="Start date"
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              aria-label="End date"
            />
          </label>
        </div>
      </section>

      {/* Categories */}
      <section className="filter-section">
        <div className="section-label-row">
          <span className="section-label">Issue types</span>
          <span className="cat-shortcuts">
            <button type="button" onClick={onSelectAll}>All</button>
            <button type="button" onClick={onClearAll}>None</button>
          </span>
        </div>
        <div className="category-chips" role="group" aria-label="Filter by issue type">
          {ALL_CATEGORIES.map((category) => {
            const active = activeCategories.has(category)
            return (
              <button
                key={category}
                className={`chip${active ? ' active' : ''}`}
                style={active ? { background: CATEGORY_COLORS[category], borderColor: CATEGORY_COLORS[category] } : undefined}
                onClick={() => onToggleCategory(category)}
                type="button"
                aria-pressed={active}
              >
                {category}
              </button>
            )
          })}
        </div>
      </section>

      {/* API key — local draft so reloads only happen on commit */}
      <details className="api-key-section" open={!apiKey}>
        <summary>Google Maps API key {apiKey ? '✓' : '⚠ not set'}</summary>
        <input
          type="password"
          placeholder="Paste your API key"
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={commitKey}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitKey() } }}
          autoComplete="off"
          aria-label="Google Maps API key"
        />
        <p className="hint">
          Stored only in your browser. Enables the interactive map and address search.{' '}
          <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noreferrer">
            Get a key →
          </a>
        </p>
      </details>
    </div>
  )
}
