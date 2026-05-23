import * as Location from 'expo-location';

export enum GpsAccuracy {
  NAVIGATION = 'navigation',
  NEAREST_TEN_METERS = 'tenMeters',
  HUNDRED_METERS = 'hundredMeters',
  KILOMETER = 'kilometer',
}

export type GpsAccuracyInput = {
  isNavigating: boolean;
  highAccuracy?: boolean;
  distanceToNextManeuverMeters?: number | null;
  thermalMitigated?: boolean;
};

export type LocationWatchTuning = {
  accuracy: Location.Accuracy;
  timeInterval: number;
  distanceInterval: number;
};

export function selectGpsAccuracy(input: GpsAccuracyInput): GpsAccuracy {
  if (!input.isNavigating) {
    return input.highAccuracy ? GpsAccuracy.NEAREST_TEN_METERS : GpsAccuracy.HUNDRED_METERS;
  }

  if (input.thermalMitigated) return GpsAccuracy.NEAREST_TEN_METERS;

  const distance = input.distanceToNextManeuverMeters;
  if (distance == null) return GpsAccuracy.NAVIGATION;
  if (typeof distance === 'number' && Number.isFinite(distance) && distance < 500) {
    return GpsAccuracy.NAVIGATION;
  }

  return GpsAccuracy.NEAREST_TEN_METERS;
}

export function locationWatchTuningFor(input: GpsAccuracyInput): LocationWatchTuning {
  const tier = selectGpsAccuracy(input);

  if (tier === GpsAccuracy.NAVIGATION) {
    return {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 5,
    };
  }

  if (tier === GpsAccuracy.NEAREST_TEN_METERS) {
    return {
      accuracy: input.isNavigating || input.highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
      timeInterval: input.isNavigating ? 3000 : 1500,
      distanceInterval: input.isNavigating ? 15 : 5,
    };
  }

  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 8000,
    distanceInterval: 25,
  };
}
