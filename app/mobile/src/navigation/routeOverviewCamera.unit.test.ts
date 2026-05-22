import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeRouteOverviewBounds,
  coerceRouteOverviewPoint,
  firstPolylineUsableForOverview,
  longestPolylineUsableForOverview,
} from './routeOverviewCamera';

test('coerceRouteOverviewPoint accepts lat/lng and latitude/longitude', () => {
  assert.deepEqual(coerceRouteOverviewPoint({ lat: 40.1, lng: -83.2 }), { lat: 40.1, lng: -83.2 });
  assert.deepEqual(coerceRouteOverviewPoint({ latitude: 41, longitude: -82 }), { lat: 41, lng: -82 });
  assert.equal(coerceRouteOverviewPoint({ lat: NaN, lng: 1 }), null);
  assert.equal(coerceRouteOverviewPoint({ lat: 121, lng: 1 }), null);
});

test('firstPolylineUsableForOverview picks first valid polyline', () => {
  const route = firstPolylineUsableForOverview([
    [{ lat: 0, lng: 0 }],
    [
      { lat: 39.9, lng: -83.0 },
      { lat: 40.0, lng: -82.9 },
    ],
  ]);
  assert.ok(route);
  assert.equal(route!.length, 2);
});

test('longestPolylineUsableForOverview prefers the longest candidate', () => {
  const lowVertexLongRoute = [
    { lat: 40.0, lng: -83.0 },
    { lat: 40.6, lng: -82.4 },
  ];
  const highVertexShortRoute = Array.from({ length: 120 }, (_, i) => ({
    lat: 40 + i * 0.00001,
    lng: -83 + i * 0.00001,
  }));
  const picked = longestPolylineUsableForOverview([highVertexShortRoute, lowVertexLongRoute]);
  assert.equal(picked?.length, lowVertexLongRoute.length);
});

test('computeRouteOverviewBounds pads route envelope', () => {
  const bounds = computeRouteOverviewBounds(
    [
      { lat: 40.0, lng: -83.0 },
      { lat: 40.1, lng: -82.9 },
    ],
    [{ lat: 40.05, lng: -82.95 }],
  );
  assert.ok(bounds);
  assert.ok(bounds!.ne[0] > bounds!.sw[0]);
  assert.ok(bounds!.ne[1] > bounds!.sw[1]);
});

test('computeRouteOverviewBounds ignores invalid route vertices', () => {
  const bounds = computeRouteOverviewBounds(
    [
      { lat: NaN, lng: -83.0 },
      { lat: 40.0, lng: -83.0 },
      { lat: 40.1, lng: -82.9 },
    ],
    [{ lat: 95, lng: -82.95 }],
  );
  assert.ok(bounds);
  assert.ok(bounds!.ne[0] > bounds!.sw[0]);
  assert.ok(bounds!.ne[1] > bounds!.sw[1]);
});
