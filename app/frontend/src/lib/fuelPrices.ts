export interface GasStation {
  name: string
  price: number
  lat: number
  lng: number
  brand: string
}

export async function fetchNearbyGasPrices(lat: number, lng: number): Promise<GasStation[]> {
  // Note: GasBuddy blocks browser-side requests via CORS and their unofficial endpoints are unstable.
  // Default to mock data unless explicitly enabled via env.
  const provider = (import.meta as any)?.env?.VITE_GAS_PRICES_PROVIDER ?? 'mock'
  if (provider !== 'gasbuddy') return getMockGasStations(lat, lng)

  try {
    const res = await fetch(`https://www.gasbuddy.com/api/stations/near?lat=${lat}&lng=${lng}&radius=5&limit=10`)
    if (!res.ok) return getMockGasStations(lat, lng)
    const data = await res.json()
    return (data.stations ?? [])
      .map((s: any) => ({
        name: s.name,
        price: s.prices?.[0]?.credit_price ?? 0,
        lat: s.lat,
        lng: s.lng,
        brand: s.brand ?? s.name,
      }))
      .filter((s: GasStation) => s.price > 0)
  } catch {
    return getMockGasStations(lat, lng)
  }
}

function getMockGasStations(lat: number, lng: number): GasStation[] {
  return [
    { name: 'Kroger Gas', price: 3.09, lat: lat + 0.01, lng: lng + 0.01, brand: 'Kroger' },
    { name: 'Sunoco', price: 3.19, lat: lat - 0.01, lng: lng + 0.02, brand: 'Sunoco' },
    { name: 'Marathon', price: 3.14, lat: lat + 0.02, lng: lng - 0.01, brand: 'Marathon' },
  ]
}

