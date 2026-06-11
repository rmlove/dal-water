import { useState } from 'react'
import type { IncidentCategory } from '../types'
import { ALL_CATEGORIES } from '../api/dallas311'
import { CATEGORY_COLORS } from '../categoryColors'
import './FilterBar.css'

interface FilterBarProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  activeCategories: Set<IncidentCategory>
  onToggleCategory: (category: IncidentCategory) => void
  onSearchAddress: (address: string) => void
  searching: boolean
  searchError: string | null
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export default function FilterBar({
  startDate,
  endDate,
  onDateChange,
  activeCategories,
  onToggleCategory,
  onSearchAddress,
  searching,
  searchError,
  apiKey,
  onApiKeyChange,
}: FilterBarProps) {
  const [addressInput, setAddressInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (addressInput.trim()) onSearchAddress(addressInput.trim())
  }

  return (
    <div className="filter-bar">
      <form className="address-search" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter an address or zip code in Dallas..."
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
        />
        <button type="submit" disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>
      {searchError && <div className="search-error">{searchError}</div>}

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

      <div className="category-chips">
        {ALL_CATEGORIES.map((category) => (
          <button
            key={category}
            className={`chip${activeCategories.has(category) ? ' active' : ''}`}
            style={
              activeCategories.has(category)
                ? { background: CATEGORY_COLORS[category], borderColor: CATEGORY_COLORS[category] }
                : undefined
            }
            onClick={() => onToggleCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>

      <details className="api-key-section">
        <summary>Google Maps API key {apiKey ? '(set)' : '(not set)'}</summary>
        <input
          type="text"
          placeholder="Paste your Google Maps API key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
        />
        <p className="hint">
          Stored only in this browser session. Get a key at{' '}
          <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noreferrer">
            developers.google.com/maps
          </a>
          . The same key works for the Geocoding API used by address search.
        </p>
      </details>
    </div>
  )
}
