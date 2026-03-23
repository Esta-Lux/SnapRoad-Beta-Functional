/** OHGO (ODOT) traffic camera types for Ohio. */
export interface OHGOCamera {
  id: string
  latitude: number
  longitude: number
  mainRoute: string
  location: string
  cameraViews: { id: string; smallUrl: string; largeUrl: string; direction: string }[]
}
