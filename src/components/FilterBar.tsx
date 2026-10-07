import { useState } from 'react'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addressInput.trim()) onSearchAddress(addressInput.trim())
  }

  const activePreset = DATE_PRESETS.find(
    (p) => daysAgo(p.days) === startDate && endDate === today()
  )

  return (
    <div className="filter-bar">
      {/* Search */}
      <section className="filter-section">
        <div className="section-label">Find near an address</div>
        <form className="address-search" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Address or zip code…"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
          />
          <button type="submit" disabled={searching || locating} aria-label="Search">
            {searching ? '…' : '↵'}
          </button>
        </form>
        <div className="search-row">
          <button
            type="button"
            className="near-me-btn"
            onClick={onNearMe}
            disabled={locating || searching}
          >
            {locating ? 'Locating…' : '📍 Near me'}
          </button>
          <div className="radius-group">
            <span className="radius-label">Radius</span>
            {([1, 3, 5] as RadiusMiles[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`radius-btn${radiusMiles === r ? ' active' : ''}`}
                onClick={() => onRadiusChange(r)}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
        {searchError && <div className="search-error">{searchError}</div>}
      </section>

      {/* Date range */}
      <section className="filter-section">
        <div className="section-label">Date range</div>
        <div className="date-presets">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`preset-btn${activePreset?.days === p.days ? ' active' : ''}`}
              onClick={() => onDateChange(daysAgo(p.days), today())}
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
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
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
        <div className="category-chips">
          {ALL_CATEGORIES.map((category) => {
            const active = activeCategories.has(category)
            return (
              <button
                key={category}
                className={`chip${active ? ' active' : ''}`}
                style={active ? { background: CATEGORY_COLORS[category], borderColor: CATEGORY_COLORS[category] } : undefined}
                onClick={() => onToggleCategory(category)}
                type="button"
              >
                {category}
              </button>
            )
          })}
        </div>
      </section>

      {/* API key (collapsed by default when set) */}
      <details className="api-key-section" open={!apiKey}>
        <summary>Google Maps API key {apiKey ? '✓' : '⚠ not set'}</summary>
        <input
          type="password"
          placeholder="Paste your API key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          autoComplete="off"
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
