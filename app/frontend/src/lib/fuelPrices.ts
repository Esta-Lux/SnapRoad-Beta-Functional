import { api } from '@/services/api'

export interface GasStation {
  name: string
  price: number
  lat: number
  lng: number
  brand: string
}

type FuelPricesApiPayload = {
  success?: boolean
  data?: {
    stations?: GasStation[]
  }
}

export async function fetchNearbyGasPrices(lat: number, lng: number): Promise<GasStation[]> {
  try {
    const res = await api.get<FuelPricesApiPayload>(
      `/api/fuel/prices?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    )
    if (!res.success) return getMockGasStations(lat, lng)
    const body = res.data as FuelPricesApiPayload | undefined
    const stations = body?.data?.stations
    if (Array.isArray(stations) && stations.length) {
      return stations.filter((s) => Number(s.price) > 0)
    }
  } catch {
    /* backend or network unavailable */
  }
  return getMockGasStations(lat, lng)
}

function getMockGasStations(lat: number, lng: number): GasStation[] {
  return [
    { name: 'Kroger Gas', price: 3.09, lat: lat + 0.01, lng: lng + 0.01, brand: 'Kroger' },
    { name: 'Sunoco', price: 3.19, lat: lat - 0.01, lng: lng + 0.02, brand: 'Sunoco' },
    { name: 'Marathon', price: 3.14, lat: lat + 0.02, lng: lng - 0.01, brand: 'Marathon' },
  ]
}

