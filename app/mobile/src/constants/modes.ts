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

    routeColor: '#5BA3F7',
    routeCasing: '#2E5A96',
    passedColor: '#7C8FA8',
    routeWidth: 9,
    routeGlowColor: '#7AB8FF',
    routeGlowOpacity: 0.18,

    turnCardGradient: ['#17202B', '#101620'],
    turnCardRadius: 18,
    turnCardTextColor: '#EEF1F5',
    turnCardIconBg: 'rgba(255,255,255,0.08)',
    turnCardShadowColor: 'rgba(0,0,0,0.38)',
    distanceFontSize: 28,

    etaBarBg: 'rgba(248,250,252,0.96)',
    /** Night map: keep the strip high-contrast (light card) with muted ink — avoids dual text tokens in the strip. */
    etaBarBgDark: 'rgba(248,250,252,0.96)',
    etaBarRadius: 16,
    etaLabelColor: 'rgba(20,30,40,0.5)',
    etaValueColor: '#101820',
    etaAccentColor: '#5A6B82',
    etaArriveColor: '#2F5A45',
    speedColor: '#4A5F78',
    speedFontSize: 22,
    dividerColor: 'rgba(0,0,0,0.08)',

    endButtonColor: '#DC2626',
    endButtonRadius: 14,
    endButtonGlow: false,

    turnArrowBg: 'rgba(74,144,217,0.85)',

    navPitch: 55,
    navZoom: 16.5,
    explorePitch: 35,
    exploreZoom: 14,
    /** Approx. nav bottom chrome (see `NAV_MAP_BOTTOM_CHROME_PX` in cameraPresets); follow padding uses presets. */
    cameraPaddingBottom: 198,

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

    routeColor: '#2F8CFF',
    routeCasing: '#153E75',
    passedColor: '#7E8C9E',
    routeWidth: 9,
    routeGlowColor: '#4DA3FF',
    routeGlowOpacity: 0.22,

    turnCardGradient: ['#17202B', '#101722'],
    turnCardRadius: 16,
    turnCardTextColor: '#EEF1F5',
    turnCardIconBg: 'rgba(255,255,255,0.08)',
    turnCardShadowColor: 'rgba(0,0,0,0.40)',
    distanceFontSize: 26,

    etaBarBg: 'rgba(248,250,252,0.96)',
    etaBarBgDark: 'rgba(248,250,252,0.96)',
    etaBarRadius: 16,
    etaLabelColor: 'rgba(20,30,40,0.5)',
    etaValueColor: '#101820',
    etaAccentColor: '#4B5C73',
    etaArriveColor: '#2F5A45',
    speedColor: '#4A5F78',
    speedFontSize: 20,
    dividerColor: 'rgba(0,0,0,0.08)',

    endButtonColor: '#DC2626',
    endButtonRadius: 14,
    endButtonGlow: false,

    turnArrowBg: 'rgba(59,130,246,0.85)',

    navPitch: 60,
    navZoom: 17,
    explorePitch: 45,
    exploreZoom: 15,
    /** Aligned with `NAV_MAP_BOTTOM_CHROME_PX` in cameraPresets for nav follow framing. */
    cameraPaddingBottom: 198,

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

    /** High-saturation core + near-black casing so the line reads on Standard night / dusk. */
    routeColor: '#FF7A2E',
    routeCasing: '#050308',
    passedColor: '#9DB0C4',
    routeWidth: 11,
    routeGlowColor: '#FFB366',
    routeGlowOpacity: 0.46,

    turnCardGradient: ['#181B22', '#101218'],
    turnCardRadius: 14,
    turnCardTextColor: '#F1F3F5',
    turnCardIconBg: 'rgba(255,255,255,0.08)',
    turnCardShadowColor: 'rgba(0,0,0,0.44)',
    turnCardBorderColor: 'rgba(255,255,255,0.12)',
    distanceFontSize: 30,

    etaBarBg: 'rgba(18,20,26,0.96)',
    etaBarBgDark: 'rgba(18,20,26,0.96)',
    etaBarRadius: 14,
    etaLabelColor: 'rgba(255,255,255,0.45)',
    etaValueColor: '#E4E0DA',
    etaAccentColor: 'rgba(255,255,255,0.35)',
    etaArriveColor: 'rgba(110,180,150,0.9)',
    speedColor: 'rgba(200,198,192,0.9)',
    speedFontSize: 28,
    dividerColor: 'rgba(196,149,106,0.15)',

    endButtonColor: '#A33A3A',
    endButtonRadius: 12,
    endButtonGlow: false,
    endButtonGlowColor: 'rgba(163,58,58,0.24)',
    endButtonBorder: 'rgba(255,255,255,0.14)',

    turnArrowBg: 'rgba(123,201,166,0.88)',

    navPitch: 70,
    navZoom: 17.5,
    explorePitch: 50,
    exploreZoom: 15.5,
    cameraPaddingBottom: 198,

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
