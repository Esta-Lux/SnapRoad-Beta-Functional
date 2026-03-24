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
}

export const DRIVING_MODES: Record<DrivingMode, ModeConfig> = {
  calm: {
    label: 'Calm',
    color: '#22C55E',
    routeWidth: 0.85,
    buildingOpacity: 0.6,
    speechRate: 1.0,
    directionsProfile: 'driving',
    excludeParams: 'motorway',
    routeColor: '#22C55E',
    routeCasing: '#166534',
    passedColor: '#999999',
  },
  adaptive: {
    label: 'Adaptive',
    color: '#3B82F6',
    routeWidth: 1.0,
    buildingOpacity: 0.75,
    speechRate: 1.05,
    directionsProfile: 'driving-traffic',
    routeColor: '#3B82F6',
    routeCasing: '#1e4878',
    passedColor: '#999999',
  },
  sport: {
    label: 'Sport',
    color: '#EF4444',
    routeWidth: 1.15,
    buildingOpacity: 0.9,
    speechRate: 1.2,
    directionsProfile: 'driving-traffic',
    routeColor: '#EF4444',
    routeCasing: '#7F1D1D',
    passedColor: '#999999',
  },
};
