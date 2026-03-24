import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Platform, Keyboard, SafeAreaView, Alert, Switch,
} from 'react-native';
import MapboxGL, { isMapAvailable } from '../utils/mapbox';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useLocation } from '../hooks/useLocation';
import { useNavigation as useNav } from '../hooks/useNavigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { DRIVING_MODES } from '../constants/modes';
import { forwardGeocode, type GeocodeResult } from '../lib/directions';
import RouteOverlay from '../components/map/RouteOverlay';
import { formatDistance, haversineMeters } from '../utils/distance';
import { formatDuration } from '../utils/format';
import { speak } from '../utils/voice';
import { api } from '../api/client';
import type { DrivingMode, Incident } from '../types';

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  (Constants.expoConfig?.extra?.mapboxPublicToken as string) ||
  '';
if (MapboxGL && MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);

const REPORT_TYPES = [
  { type: 'police', label: 'Police', icon: 'shield-outline' as const },
  { type: 'accident', label: 'Accident', icon: 'warning-outline' as const },
  { type: 'hazard', label: 'Hazard', icon: 'warning-outline' as const },
  { type: 'construction', label: 'Construction', icon: 'construct-outline' as const },
  { type: 'closure', label: 'Closure', icon: 'close-circle-outline' as const },
] as const;

function getTurnIcon(maneuver?: string) {
  if (!maneuver) return <Ionicons name="arrow-up" size={28} color="#fff" />;
  if (maneuver.includes('left')) return <Ionicons name="arrow-back" size={28} color="#fff" />;
  if (maneuver.includes('right')) return <Ionicons name="arrow-forward" size={28} color="#fff" />;
  if (maneuver === 'roundabout') return <Ionicons name="sync-outline" size={28} color="#fff" />;
  return <Ionicons name="arrow-up" size={28} color="#fff" />;
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.round(diff / 60)}h ago`;
}

export default function MapScreen() {
  const { location, heading, speed, isLocating, permissionDenied } = useLocation();
  const { isLight, colors } = useTheme();
  const { user } = useAuth();
  const cameraRef = useRef<any>(null);
  const [drivingMode, setDrivingMode] = useState<DrivingMode>('adaptive');
  const modeConfig = DRIVING_MODES[drivingMode];

  const nav = useNav({ userLocation: location, speed, heading, drivingMode });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Camera follow
  const [cameraLocked, setCameraLocked] = useState(true);
  const userInteracting = useRef(false);

  // Report state
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [activeReportCard, setActiveReportCard] = useState<Incident | null>(null);
  const [confirmIncident, setConfirmIncident] = useState<Incident | null>(null);
  const reportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const announcedIncidentsRef = useRef<Set<number>>(new Set());
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map style
  const MAP_STYLES = [
    { key: 'street', label: 'Street', url: 'mapbox://styles/mapbox/streets-v12' },
    { key: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { key: 'dark', label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { key: 'nav', label: 'Navigation', url: 'mapbox://styles/mapbox/navigation-night-v1' },
  ] as const;
  const [mapStyleIndex, setMapStyleIndex] = useState(0);
  const [showMapStylePicker, setShowMapStylePicker] = useState(false);

  // Truck clearance
  const [avoidLowClearances, setAvoidLowClearances] = useState(false);
  const vehicleHeight = user?.vehicle_height_meters;
  const hasTallVehicle = typeof vehicleHeight === 'number' && vehicleHeight > 0;

  // Feed GPS to navigation hook
  useEffect(() => {
    nav.updatePosition(location.lat, location.lng);
  }, [location.lat, location.lng]);

  // --- Search logic ---
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      const results = await forwardGeocode(text, location);
      setSearchResults(results);
    }, 300);
  }, [location]);

  const handleSelectResult = useCallback(async (result: GeocodeResult) => {
    Keyboard.dismiss();
    setSearchQuery(result.name);
    setSearchResults([]);
    setIsSearchFocused(false);
    nav.setSelectedDestination(result);
    await nav.fetchDirections(result);
  }, [nav]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    nav.setSelectedDestination(null);
    nav.setShowRoutePreview(false);
  }, [nav]);

  // Camera behavior
  const animationDuration = speed > 33 ? 300 : speed > 11 ? 500 : 800;

  const handleMapTouchStart = useCallback(() => {
    if (nav.isNavigating) { userInteracting.current = true; setCameraLocked(false); }
  }, [nav.isNavigating]);

  const handleRecenter = useCallback(() => {
    setCameraLocked(true);
    userInteracting.current = false;
    cameraRef.current?.setCamera({
      centerCoordinate: [location.lng, location.lat], zoomLevel: 17,
      pitch: 60, heading, animationDuration: 500,
    });
  }, [location, heading]);

  // --- Report submission ---
  const handleSubmitReport = useCallback(async (type: string) => {
    setShowReportPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await api.post('/api/incidents/report', { type, lat: location.lat, lng: location.lng });
    Alert.alert('Report Submitted', 'Thanks for keeping roads safe!');
  }, [location]);

  // --- Incident polling (every 30s during navigation, 60s ambient) ---
  useEffect(() => {
    const poll = async () => {
      const res = await api.get<{ data?: Incident[] }>(
        `/api/incidents/nearby?lat=${location.lat}&lng=${location.lng}&radius_miles=2`,
      );
      const data = (res.data as { data?: Incident[] })?.data;
      if (Array.isArray(data)) setNearbyIncidents(data);
    };
    poll();
    const interval = nav.isNavigating ? 30000 : 60000;
    reportPollRef.current = setInterval(poll, interval);
    return () => { if (reportPollRef.current) clearInterval(reportPollRef.current); };
  }, [nav.isNavigating, location.lat, location.lng]);

  // --- Report cards during navigation ---
  useEffect(() => {
    if (!nav.isNavigating || !nearbyIncidents.length) { setActiveReportCard(null); return; }
    const ahead = nearbyIncidents.filter((inc) => {
      if (announcedIncidentsRef.current.has(inc.id)) return false;
      const dist = haversineMeters(location.lat, location.lng, inc.lat, inc.lng) / 1609.34;
      return dist > 0.1 && dist < 1.0;
    });
    if (ahead.length > 0) {
      const nearest = ahead[0];
      setActiveReportCard(nearest);
      announcedIncidentsRef.current.add(nearest.id);
      if (nearest.type === 'accident' || nearest.type === 'police') {
        const dist = (haversineMeters(location.lat, location.lng, nearest.lat, nearest.lng) / 1609.34).toFixed(1);
        speak(`${nearest.title} reported ${dist} miles ahead.`, 'high', drivingMode);
      }
      setTimeout(() => setActiveReportCard(null), 10000);
    }
  }, [nav.isNavigating, nearbyIncidents, location.lat, location.lng, drivingMode]);

  // --- Confirmation prompt when passing a report ---
  useEffect(() => {
    if (!nav.isNavigating) return;
    for (const inc of nearbyIncidents) {
      const dist = haversineMeters(location.lat, location.lng, inc.lat, inc.lng);
      if (dist < 200 && !announcedIncidentsRef.current.has(-inc.id)) {
        announcedIncidentsRef.current.add(-inc.id);
        setConfirmIncident(inc);
        confirmTimeoutRef.current = setTimeout(() => setConfirmIncident(null), 10000);
        break;
      }
    }
  }, [nav.isNavigating, location.lat, location.lng, nearbyIncidents]);

  const handleConfirmIncident = useCallback(async (confirmed: boolean) => {
    if (!confirmIncident) return;
    setConfirmIncident(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    await api.post('/api/incidents/confirm', { incident_id: confirmIncident.id, confirmed });
  }, [confirmIncident]);

  // --- Ambient mode (not navigating, moving) ---
  const isAmbient = !nav.isNavigating && speed > 6.7; // > 3 m/s in mph
  useEffect(() => {
    if (!isAmbient || !nearbyIncidents.length) return;
    const highPriority = nearbyIncidents.filter(
      (inc) => (inc.type === 'accident' || inc.type === 'police') && !announcedIncidentsRef.current.has(inc.id),
    );
    if (highPriority.length > 0) {
      const nearest = highPriority[0];
      announcedIncidentsRef.current.add(nearest.id);
      setActiveReportCard(nearest);
      speak(`Caution: ${nearest.title} reported ahead.`, 'normal', drivingMode);
      setTimeout(() => setActiveReportCard(null), 8000);
    }
  }, [isAmbient, nearbyIncidents, drivingMode]);

  if (permissionDenied) {
    return (
      <View style={[styles.center, { backgroundColor: isLight ? '#f5f5f7' : '#0a0a0f' }]}>
        <Text style={{ color: isLight ? '#333' : '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 }}>
          Location permission is required.{'\n'}Enable it in your device settings.
        </Text>
      </View>
    );
  }

  const currentStep = nav.navigationData?.steps?.[nav.currentStepIndex];
  const nextStep = nav.navigationData?.steps?.[nav.currentStepIndex + 1];

  const mapAvailable = isMapAvailable() && MapboxGL !== null;

  return (
    <View style={styles.container}>
      {mapAvailable && MapboxGL ? (
        <MapboxGL.MapView
          style={styles.map} styleURL={MAP_STYLES[mapStyleIndex].url}
          logoEnabled={false} attributionEnabled={false} compassEnabled
          onTouchStart={handleMapTouchStart}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={[location.lng, location.lat]}
            zoomLevel={nav.isNavigating ? 17 : 15}
            pitch={nav.isNavigating ? 60 : 0}
            heading={nav.isNavigating && cameraLocked ? heading : 0}
            animationMode="flyTo"
            animationDuration={nav.isNavigating ? animationDuration : 800}
            followUserLocation={nav.isNavigating && cameraLocked}
            followHeading={nav.isNavigating && cameraLocked ? heading : undefined}
            followPitch={nav.isNavigating ? 60 : undefined}
            followZoomLevel={nav.isNavigating ? 17 : undefined}
            padding={nav.isNavigating ? { paddingBottom: 260, paddingTop: 0, paddingLeft: 0, paddingRight: 0 } : undefined}
          />
          <MapboxGL.UserLocation visible animated showsUserHeadingIndicator />
          {nav.navigationData?.polyline && (
            <RouteOverlay polyline={nav.navigationData.polyline} userLocation={location}
              isNavigating={nav.isNavigating} routeColor={modeConfig.routeColor}
              casingColor={modeConfig.routeCasing} passedColor={modeConfig.passedColor} />
          )}
          {nav.selectedDestination && (
            <MapboxGL.PointAnnotation id="destination-pin" coordinate={[nav.selectedDestination.lng, nav.selectedDestination.lat]}>
              <View style={styles.destPin}><Ionicons name="navigate-outline" size={16} color="#fff" /></View>
            </MapboxGL.PointAnnotation>
          )}
        </MapboxGL.MapView>
      ) : (
        <View style={[styles.map, styles.mapPlaceholder]}>
          <Ionicons name="map-outline" size={48} color="#3B82F6" />
          <Text style={styles.mapPlaceholderTitle}>Map requires Dev Build</Text>
          <Text style={styles.mapPlaceholderSub}>
            Mapbox needs native code. Run {'"'}npx expo run:ios{'"'} for the full map.{'\n'}
            Search, navigation, and other features work below.
          </Text>
          <Text style={styles.mapPlaceholderCoords}>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)} | {Math.round(speed)} mph | {Math.round(heading)}°
          </Text>
        </View>
      )}

      {/* Search bar */}
      {!nav.isNavigating && (
        <SafeAreaView style={[styles.searchContainer, { top: Platform.OS === 'ios' ? 8 : 12 }]}>
          <View style={[styles.searchBar, { backgroundColor: isLight ? '#fff' : '#1e1e2e' }]}>
            <TextInput style={[styles.searchInput, { color: isLight ? '#333' : '#fff' }]}
              placeholder="Where to?" placeholderTextColor={isLight ? '#999' : '#666'}
              value={searchQuery} onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)} returnKeyType="search" />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
                <Ionicons name="close" size={18} color={isLight ? '#999' : '#666'} />
              </TouchableOpacity>
            )}
          </View>
          {isSearchFocused && searchResults.length > 0 && (
            <View style={[styles.searchResults, { backgroundColor: isLight ? '#fff' : '#1e1e2e' }]}>
              <FlatList data={searchResults} keyExtractor={(item, i) => `${item.name}-${i}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectResult(item)}>
                    <Text style={[styles.resultName, { color: isLight ? '#111' : '#fff' }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.resultAddress, { color: isLight ? '#666' : '#888' }]} numberOfLines={1}>{item.address}</Text>
                  </TouchableOpacity>
                )} />
            </View>
          )}
        </SafeAreaView>
      )}

      {/* Turn card -- gradient blue matching web */}
      {nav.isNavigating && currentStep && (
        <SafeAreaView style={styles.turnCardContainer}>
          <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.turnCard}>
            <View style={styles.turnIconBox}>{getTurnIcon(currentStep.maneuver)}</View>
            <View style={styles.turnTextBox}>
              <Text style={styles.turnInstruction} numberOfLines={2}>{currentStep.instruction}</Text>
              {nextStep && <Text style={styles.thenText} numberOfLines={1}>Then: {nextStep.instruction}</Text>}
            </View>
            <Text style={styles.turnDistance}>{currentStep.distance}</Text>
          </LinearGradient>
        </SafeAreaView>
      )}

      {/* Report card (during nav or ambient) */}
      {activeReportCard && (
        <View style={styles.reportCard}>
          <Ionicons name="warning-outline" size={18} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.reportCardTitle}>
              {activeReportCard.title} {((haversineMeters(location.lat, location.lng, activeReportCard.lat, activeReportCard.lng) / 1609.34)).toFixed(1)} mi ahead
            </Text>
            <Text style={styles.reportCardSub}>
              Reported {timeAgo(activeReportCard.created_at)} · {activeReportCard.upvotes} confirmed
            </Text>
          </View>
        </View>
      )}

      {/* Confirm incident prompt */}
      {confirmIncident && (
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Is the {confirmIncident.type} still there?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#22C55E' }]} onPress={() => handleConfirmIncident(true)}>
              <Text style={styles.confirmBtnText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleConfirmIncident(false)}>
              <Text style={styles.confirmBtnText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ambient mode indicator */}
      {isAmbient && (
        <View style={styles.ambientBadge}>
          <Ionicons name="eye-outline" size={14} color="#3B82F6" />
          <Text style={styles.ambientText}>Watching the road ahead</Text>
        </View>
      )}

      {/* ETA bar */}
      {nav.isNavigating && nav.liveEta && (
        <View style={styles.etaBar}>
          <View style={styles.etaInfo}>
            <Text style={styles.etaTime}>{formatDuration(nav.liveEta.etaMinutes)}</Text>
            <Text style={styles.etaDistance}>{formatDistance(nav.liveEta.distanceMiles)}</Text>
          </View>
          <TouchableOpacity style={styles.endTripBtn} onPress={nav.stopNavigation}>
            <Text style={styles.endTripText}>End Trip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Route preview sheet */}
      {nav.showRoutePreview && nav.navigationData && !nav.isNavigating && (
        <View style={styles.routePreview}>
          <View style={styles.previewHandle} />
          <Text style={styles.previewTitle} numberOfLines={1}>{nav.navigationData.destination.name ?? 'Destination'}</Text>
          <View style={styles.routeOptionRow}>
            {nav.availableRoutes.slice(0, 2).map((route, i) => {
              const label = route.routeType === 'eco' ? 'Eco' : 'Best route';
              const selected = nav.selectedRouteIndex === i;
              return (
                <TouchableOpacity key={i}
                  style={[styles.routeOptionBtn, { backgroundColor: selected ? '#007AFF' : isLight ? '#f5f5f7' : '#2a2a3e' }]}
                  onPress={() => nav.handleRouteSelect(route.routeType ?? 'best')}>
                  <Text style={[styles.routeOptionLabel, { color: selected ? '#fff' : isLight ? '#333' : '#aaa' }]}>{label}</Text>
                  <Text style={[styles.routeOptionSub, { color: selected ? 'rgba(255,255,255,0.8)' : isLight ? '#888' : '#666' }]}>
                    {route.durationText} / {route.distanceText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Truck clearance toggle */}
          {hasTallVehicle && (
            <View style={styles.truckRow}>
              <Ionicons name="car-outline" size={16} color="#1d4ed8" />
              <Text style={styles.truckLabel}>Avoid low clearances ({vehicleHeight?.toFixed(1)}m)</Text>
              <Switch value={avoidLowClearances} onValueChange={setAvoidLowClearances}
                trackColor={{ false: '#ccc', true: '#3B82F6' }} thumbColor="#fff" />
            </View>
          )}
          <TouchableOpacity onPress={nav.startNavigation} activeOpacity={0.85}>
            <LinearGradient colors={[colors.ctaGradientStart, colors.ctaGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.startNavBtn}>
              <Ionicons name="navigate-outline" size={18} color="#fff" />
              <Text style={styles.startNavText}>Start Navigation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Trip summary */}
      {nav.tripSummary && (
        <View style={styles.tripSummaryOverlay}>
          <View style={styles.tripSummaryCard}>
            <Text style={styles.tripSummaryTitle}>Trip Summary</Text>
            <Text style={styles.tripSummaryRoute}>{nav.tripSummary.origin} {'->'} {nav.tripSummary.destination}</Text>
            <View style={styles.tripStatsGrid}>
              <View style={styles.tripStat}><Text style={styles.tripStatLabel}>Distance</Text><Text style={styles.tripStatValue}>{nav.tripSummary.distance.toFixed(1)} mi</Text></View>
              <View style={styles.tripStat}><Text style={styles.tripStatLabel}>Time</Text><Text style={styles.tripStatValue}>{formatDuration(nav.tripSummary.duration)}</Text></View>
              <View style={styles.tripStat}><Text style={styles.tripStatLabel}>Safety</Text><Text style={[styles.tripStatValue, { color: '#22C55E' }]}>{nav.tripSummary.safety_score}</Text></View>
              <View style={styles.tripStat}><Text style={styles.tripStatLabel}>Gems</Text><Text style={[styles.tripStatValue, { color: '#F59E0B' }]}>+{nav.tripSummary.gems_earned}</Text></View>
            </View>
            <TouchableOpacity style={styles.tripDoneBtn} onPress={nav.dismissTripSummary}>
              <Text style={styles.tripDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Report button */}
      {!nav.showRoutePreview && !nav.tripSummary && (
        <TouchableOpacity style={[styles.reportBtn, { bottom: nav.isNavigating ? 140 : 80, right: 16 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowReportPicker(true); }}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Report type picker */}
      {showReportPicker && (
        <View style={styles.reportPickerOverlay}>
          <TouchableOpacity style={styles.reportPickerBg} onPress={() => setShowReportPicker(false)} activeOpacity={1} />
          <View style={styles.reportPickerSheet}>
            <Text style={styles.reportPickerTitle}>Report on road</Text>
            <View style={styles.reportPickerGrid}>
              {REPORT_TYPES.map((rt) => (
                <TouchableOpacity key={rt.type} style={styles.reportPickerItem}
                  onPress={() => handleSubmitReport(rt.type)}>
                  <View style={styles.reportPickerIcon}><Ionicons name={rt.icon} size={22} color="#fff" /></View>
                  <Text style={styles.reportPickerLabel}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Recenter */}
      {nav.isNavigating && !cameraLocked && (
        <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
          <Ionicons name="locate-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      )}

      {/* Mode selector */}
      {!nav.isNavigating && !nav.showRoutePreview && (
        <View style={styles.modeContainer}>
          {(Object.entries(DRIVING_MODES) as [DrivingMode, typeof modeConfig][]).map(([mode, config]) => (
            <TouchableOpacity key={mode}
              style={[styles.modePill, { backgroundColor: drivingMode === mode ? config.color : isLight ? 'rgba(255,255,255,0.9)' : 'rgba(30,30,46,0.9)' }]}
              onPress={() => setDrivingMode(mode)} activeOpacity={0.7}>
              <Text style={[styles.modeText, { color: drivingMode === mode ? '#fff' : isLight ? '#333' : '#aaa', fontWeight: drivingMode === mode ? '700' : '500' }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Speed badge */}
      <View style={[styles.speedBadge, { backgroundColor: isLight ? '#fff' : '#1e1e2e', bottom: nav.isNavigating ? 140 : 80 }]}>
        <Text style={[styles.speedValue, { color: isLight ? '#111' : '#fff' }]}>{Math.round(speed)}</Text>
        <Text style={[styles.speedUnit, { color: isLight ? '#888' : '#666' }]}>mph</Text>
      </View>

      {/* Map style button */}
      {!nav.isNavigating && !nav.showRoutePreview && (
        <TouchableOpacity
          style={[styles.mapStyleBtn, { backgroundColor: colors.card }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMapStylePicker(true); }}>
          <Ionicons name="layers-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      )}

      {/* Map style picker */}
      {showMapStylePicker && (
        <View style={styles.reportPickerOverlay}>
          <TouchableOpacity style={styles.reportPickerBg} onPress={() => setShowMapStylePicker(false)} activeOpacity={1} />
          <View style={[styles.reportPickerSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.reportPickerTitle, { color: colors.text }]}>Map Style</Text>
            <View style={styles.reportPickerGrid}>
              {MAP_STYLES.map((ms, i) => (
                <TouchableOpacity key={ms.key} style={styles.reportPickerItem}
                  onPress={() => { setMapStyleIndex(i); setShowMapStylePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <View style={[styles.reportPickerIcon, mapStyleIndex === i && { borderWidth: 2, borderColor: colors.primary }]}>
                    <Ionicons name="map-outline" size={22} color={mapStyleIndex === i ? colors.primary : colors.textSecondary} />
                  </View>
                  <Text style={[styles.reportPickerLabel, { color: mapStyleIndex === i ? colors.primary : colors.textSecondary }]}>{ms.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {isLocating && (
        <View style={styles.locatingBanner}><Text style={styles.locatingText}>Finding your location...</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  searchBar: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  searchInput: { flex: 1, fontSize: 16 },
  clearBtn: { padding: 4 },
  searchResults: { marginTop: 4, borderRadius: 14, maxHeight: 260, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  resultItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  resultName: { fontSize: 15, fontWeight: '600' },
  resultAddress: { fontSize: 12, marginTop: 2 },
  turnCardContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  turnCard: { margin: 12, marginTop: Platform.OS === 'ios' ? 8 : 12, borderRadius: 16, flexDirection: 'row', padding: 16, alignItems: 'center', shadowColor: '#0066FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 10 },
  turnIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  turnTextBox: { flex: 1 },
  turnDistance: { color: '#fff', fontSize: 22, fontWeight: '800', marginLeft: 8 },
  turnInstruction: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  thenText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 4 },
  etaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 },
  etaInfo: {},
  etaTime: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
  etaDistance: { color: '#999', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  endTripBtn: { backgroundColor: '#FF3B30', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  endTripText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  routePreview: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
  previewHandle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  routeOptionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  routeOptionBtn: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  routeOptionLabel: { fontSize: 14, fontWeight: '600' },
  routeOptionSub: { fontSize: 11, marginTop: 2 },
  truckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  truckLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e3a8a' },
  startNavBtn: { borderRadius: 16, paddingVertical: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  startNavText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tripSummaryOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  tripSummaryCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  tripSummaryTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  tripSummaryRoute: { fontSize: 12, color: '#888', marginBottom: 16 },
  tripStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tripStat: { width: '47%' as any, backgroundColor: '#f5f5f7', borderRadius: 12, padding: 12 },
  tripStatLabel: { fontSize: 12, color: '#888' },
  tripStatValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginTop: 2 },
  tripDoneBtn: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  tripDoneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recenterBtn: { position: 'absolute', right: 16, bottom: 140, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  modeContainer: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', gap: 8, zIndex: 10 },
  modePill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  modeText: { fontSize: 13 },
  speedBadge: { position: 'absolute', left: 16, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  speedValue: { fontSize: 18, fontWeight: '800' },
  speedUnit: { fontSize: 9, marginTop: -2 },
  destPin: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  locatingBanner: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(59,130,246,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  locatingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reportBtn: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  reportCard: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: '#1e1e2e', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', zIndex: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  reportCardTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reportCardSub: { color: '#888', fontSize: 11, marginTop: 2 },
  confirmCard: { position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, zIndex: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  confirmTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  confirmBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ambientBadge: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(30,30,46,0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
  ambientText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
  reportPickerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'flex-end' },
  reportPickerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  reportPickerSheet: { backgroundColor: '#1e1e2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  reportPickerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  reportPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  reportPickerItem: { alignItems: 'center', width: 70 },
  reportPickerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  reportPickerLabel: { color: '#ccc', fontSize: 11, fontWeight: '600' },
  mapStyleBtn: { position: 'absolute', right: 16, top: 120, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, zIndex: 10 },
  mapPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f17', gap: 8 },
  mapPlaceholderTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
  mapPlaceholderSub: { color: '#888', fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
  mapPlaceholderCoords: { color: '#3B82F6', fontSize: 12, fontWeight: '600', marginTop: 8 },
});
