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

const HUD_ROUTE_BLUE = '#0A84FF';
const HUD_ROUTE_CASING = '#063B82';
const HUD_ROUTE_PASSED = 'rgba(148,163,184,0.62)';
const HUD_ROUTE_GLOW = '#38BDF8';

export const DRIVING_MODES: Record<DrivingMode, ModeConfig> = {
  calm: {
    label: 'Calm',
    color: '#6BA4E8',
    icon: 'leaf-outline',

    routeColor: HUD_ROUTE_BLUE,
    routeCasing: HUD_ROUTE_CASING,
    passedColor: HUD_ROUTE_PASSED,
    routeWidth: 9,
    routeGlowColor: HUD_ROUTE_GLOW,
    routeGlowOpacity: 0.24,

    turnCardGradient: ['#17202B', '#101620'],
    turnCardRadius: 18,
    turnCardTextColor: '#EEF1F5',
    turnCardIconBg: 'rgba(255,255,255,0.08)',
    turnCardShadowColor: 'rgba(0,0,0,0.38)',
    turnCardBorderColor: 'rgba(255,255,255,0.12)',
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

    speechRate: 1.06,
    speechPitch: 0.98,

    lightPreset: 'dawn',
    terrainExaggeration: 1.2,
    buildingOpacity: 0.55,

    puckColor: '#3B82F6',

    directionsProfile: 'driving-traffic',

    showCongestion: false,
    showTrafficBadge: true,
    showTrafficBar: true,
    showSpeedLimit: true,
    showPerfData: true,
  },

  adaptive: {
    label: 'Adaptive',
    color: '#3B82F6',
    icon: 'pulse-outline',

    routeColor: HUD_ROUTE_BLUE,
    routeCasing: HUD_ROUTE_CASING,
    passedColor: HUD_ROUTE_PASSED,
    routeWidth: 9,
    routeGlowColor: HUD_ROUTE_GLOW,
    routeGlowOpacity: 0.24,

    turnCardGradient: ['#17202B', '#101722'],
    turnCardRadius: 16,
    turnCardTextColor: '#EEF1F5',
    turnCardIconBg: 'rgba(255,255,255,0.08)',
    turnCardShadowColor: 'rgba(0,0,0,0.40)',
    turnCardBorderColor: 'rgba(255,255,255,0.12)',
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

    speechRate: 1.06,
    speechPitch: 0.98,

    lightPreset: 'day',
    terrainExaggeration: 1.0,
    buildingOpacity: 0.75,

    puckColor: '#3B82F6',

    directionsProfile: 'driving-traffic',

    showCongestion: false,
    showTrafficBadge: true,
    showTrafficBar: true,
    showSpeedLimit: true,
    showPerfData: true,
  },

  sport: {
    label: 'Sport',
    color: '#4A4063',
    icon: 'speedometer-outline',

    /** Same high-visibility SnapRoad blue as the other modes; Sport changes behavior, not route color. */
    routeColor: HUD_ROUTE_BLUE,
    routeCasing: HUD_ROUTE_CASING,
    passedColor: HUD_ROUTE_PASSED,
    routeWidth: 11,
    routeGlowColor: HUD_ROUTE_GLOW,
    routeGlowOpacity: 0.34,

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

    speechRate: 1.06,
    speechPitch: 0.98,

    lightPreset: 'dusk',
    terrainExaggeration: 1.4,
    buildingOpacity: 0.85,

    puckColor: '#DC2626',

    directionsProfile: 'driving-traffic',

    showCongestion: false,
    /** Same live traffic cues as Adaptive — Sport is the “full telemetry” drive mode. */
    showTrafficBadge: true,
    showTrafficBar: true,
    showSpeedLimit: true,
    showPerfData: true,
  },
};
