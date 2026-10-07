import { importLibrary } from '@googlemaps/js-api-loader'

export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  await importLibrary('geocoding')
  const geocoder = new google.maps.Geocoder()
  const result = await geocoder.geocode({ address: `${address}, Dallas, TX` })
  if (!result.results?.length) {
    throw new Error('Could not find that address.')
  }
  const loc = result.results[0].geometry.location
  return {
    lat: loc.lat(),
    lng: loc.lng(),
    formattedAddress: result.results[0].formatted_address,
  }
}
