import { Linking, Platform } from 'react-native';

/** Open Apple/Google Maps to a place; prefers coordinates when valid. */
export function openMapsSearch(query: string, lat?: number | null, lng?: number | null): void {
  const q = encodeURIComponent(query.trim() || 'place');
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180
  ) {
    const la = Number(lat);
    const lo = Number(lng);
    const url = Platform.select({
      ios: `maps:0,0?q=${la},${lo}`,
      android: `geo:${la},${lo}?q=${la},${lo}`,
      default: `https://www.google.com/maps/search/?api=1&query=${la},${lo}`,
    });
    if (url) void Linking.openURL(url);
    return;
  }
  void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
}
