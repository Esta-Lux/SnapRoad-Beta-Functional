import type { DrivingMode } from '../types';

export type NavigationTheme = {
  route: string;
  traveled: string;
  casing: string;
  maneuver: string;
  puck: string;
};

export const NAV_THEME: Record<DrivingMode, NavigationTheme> = {
  calm: {
    route: '#8FD3FF',
    traveled: 'rgba(143,211,255,0.30)',
    casing: 'rgba(255,255,255,0.22)',
    maneuver: '#BCE8FF',
    puck: '#2563EB',
  },
  adaptive: {
    route: '#2563EB',
    traveled: 'rgba(37,99,235,0.30)',
    casing: 'rgba(255,255,255,0.22)',
    maneuver: '#4F8CFF',
    puck: '#2563EB',
  },
  sport: {
    route: '#FFFFFF',
    traveled: 'rgba(255,255,255,0.30)',
    casing: 'rgba(239,68,68,0.18)',
    maneuver: '#FFFFFF',
    puck: '#EF4444',
  },
};
