import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import type { WaterIncident } from '../types'
import { CATEGORY_COLORS } from '../categoryColors'
import { ALL_CATEGORIES } from '../api/dallas311'
import './MapView.css'

const DALLAS_CENTER = { lat: 32.7767, lng: -96.797 }

interface MapViewProps {
  apiKey: string
  incidents: WaterIncident[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  center: { lat: number; lng: number } | null
}

function buildInfoContent(incident: WaterIncident): string {
  const date = incident.createdDate ? incident.createdDate.split('T')[0] : '—'
  const closed = incident.closedDate ? incident.closedDate.split('T')[0] : null
  const district = incident.councilDistrict ? `District ${incident.councilDistrict}` : null
  const outcome = incident.outcome && incident.outcome !== incident.status ? incident.outcome : null

  const color = CATEGORY_COLORS[incident.category]
  const metaItems = [district, outcome].filter(Boolean).join(' · ')

  return `
    <div class="map-info">
      <div class="map-info-type" style="border-left: 3px solid ${color}">${incident.type}</div>
      <div class="map-info-address">${incident.address}</div>
      <div class="map-info-row">
        <span class="map-info-status map-info-status-${incident.status.toLowerCase().includes('closed') ? 'closed' : 'open'}">
          ${incident.status}
        </span>
        <span class="map-info-date">Reported ${date}${closed ? ` · Closed ${closed}` : ''}</span>
      </div>
      ${metaItems ? `<div class="map-info-meta">${metaItems}</div>` : ''}
    </div>
  `
}

type AnyMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker

export default function MapView({ apiKey, incidents, selectedId, onSelect, center }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markers = useRef<Map<string, AnyMarker>>(new Map())
  const infoWindow = useRef<google.maps.InfoWindow | null>(null)
  const useAdvanced = useRef<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    let cancelled = false

    setOptions({ key: apiKey, v: 'weekly' })

    importLibrary('maps')
      .then(async () => {
        if (cancelled || !mapRef.current) return

        try {
          await importLibrary('marker')
          mapInstance.current = new google.maps.Map(mapRef.current, {
            center: DALLAS_CENTER,
            zoom: 11,
            mapId: 'DEMO_MAP_ID',
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          })
          useAdvanced.current = true
        } catch {
          mapInstance.current = new google.maps.Map(mapRef.current!, {
            center: DALLAS_CENTER,
            zoom: 11,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          })
          useAdvanced.current = false
        }

        // Detect blank map: if tiles don't load in 8s, fall back to MockMap
        const tileTimer = setTimeout(() => {
          if (!cancelled) setLoadError('TILES_FAILED')
        }, 8000)
        mapInstance.current.addListener('tilesloaded', () => {
          clearTimeout(tileTimer)
          // tiles loaded successfully — map is rendering
        })

        infoWindow.current = new google.maps.InfoWindow()
        if (!cancelled) setReady(true)
      })
      .catch((err: unknown) => {
        console.error('Maps load error:', err)
        if (!cancelled) setLoadError('Failed to load Google Maps. Check your API key and ensure Maps JavaScript API is enabled.')
      })

    return () => { cancelled = true }
  }, [apiKey])

  useEffect(() => {
    if (!mapInstance.current || !center) return
    mapInstance.current.panTo(center)
    mapInstance.current.setZoom(14)
  }, [center])

  useEffect(() => {
    if (!ready || !mapInstance.current) return

    markers.current.forEach((marker) => {
      if ('map' in marker) marker.map = null
      else (marker as google.maps.Marker).setMap(null)
    })
    markers.current.clear()

    incidents.forEach((incident) => {
      let marker: AnyMarker

      if (useAdvanced.current) {
        const pin = new google.maps.marker.PinElement({
          background: CATEGORY_COLORS[incident.category],
          borderColor: 'rgba(0,0,0,0.3)',
          glyphColor: '#ffffff',
          scale: 0.9,
        })
        marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: { lat: incident.lat, lng: incident.lng },
          content: pin.element,
          title: incident.type,
        })
        marker.addListener('click', () => {
          onSelect(incident.id)
          if (infoWindow.current) {
            infoWindow.current.setContent(buildInfoContent(incident))
            infoWindow.current.open({ map: mapInstance.current!, anchor: marker as google.maps.marker.AdvancedMarkerElement })
          }
        })
      } else {
        const m = new google.maps.Marker({
          map: mapInstance.current,
          position: { lat: incident.lat, lng: incident.lng },
          title: incident.type,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: CATEGORY_COLORS[incident.category],
            fillOpacity: 1,
            strokeColor: 'rgba(0,0,0,0.3)',
            strokeWeight: 1.5,
          },
        })
        m.addListener('click', () => {
          onSelect(incident.id)
          if (infoWindow.current) {
            infoWindow.current.setContent(buildInfoContent(incident))
            infoWindow.current.open({ map: mapInstance.current!, anchor: m })
          }
        })
        marker = m
      }

      markers.current.set(incident.id, marker)
    })
  }, [incidents, ready, onSelect])

  useEffect(() => {
    if (!ready || !selectedId) return
    const marker = markers.current.get(selectedId)
    const incident = incidents.find((i) => i.id === selectedId)
    if (!marker || !incident || !mapInstance.current || !infoWindow.current) return
    infoWindow.current.setContent(buildInfoContent(incident))
    if (useAdvanced.current) {
      infoWindow.current.open({ map: mapInstance.current, anchor: marker as google.maps.marker.AdvancedMarkerElement })
    } else {
      infoWindow.current.open({ map: mapInstance.current, anchor: marker as google.maps.Marker })
    }
    mapInstance.current.panTo({ lat: incident.lat, lng: incident.lng })
  }, [selectedId, ready, incidents])

  if (!apiKey) {
    return <MockMap incidents={incidents} selectedId={selectedId} onSelect={onSelect} />
  }

  // Tiles failed to load (billing/API not enabled) — show mock map with a banner
  if (loadError === 'TILES_FAILED') {
    return <MockMap incidents={incidents} selectedId={selectedId} onSelect={onSelect} tilesFailed />
  }

  if (loadError) {
    return <div className="map-error">{loadError}</div>
  }

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />
      <MapLegend />
    </div>
  )
}

function MapLegend() {
  return (
    <div className="map-legend">
      {ALL_CATEGORIES.map((cat) => (
        <div key={cat} className="legend-item">
          <span className="legend-dot" style={{ background: CATEGORY_COLORS[cat] }} />
          <span>{cat}</span>
        </div>
      ))}
    </div>
  )
}

function MockMap({ incidents, selectedId, onSelect, tilesFailed }: Omit<MapViewProps, 'apiKey' | 'center'> & { tilesFailed?: boolean }) {
  const bounds = { minLat: 32.6, maxLat: 33.0, minLng: -97.0, maxLng: -96.55 }

  const project = (lat: number, lng: number) => ({
    x: Math.min(Math.max(((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100, 0), 100),
    y: Math.min(Math.max((1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100, 0), 100),
  })

  const banner = tilesFailed
    ? 'Map tiles blocked — enable Maps JavaScript API + billing in Google Cloud Console to see the live map.'
    : 'Preview mode — add a Google Maps API key in the sidebar for an interactive map.'

  return (
    <div className="map-wrapper map-container mock-map">
      <div className="mock-map-banner">{banner}</div>
      <div className="mock-map-grid">
        {incidents.map((incident) => {
          const { x, y } = project(incident.lat, incident.lng)
          return (
            <button
              key={incident.id}
              className={`mock-pin${selectedId === incident.id ? ' selected' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, background: CATEGORY_COLORS[incident.category] }}
              title={`${incident.type} — ${incident.address}`}
              onClick={() => onSelect(incident.id)}
            />
          )
        })}
      </div>
      <MapLegend />
    </div>
  )
}
