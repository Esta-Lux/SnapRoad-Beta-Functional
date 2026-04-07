import type { DrivingMode } from '../types';

export type RouteTheme = {
  routeColor: string;
  traveledColor: string;
  casingColor: string;
  maneuverColor: string;
  routeWidth: number;
  traveledWidth: number;
  casingWidth: number;
  maneuverWidth: number;
};

export const ROUTE_THEME_BY_MODE: Record<DrivingMode, RouteTheme> = {
  calm: {
    routeColor: '#8FD3FF',
    traveledColor: 'rgba(143, 211, 255, 0.35)',
    casingColor: 'rgba(255,255,255,0.20)',
    maneuverColor: '#BCE8FF',
    routeWidth: 6,
    traveledWidth: 6,
    casingWidth: 10,
    maneuverWidth: 8,
  },
  adaptive: {
    routeColor: '#2563EB',
    traveledColor: 'rgba(37, 99, 235, 0.32)',
    casingColor: 'rgba(255,255,255,0.22)',
    maneuverColor: '#4F8CFF',
    routeWidth: 6,
    traveledWidth: 6,
    casingWidth: 10,
    maneuverWidth: 8,
  },
  sport: {
    routeColor: '#FFFFFF',
    traveledColor: 'rgba(255,255,255,0.32)',
    casingColor: 'rgba(239, 68, 68, 0.18)',
    maneuverColor: '#FFFFFF',
    routeWidth: 6,
    traveledWidth: 6,
    casingWidth: 10,
    maneuverWidth: 8,
  },
};
