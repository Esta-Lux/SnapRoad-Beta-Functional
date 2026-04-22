/**
 * Route polyline colors for map preview (non-selected routes).
 * Selected route uses {@link RouteOverlay} / mode config.
 */

import type { RouteKind } from './directions';

export interface RoutePolylineStyle {
  color: string;
  selectedColor: string;
  width: number;
  selectedWidth: number;
  opacity: number;
  selectedOpacity: number;
}

const ROUTE_COLORS: Record<RouteKind, RoutePolylineStyle> = {
  fastest: {
    color: '#4A90D9',
    selectedColor: '#5BA3F5',
    width: 5,
    selectedWidth: 9,
    opacity: 0.45,
    selectedOpacity: 1.0,
  },
  no_highways: {
    color: '#5BA55B',
    selectedColor: '#6EC06E',
    width: 5,
    selectedWidth: 9,
    opacity: 0.45,
    selectedOpacity: 1.0,
  },
  avoid_tolls: {
    color: '#D4A843',
    selectedColor: '#E8BC55',
    width: 5,
    selectedWidth: 9,
    opacity: 0.45,
    selectedOpacity: 1.0,
  },
  eco: {
    color: '#4ACAAD',
    selectedColor: '#5EDDC0',
    width: 5,
    selectedWidth: 9,
    opacity: 0.45,
    selectedOpacity: 1.0,
  },
  alt: {
    color: '#9B7FD4',
    selectedColor: '#B094E8',
    width: 5,
    selectedWidth: 9,
    opacity: 0.4,
    selectedOpacity: 1.0,
  },
};

export function getRoutePolylineStyle(
  routeType: RouteKind | undefined,
  isSelected: boolean,
): { color: string; width: number; opacity: number } {
  const style = ROUTE_COLORS[routeType ?? 'alt'] ?? ROUTE_COLORS.alt;
  return {
    color: isSelected ? style.selectedColor : style.color,
    width: isSelected ? style.selectedWidth : style.width,
    opacity: isSelected ? style.selectedOpacity : style.opacity,
  };
}
