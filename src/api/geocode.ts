import { importLibrary } from '@googlemaps/js-api-loader'

export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
}

async function geocodeViaGoogle(address: string): Promise<GeocodeResult> {
  await importLibrary('geocoding')
  const geocoder = new google.maps.Geocoder()
  const result = await geocoder.geocode({ address: `${address}, Dallas, TX` })
  if (!result.results?.length) throw new Error('No results')
  const loc = result.results[0].geometry.location
  return {
    lat: loc.lat(),
    lng: loc.lng(),
    formattedAddress: result.results[0].formatted_address,
  }
}

async function geocodeViaNominatim(address: string): Promise<GeocodeResult> {
  const query = encodeURIComponent(`${address}, Dallas, TX, USA`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`
  const resp = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'DallasWaterWatch/1.0' } })
  if (!resp.ok) throw new Error('Geocoding request failed.')
  const data = await resp.json()
  if (!data.length) throw new Error('Could not find that address.')
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    formattedAddress: data[0].display_name,
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    return await geocodeViaGoogle(address)
  } catch {
    return await geocodeViaNominatim(address)
  }
}
