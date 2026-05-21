import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL, { isMapAvailable } from '../../utils/mapbox';
import type { Incident } from '../../types';
import { formatDelayLabel, isProviderTrafficIncident } from '../../utils/incidentSource';
import { sortAndCapMarkers, type MarkerCoordinate } from './markerDensity';

const INCIDENT_COLORS: Record<string, string> = {
  police: '#2563EB',
  accident: '#DC2626',
  crash: '#DC2626',
  hazard: '#D97706',
  construction: '#F59E0B',
  weather: '#0EA5E9',
  traffic: '#BE123C',
  pothole: '#92400E',
  closure: '#7C3AED',
  camera: '#6D28D9',
};

const DEFAULT_COLOR = '#D97706';
const ICON_SZ = 11;

function incidentIconName(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type ?? 'hazard').toLowerCase();
  if (t === 'police') return 'shield';
  if (t === 'accident' || t === 'crash') return 'car-sport';
  if (t === 'construction') return 'construct';
  if (t === 'weather') return 'partly-sunny-outline';
  if (t === 'traffic') return 'speedometer';
  if (t === 'pothole') return 'alert-circle';
  if (t === 'closure') return 'close-circle';
  if (t === 'camera') return 'videocam';
  return 'warning';
}

interface Props {
  incidents: Incident[];
  onIncidentTap?: (inc: Incident) => void;
  zoomLevel: number;
  referenceCoordinate?: MarkerCoordinate | null;
}

export default React.memo(function ReportMarkers({
  incidents,
  onIncidentTap,
  zoomLevel,
  referenceCoordinate = null,
}: Props) {
  const list = React.useMemo(() => {
    return sortAndCapMarkers(incidents, referenceCoordinate, zoomLevel, 'report');
  }, [incidents, referenceCoordinate, zoomLevel]);

  if (!isMapAvailable() || !MapboxGL || list.length === 0) return null;
  const MB = MapboxGL;

  return (
    <>
      {list.map((inc) => {
        const isProvider = isProviderTrafficIncident(inc);
        const isTomTom = String(inc.source ?? inc.provider ?? '').toLowerCase() === 'tomtom'
          || String(inc.id).startsWith('tomtom-');
        const fill = INCIDENT_COLORS[inc.type] ?? DEFAULT_COLOR;
        const icon = incidentIconName(inc.type);
        const high = inc.severity === 'high';
        const outer = high ? 34 : isProvider ? 32 : 28;
        const inner = high ? 26 : isProvider ? 24 : 22;
        const delay = formatDelayLabel(inc.delay_seconds);

        return (
          <MB.MarkerView
            key={String(inc.id)}
            id={`sr-report-mv-${inc.id}`}
            coordinate={[inc.lng, inc.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
            allowOverlapWithPuck
          >
            <Pressable
              onPress={() => onIncidentTap?.(inc)}
              style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
              hitSlop={6}
            >
              <View
                style={[
                  styles.puckOuter,
                  {
                    width: outer,
                    height: outer,
                    borderRadius: high ? 12 : 10,
                    borderColor: isTomTom ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)',
                    borderWidth: isTomTom ? 2 : 1,
                    backgroundColor: `${fill}${high ? '55' : '38'}`,
                  },
                ]}
              >
                <View style={[styles.puckInner, { width: inner, height: inner, borderRadius: high ? 9 : 8, backgroundColor: fill }]}>
                  <Ionicons name={icon} size={high ? ICON_SZ + 1 : ICON_SZ} color="#FFFFFF" />
                </View>
                {isTomTom ? (
                  <View style={[styles.providerBadge, { backgroundColor: fill }]}>
                    <Text style={styles.providerBadgeText}>TT</Text>
                  </View>
                ) : null}
              </View>
              {delay ? (
                <View style={[styles.delayChip, { borderColor: fill }]}>
                  <Text style={[styles.delayChipText, { color: fill }]}>{delay}</Text>
                </View>
              ) : null}
            </Pressable>
          </MB.MarkerView>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  hitPressed: { opacity: 0.88, transform: [{ scale: 0.95 }] },
  puckOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  puckInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  providerBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  delayChip: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
  },
  delayChipText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
