export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
}

export async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    address: `${address}, Dallas, TX`,
    key: apiKey,
  })

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Geocoding request failed.')
  }

  const data = await response.json()
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Could not find that address (${data.status}).`)
  }

  const result = data.results[0]
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  }
}
