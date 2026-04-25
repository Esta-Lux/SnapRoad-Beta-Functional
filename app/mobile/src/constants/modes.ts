import type { DrivingMode } from '../types';
import type { DirectionsProfile } from '../lib/directions';

/** Driving-mode theming: visuals, camera hints, voice, routing. Index by `drivingMode` from components. */
export interface ModeConfig {
  label: string;
  color: string;
  icon: string;

  routeColor: string;
  routeCasing: string;
  passedColor: string;
  routeWidth: number;
  routeGlowColor: string;
  routeGlowOpacity: number;

  turnCardGradient: [string, string];
  turnCardRadius: number;
  turnCardTextColor: string;
  turnCardIconBg: string;
  turnCardShadowColor: string;
  turnCardBorderColor?: string;
  distanceFontSize: number;

  etaBarBg: string;
  etaBarBgDark: string;
  etaBarRadius: number;
  etaLabelColor: string;
  etaValueColor: string;
  etaAccentColor: string;
  etaArriveColor: string;
  speedColor: string;
  speedFontSize: number;
  dividerColor: string;

  endButtonColor: string;
  endButtonRadius: number;
  endButtonGlow: boolean;
  endButtonGlowColor?: string;
  endButtonBorder?: string;

  turnArrowBg: string;

  navPitch: number;
  navZoom: number;
  explorePitch: number;
  exploreZoom: number;
  cameraPaddingBottom: number;

  speechRate: number;
  speechPitch: number;

  lightPreset: 'dawn' | 'day' | 'dusk' | 'night';
  terrainExaggeration: number;

  buildingOpacity: number;

  /** Reserved for future puck theming; navigation uses the default Mapbox LocationPuck. */
  puckColor: string;

  directionsProfile: DirectionsProfile;
  excludeParams?: string;

  showCongestion: boolean;
  showTrafficBadge: boolean;
  showTrafficBar: boolean;
  showSpeedLimit: boolean;
  showPerfData: boolean;
}

export const DRIVING_MODES: Record<DrivingMode, ModeConfig> = {
  calm: {
    label: 'Calm',
    color: '#6BA4E8',
    icon: 'leaf-outline',

    routeColor: '#6BB0E8',
    routeCasing: '#3E7FC4',
    passedColor: '#94A3B8',
    routeWidth: 9,
    routeGlowColor: '#6BB0E8',
    routeGlowOpacity: 0.14,

    turnCardGradient: ['#1A2433', '#0E141C'],
    turnCardRadius: 24,
    turnCardTextColor: '#EEF1F5',
    turnCardIconBg: 'rgba(255,255,255,0.1)',
    turnCardShadowColor: 'rgba(0,0,0,0.5)',
    distanceFontSize: 28,

    etaBarBg: 'rgba(250,250,252,0.97)',
    /** Night map: keep the strip high-contrast (light card) with muted ink — avoids dual text tokens in the strip. */
    etaBarBgDark: 'rgba(246,247,250,0.98)',
    etaBarRadius: 24,
    etaLabelColor: 'rgba(20,30,40,0.5)',
    etaValueColor: '#101820',
    etaAccentColor: '#5A6B82',
    etaArriveColor: '#2F5A45',
    speedColor: '#4A5F78',
    speedFontSize: 22,
    dividerColor: 'rgba(0,0,0,0.08)',

    endButtonColor: '#DC2626',
    endButtonRadius: 20,
    endButtonGlow: false,

    turnArrowBg: 'rgba(74,144,217,0.85)',

    navPitch: 55,
    navZoom: 16.5,
    explorePitch: 35,
    exploreZoom: 14,
    /** Approx. nav bottom chrome (see `NAV_MAP_BOTTOM_CHROME_PX` in cameraPresets); follow padding uses presets. */
    cameraPaddingBottom: 228,

    speechRate: 0.88,
    speechPitch: 0.95,

    lightPreset: 'dawn',
    terrainExaggeration: 1.2,
    buildingOpacity: 0.55,

    puckColor: '#3B82F6',

    directionsProfile: 'driving-traffic',

    showCongestion: true,
    showTrafficBadge: true,
    showTrafficBar: true,
    showSpeedLimit: false,
    showPerfData: false,
  },

  adaptive: {
    label: 'Adaptive',
    color: '#3B82F6',
    icon: 'pulse-outline',

    routeColor: '#3B82F6',
    routeCasing: '#1E40AF',
    passedColor: '#9CA3AF',
    routeWidth: 8,
    routeGlowColor: '#3B82F6',
    routeGlowOpacity: 0.18,

    turnCardGradient: ['#1C2432', '#121822'],
    turnCardRadius: 20,
    turnCardTextColor: '#EEF1F5',
    turnCardIconBg: 'rgba(255,255,255,0.1)',
    turnCardShadowColor: 'rgba(0,0,0,0.5)',
    distanceFontSize: 26,

    etaBarBg: 'rgba(250,250,252,0.97)',
    etaBarBgDark: 'rgba(246,247,250,0.98)',
    etaBarRadius: 22,
    etaLabelColor: 'rgba(20,30,40,0.5)',
    etaValueColor: '#101820',
    etaAccentColor: '#4B5C73',
    etaArriveColor: '#2F5A45',
    speedColor: '#4A5F78',
    speedFontSize: 20,
    dividerColor: 'rgba(0,0,0,0.08)',

    endButtonColor: '#DC2626',
    endButtonRadius: 18,
    endButtonGlow: false,

    turnArrowBg: 'rgba(59,130,246,0.85)',

    navPitch: 60,
    navZoom: 17,
    explorePitch: 45,
    exploreZoom: 15,
    /** Aligned with `NAV_MAP_BOTTOM_CHROME_PX` in cameraPresets for nav follow framing. */
    cameraPaddingBottom: 228,

    speechRate: 1.02,
    speechPitch: 1.0,

    lightPreset: 'day',
    terrainExaggeration: 1.0,
    buildingOpacity: 0.75,

    puckColor: '#3B82F6',

    directionsProfile: 'driving-traffic',

    showCongestion: true,
    showTrafficBadge: true,
    showTrafficBar: true,
    showSpeedLimit: false,
    showPerfData: false,
  },

  sport: {
    label: 'Sport',
    color: '#4A4063',
    icon: 'speedometer-outline',

    /** High-contrast “racing” line; `effectiveNavRouteColors` brightens for dusk/night/satellite. */
    routeColor: '#FF5A1F',
    routeCasing: '#0C0A0F',
    passedColor: '#64748B',
    routeWidth: 10,
    routeGlowColor: '#FF8A4A',
    routeGlowOpacity: 0.38,

    turnCardGradient: ['#1A1820', '#100E14'],
    turnCardRadius: 16,
    turnCardTextColor: '#E4E0DA',
    turnCardIconBg: 'rgba(255,255,255,0.08)',
    turnCardShadowColor: 'rgba(0,0,0,0.55)',
    turnCardBorderColor: 'rgba(255,255,255,0.1)',
    distanceFontSize: 30,

    etaBarBg: 'rgba(26,24,32,0.95)',
    etaBarBgDark: 'rgba(26,24,32,0.95)',
    etaBarRadius: 18,
    etaLabelColor: 'rgba(255,255,255,0.45)',
    etaValueColor: '#E4E0DA',
    etaAccentColor: 'rgba(255,255,255,0.35)',
    etaArriveColor: 'rgba(110,180,150,0.9)',
    speedColor: 'rgba(200,198,192,0.9)',
    speedFontSize: 28,
    dividerColor: 'rgba(196,149,106,0.15)',

    endButtonColor: '#9B4D4D',
    endButtonRadius: 14,
    endButtonGlow: true,
    endButtonGlowColor: 'rgba(155,77,77,0.3)',
    endButtonBorder: 'rgba(196,149,106,0.2)',

    turnArrowBg: 'rgba(123,201,166,0.88)',

    navPitch: 70,
    navZoom: 17.5,
    explorePitch: 50,
    exploreZoom: 15.5,
    cameraPaddingBottom: 228,

    speechRate: 1.14,
    speechPitch: 1.05,

    lightPreset: 'dusk',
    terrainExaggeration: 1.4,
    buildingOpacity: 0.85,

    puckColor: '#DC2626',

    directionsProfile: 'driving-traffic',

    showCongestion: true,
    /** Same live traffic cues as Adaptive — Sport is the “full telemetry” drive mode. */
    showTrafficBadge: true,
    showTrafficBar: true,
    showSpeedLimit: true,
    showPerfData: true,
  },
};
