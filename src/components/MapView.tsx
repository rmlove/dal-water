import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import type { WaterIncident } from '../types'
import { CATEGORY_COLORS } from '../categoryColors'
import './MapView.css'

const DALLAS_CENTER = { lat: 32.7767, lng: -96.797 }

interface MapViewProps {
  apiKey: string
  incidents: WaterIncident[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  center: { lat: number; lng: number } | null
}

export default function MapView({ apiKey, incidents, selectedId, onSelect, center }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markers = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const infoWindow = useRef<google.maps.InfoWindow | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Initialize the map once we have an API key.
  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    let cancelled = false

    setOptions({ key: apiKey, v: 'weekly' })

    Promise.all([importLibrary('maps'), importLibrary('marker')])
      .then(() => {
        if (cancelled || !mapRef.current) return
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: DALLAS_CENTER,
          zoom: 11,
          mapId: 'DAL_WATER_MAP',
        })
        infoWindow.current = new google.maps.InfoWindow()
        setReady(true)
      })
      .catch((err: unknown) => {
        console.error(err)
        if (!cancelled) setLoadError('Failed to load Google Maps. Check your API key.')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  // Pan to a searched address.
  useEffect(() => {
    if (!mapInstance.current || !center) return
    mapInstance.current.panTo(center)
    mapInstance.current.setZoom(14)
  }, [center])

  // Render markers whenever incidents change.
  useEffect(() => {
    if (!ready || !mapInstance.current) return

    // Clear old markers.
    markers.current.forEach((marker) => {
      marker.map = null
    })
    markers.current.clear()

    incidents.forEach((incident) => {
      const pin = new google.maps.marker.PinElement({
        background: CATEGORY_COLORS[incident.category],
        borderColor: '#1f2937',
        glyphColor: '#ffffff',
      })

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current,
        position: { lat: incident.lat, lng: incident.lng },
        content: pin.element,
        title: incident.type,
      })

      marker.addListener('click', () => {
        onSelect(incident.id)
        if (infoWindow.current) {
          infoWindow.current.setContent(
            `<div class="map-info"><strong>${incident.type}</strong><br/>${incident.address}<br/>` +
              `Status: ${incident.status}<br/>Reported: ${incident.createdDate.split('T')[0]}</div>`
          )
          infoWindow.current.open({ map: mapInstance.current!, anchor: marker })
        }
      })

      markers.current.set(incident.id, marker)
    })
  }, [incidents, ready, onSelect])

  // Highlight the selected marker by opening its info window.
  useEffect(() => {
    if (!ready || !selectedId) return
    const marker = markers.current.get(selectedId)
    const incident = incidents.find((i) => i.id === selectedId)
    if (!marker || !incident || !mapInstance.current || !infoWindow.current) return
    infoWindow.current.setContent(
      `<div class="map-info"><strong>${incident.type}</strong><br/>${incident.address}<br/>` +
        `Status: ${incident.status}<br/>Reported: ${incident.createdDate.split('T')[0]}</div>`
    )
    infoWindow.current.open({ map: mapInstance.current, anchor: marker })
    mapInstance.current.panTo({ lat: incident.lat, lng: incident.lng })
  }, [selectedId, ready, incidents])

  if (!apiKey) {
    return <MockMap incidents={incidents} selectedId={selectedId} onSelect={onSelect} />
  }

  if (loadError) {
    return <div className="map-error">{loadError}</div>
  }

  return <div ref={mapRef} className="map-container" />
}

// A lightweight, dependency-free placeholder map used until a Google Maps
// API key is supplied. Plots incidents on a simple lat/lng grid over Dallas.
function MockMap({ incidents, selectedId, onSelect }: Omit<MapViewProps, 'apiKey' | 'center'>) {
  const bounds = {
    minLat: 32.6,
    maxLat: 33.0,
    minLng: -97.0,
    maxLng: -96.55,
  }

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100
    return { x: Math.min(Math.max(x, 0), 100), y: Math.min(Math.max(y, 0), 100) }
  }

  return (
    <div className="map-container mock-map">
      <div className="mock-map-banner">
        Map preview mode — add a Google Maps API key for a real interactive map.
      </div>
      <div className="mock-map-grid">
        {incidents.map((incident) => {
          const { x, y } = project(incident.lat, incident.lng)
          return (
            <button
              key={incident.id}
              className={`mock-pin${selectedId === incident.id ? ' selected' : ''}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                background: CATEGORY_COLORS[incident.category],
              }}
              title={`${incident.type} - ${incident.address}`}
              onClick={() => onSelect(incident.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
