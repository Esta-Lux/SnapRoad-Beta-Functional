import { useEffect, type RefObject } from 'react';
import type Mapbox from '@rnmapbox/maps';
import type { NavigationProgress } from '../navigation/navModel';
import type { DrivingMode } from '../types';

type Args = {
  cameraRef: RefObject<Mapbox.Camera | null>;
  progress: NavigationProgress | null;
  mode: DrivingMode;
  isFollowing: boolean;
};

function configFor(mode: DrivingMode, speedMps: number) {
  if (mode === 'sport') {
    return {
      zoom: speedMps > 22 ? 15.0 : 16.0,
      pitch: 58,
      animationDuration: 320,
    };
  }
  if (mode === 'adaptive') {
    return {
      zoom: speedMps > 22 ? 14.7 : speedMps > 10 ? 15.5 : 16.4,
      pitch: speedMps > 18 ? 50 : 42,
      animationDuration: 420,
    };
  }
  return {
    zoom: speedMps > 18 ? 15.6 : 16.5,
    pitch: 34,
    animationDuration: 520,
  };
}

export function useNavigationCamera({ cameraRef, progress, mode, isFollowing }: Args) {
  useEffect(() => {
    if (!cameraRef.current || !progress?.displayCoord || !isFollowing) return;
    const speed = progress.displayCoord.speedMps ?? 0;
    const cfg = configFor(mode, speed);
    cameraRef.current.setCamera({
      centerCoordinate: [progress.displayCoord.lng, progress.displayCoord.lat],
      heading: progress.displayCoord.heading ?? 0,
      zoomLevel: cfg.zoom,
      pitch: cfg.pitch,
      animationDuration: cfg.animationDuration,
    });
  }, [cameraRef, progress, mode, isFollowing]);
}
