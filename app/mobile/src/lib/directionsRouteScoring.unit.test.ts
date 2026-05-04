import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rankDirectionsRoutesForMode } from './routeScoring';

/** Pick type from scorer so Node tests avoid importing `directions.ts` (pulls RN / api barrel). */
type DirectionsResult = Parameters<typeof rankDirectionsRoutesForMode>[0][number];

function route(
  duration: number,
  congestionScore: number,
  label = 'Candidate',
): DirectionsResult {
  return {
    polyline: [
      { lat: 40, lng: -83 },
      { lat: 40.01, lng: -83.01 },
    ],
    steps: [],
    distance: 8000,
    duration,
    distanceText: '5 mi',
    durationText: `${Math.round(duration / 60)} min`,
    routeType: 'alt',
    routeLabel: label,
    routeReason: 'Alternative route',
    congestionScore,
    timeSavedSeconds: 0,
    congestion: [],
  };
}

test('sport ranks a clear close-time alternate as SnapRoad', () => {
  const congestedFast = route(600, 0.9, 'Fast but busy');
  const clearShortcut = route(660, 0.02, 'Clear shortcut');

  const ranked = rankDirectionsRoutesForMode([congestedFast, clearShortcut], 'sport');

  assert.equal(ranked[0]?.duration, clearShortcut.duration);
  assert.equal(ranked[0]?.routeType, 'fastest');
  assert.equal(ranked[0]?.routeLabel, 'SnapRoad');
  assert.match(ranked[0]?.routeReason ?? '', /SnapRoad/);
});

test('adaptive still protects ETA when a clear alternate is too slow', () => {
  const congestedFast = route(600, 0.9, 'Fast but busy');
  const clearButTooSlow = route(1100, 0.02, 'Clear but slow');

  const ranked = rankDirectionsRoutesForMode([congestedFast, clearButTooSlow], 'adaptive');

  assert.equal(ranked[0]?.duration, congestedFast.duration);
  assert.equal(ranked[0]?.routeLabel, 'Fastest');
});
