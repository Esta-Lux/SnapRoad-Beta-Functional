import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

/** Hide local station price badges when zoomed out (see `markerDensity` gasPrice caps). */
export const GAS_PRICE_LAYER_MIN_ZOOM = 12;

export type GasPriceMapPoint = {
  id: string;
  state?: string;
  name?: string;
  address?: string;
  lat: number;
  lng: number;
  currency?: string;
  regular?: string | null;
  midGrade?: string | null;
  premium?: string | null;
  diesel?: string | null;
  distance_miles?: number | null;
  source?: string | null;
  is_estimated?: boolean;
};

type Props = {
  points: GasPriceMapPoint[];
  zoomLevel: number;
  referenceCoordinate: MarkerCoordinate | null;
};

function shortPrice(raw: string | null | undefined): string {
  if (!raw) return '--';
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
  const t = String(raw).trim();
  return t.length > 6 ? `${t.slice(0, 5)}...` : t;
}

/**
 * Local regular gas price badge, same footprint as {@link CameraMarkers}.
 */
export default React.memo(function GasPriceMarkers({ points, zoomLevel, referenceCoordinate }: Props) {
  const onTap = useCallback((p: GasPriceMapPoint) => {
    const title = p.name || p.state || 'Nearby station';
    const distance =
      typeof p.distance_miles === 'number' && Number.isFinite(p.distance_miles)
        ? `\nDistance: ${p.distance_miles.toFixed(1)} mi`
        : '';
    const address = p.address ? `\n${p.address}` : '';
    const priceNote = p.is_estimated ? '\nEstimated local price - verify at pump.' : '\nVerify at pump before purchase.';
    const lines = [
      `Regular: ${p.regular ?? '--'}`,
      `Mid-grade: ${p.midGrade ?? '--'}`,
      `Premium: ${p.premium ?? '--'}`,
      `Diesel: ${p.diesel ?? '--'}`,
    ].join('\n') + distance + address + priceNote;
    Alert.alert(title, lines, [{ text: 'OK' }]);
  }, []);

  const list = sortAndCapMarkers(points, referenceCoordinate, zoomLevel, 'gasPrice');
  if (!isMapAvailable() || !MapboxGL || zoomLevel < GAS_PRICE_LAYER_MIN_ZOOM || list.length === 0) {
    return null;
  }
  const MB = MapboxGL;

  const textShrink =
    Platform.OS === 'ios' ? ({ adjustsFontSizeToFit: true as const, minimumFontScale: 0.72 as const }) : {};

  return (
    <>
      {list.map((p) => (
        <MB.MarkerView
          key={p.id}
          id={`sr-gas-mv-${p.id}`}
          coordinate={[p.lng, p.lat]}
          anchor={{ x: 0.5, y: 0.5 }}
          allowOverlap
          allowOverlapWithPuck
        >
          <Pressable
            onPress={() => onTap(p)}
            style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${p.name || p.state || 'Nearby station'} gas ${shortPrice(p.regular)} per gallon regular, verify at pump`}
          >
            <View style={styles.puckOuter}>
              <View style={styles.puckInner}>
                <Text style={styles.priceText} numberOfLines={1} {...textShrink}>
                  {shortPrice(p.regular)}
                </Text>
              </View>
            </View>
          </Pressable>
        </MB.MarkerView>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  puckOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(15,23,42,0.14)',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  puckInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    color: '#0f172a',
    fontVariant: Platform.OS === 'ios' ? ['tabular-nums'] : undefined,
  },
});
