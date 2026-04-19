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
    routeWidth: 7,
    routeGlowColor: '#6BB0E8',
    routeGlowOpacity: 0.12,

    turnCardGradient: ['#6BA4E8', '#4A7BBF'],
    turnCardRadius: 24,
    turnCardTextColor: '#FFFFFF',
    turnCardIconBg: 'rgba(255,255,255,0.2)',
    turnCardShadowColor: '#4A90D9',
    distanceFontSize: 28,

    etaBarBg: 'rgba(255,255,255,0.94)',
    etaBarBgDark: 'rgba(255,255,255,0.94)',
    etaBarRadius: 24,
    etaLabelColor: '#8E9BB3',
    etaValueColor: '#1E293B',
    etaAccentColor: '#4A90D9',
    etaArriveColor: '#22C55E',
    speedColor: '#4A90D9',
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
    routeWidth: 6,
    routeGlowColor: '#3B82F6',
    routeGlowOpacity: 0.15,

    turnCardGradient: ['#3B82F6', '#1E40AF'],
    turnCardRadius: 20,
    turnCardTextColor: '#FFFFFF',
    turnCardIconBg: 'rgba(255,255,255,0.18)',
    turnCardShadowColor: '#1E40AF',
    distanceFontSize: 26,

    etaBarBg: 'rgba(255,255,255,0.94)',
    etaBarBgDark: 'rgba(20,25,45,0.94)',
    etaBarRadius: 22,
    etaLabelColor: '#8E9BB3',
    etaValueColor: '#1E293B',
    etaAccentColor: '#3B82F6',
    etaArriveColor: '#22C55E',
    speedColor: '#3B82F6',
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

    /** High-contrast “racing” line: white-on-white was hard to see on Standard/dusk. */
    routeColor: '#FF5A1F',
    routeCasing: '#0C0A0F',
    passedColor: '#64748B',
    routeWidth: 8,
    routeGlowColor: '#FF8A4A',
    routeGlowOpacity: 0.34,

    turnCardGradient: ['#4A4063', '#2D2845'],
    turnCardRadius: 16,
    turnCardTextColor: '#E8D5C4',
    turnCardIconBg: 'rgba(196,149,106,0.15)',
    turnCardShadowColor: '#C4956A',
    turnCardBorderColor: 'rgba(196,149,106,0.25)',
    distanceFontSize: 30,

    etaBarBg: 'rgba(35,30,50,0.95)',
    etaBarBgDark: 'rgba(35,30,50,0.95)',
    etaBarRadius: 18,
    etaLabelColor: 'rgba(196,149,106,0.5)',
    etaValueColor: '#E8D5C4',
    etaAccentColor: '#C4956A',
    etaArriveColor: '#8BC49A',
    speedColor: '#C4956A',
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
