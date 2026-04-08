import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  remainingDurationSecondsFromEdges,
  buildEdgeDurationSecFromSteps,
  resolveEdgeDurationSec,
} from '../navigationEtaEdges';
import type { NavStep } from '../navModel';
import type { Coordinate } from '../../types';

test('remainingDurationSecondsFromEdges: prorates current edge', () => {
  const cum = [0, 100, 250, 400];
  const dur = [60, 90, 120];
  const sec = remainingDurationSecondsFromEdges({
    snapCumulativeMetersAlongPolyline: 150,
    cumulativeVertexMeters: cum,
    edgeDurationSec: dur,
  });
  assert.equal(sec, Math.round((100 / 150) * 90 + 120));
});

test('buildEdgeDurationSecFromSteps splits step duration by edge length', () => {
  const poly: Coordinate[] = [
    { lat: 40.0, lng: -83.0 },
    { lat: 40.001, lng: -83.0 },
    { lat: 40.002, lng: -83.0 },
  ];
  const steps: NavStep[] = [
    {
      index: 0,
      segmentIndex: 0,
      distanceMetersFromStart: 0,
      distanceMetersToNext: 200,
      durationSeconds: 100,
      kind: 'straight',
      streetName: null,
      instruction: null,
    },
    {
      index: 1,
      segmentIndex: 1,
      distanceMetersFromStart: 200,
      distanceMetersToNext: 0,
      durationSeconds: 50,
      kind: 'arrive',
      streetName: null,
      instruction: null,
    },
  ];
  const edges = buildEdgeDurationSecFromSteps(poly, steps);
  assert.ok(edges && edges.length === 2);
  assert.ok(edges![0] > 0 && edges![1] > 0);
  assert.ok(Math.abs(edges![0] + edges![1]! - 150) < 1);
});

test('resolveEdgeDurationSec prefers Mapbox annotation array', () => {
  const poly: Coordinate[] = [
    { lat: 0, lng: 0 },
    { lat: 0.001, lng: 0 },
    { lat: 0.002, lng: 0 },
  ];
  const steps: NavStep[] = [
    {
      index: 0,
      segmentIndex: 0,
      distanceMetersFromStart: 0,
      distanceMetersToNext: 300,
      durationSeconds: 99,
      kind: 'straight',
      streetName: null,
      instruction: null,
    },
    {
      index: 1,
      segmentIndex: 1,
      distanceMetersFromStart: 300,
      distanceMetersToNext: 0,
      durationSeconds: 1,
      kind: 'arrive',
      streetName: null,
      instruction: null,
    },
  ];
  const ann = [40, 50];
  const r = resolveEdgeDurationSec({
    polyline: poly,
    navSteps: steps,
    mapboxEdgeDurationSec: ann,
  });
  assert.deepEqual(r, ann);
});
