import type { DrivingMode } from '../types';
import type { DirectionsProfile } from '../lib/directions';

export interface ModeConfig {
  label: string;
  color: string;
  routeWidth: number;
  buildingOpacity: number;
  speechRate: number;
  directionsProfile: DirectionsProfile;
  excludeParams?: string;
  routeColor: string;
  routeCasing: string;
  passedColor: string;
  lightPreset: 'dawn' | 'day' | 'dusk' | 'night';
  terrainExaggeration: number;
  showCongestion: boolean;
}

export const DRIVING_MODES: Record<DrivingMode, ModeConfig> = {
  calm: {
    label: 'Calm',
    color: '#6BA4E8',           // sky blue pill highlight
    routeWidth: 7,               // wider, gentle feel
    buildingOpacity: 0.72,
    speechRate: 0.95,            // slightly slower, warmer pace
    directionsProfile: 'driving',
    excludeParams: 'motorway',
    routeColor: '#6BA4E8',       // soft sky blue
    routeCasing: '#4A7BBF',      // deeper blue casing
    passedColor: '#C8D6E5',      // light gray-blue for passed portion
    lightPreset: 'dawn',
    terrainExaggeration: 1.2,    // gentle depth — makes navigation feel scenic
    showCongestion: false,
  },
  adaptive: {
    label: 'Adaptive',
    color: '#3B82F6',              // blue pill highlight
    routeWidth: 6,                 // medium width — efficient
    buildingOpacity: 0.75,
    speechRate: 1.1,               // slightly faster — commute-efficient
    directionsProfile: 'driving-traffic',
    routeColor: '#3B82F6',         // pure blue start (gradient start)
    routeCasing: '#1E40AF',        // deep navy casing
    passedColor: '#9CA3AF',        // neutral gray passed
    lightPreset: 'day',
    terrainExaggeration: 1.0,
    showCongestion: true,
  },
  sport: {
    label: 'Sport',
    color: '#EF4444',              // vivid red pill highlight
    routeWidth: 5,                 // narrower, precise — racing feel
    buildingOpacity: 0.9,
    speechRate: 1.25,              // fast, energetic
    directionsProfile: 'driving-traffic',
    routeColor: '#EF4444',         // vivid red
    routeCasing: '#991B1B',        // dark red casing
    passedColor: '#4B5563',        // dark gray passed
    lightPreset: 'night',
    terrainExaggeration: 1.4,      // dramatic depth for racing feel
    showCongestion: true,
  },
};
