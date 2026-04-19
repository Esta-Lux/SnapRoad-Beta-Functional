import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DirectionsStep } from '../lib/directions';
import { buildNavigationProgressFromSdk } from './navSdkProgressAdapter';

function baseStep(overrides: Partial<DirectionsStep> & Pick<DirectionsStep, 'instruction'>): DirectionsStep {
  return {
    instruction: overrides.instruction,
    distance: '',
    distanceMeters: overrides.distanceMeters ?? 100,
    duration: '',
    durationSeconds: overrides.durationSeconds ?? 20,
    maneuver: overrides.maneuver ?? 'straight',
    lat: overrides.lat ?? 37.77,
    lng: overrides.lng ?? -122.42,
    name: overrides.name,
    mapboxManeuver: overrides.mapboxManeuver,
    lanes: overrides.lanes,
    intersections: overrides.intersections,
    bannerInstructions: overrides.bannerInstructions,
    voiceInstructions: overrides.voiceInstructions,
  };
}

const poly: Array<{ lat: number; lng: number }> = [
  { lat: 37.77, lng: -122.42 },
  { lat: 37.771, lng: -122.419 },
  { lat: 37.772, lng: -122.418 },
];

test('buildNavigationProgressFromSdk promotes the upcoming SDK maneuver to nextStep', () => {
  // Real Mapbox Navigation SDK behavior: once you've cleared the depart phase, the
  // `primaryInstruction` becomes the upcoming actionable maneuver ("Turn left onto
  // Valencia St"), even when `stepIndex` still points at the depart step. The adapter
  // must surface that native text and anchor the turn card icon/index on the upcoming
  // step picked by geometry so the REST enrichment (lanes / shields) lines up.
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Head north on Mission St',
      name: 'Mission St',
      mapboxManeuver: { type: 'depart', modifier: '' },
      distanceMeters: 200,
    }),
    baseStep({
      instruction: 'Turn left onto Valencia St',
      name: 'Valencia St',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'left' },
      distanceMeters: 80,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 5000,
      distanceTraveled: 10,
      durationRemaining: 600,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Turn left onto Valencia St',
      maneuverType: 'turn',
      maneuverDirection: 'left',
      distanceToNextManeuverMeters: 150,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog);
  assert.ok(prog.routeSplitSnap);
  assert.equal(prog.routeSplitSnap!.cumulativeMeters, prog.snapped!.cumulativeMeters);
  assert.equal(prog.routeSplitSnap!.segmentIndex, prog.snapped!.segmentIndex);
  assert.ok(Math.abs(prog.routeSplitSnap!.t - prog.snapped!.t) < 0.05);
  assert.equal(prog.nextStep?.index, 1);
  assert.equal(prog.nextStep?.kind, 'turn_left');
  assert.equal(prog.nextStep?.displayInstruction, 'Turn left onto Valencia St');
  assert.equal(prog.followingStep, null);
  assert.equal(prog.nextStep?.nextManeuverKind, null);
  assert.equal(prog.nextStep?.nextManeuverStreet, null);
  assert.equal(prog.nextStep?.nextManeuverDistanceMeters, 80);
});

test('buildNavigationProgressFromSdk sets followingStep from the maneuver after the displayed turn', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Head north on Mission St',
      name: 'Mission St',
      mapboxManeuver: { type: 'depart', modifier: '' },
      distanceMeters: 200,
    }),
    baseStep({
      instruction: 'Turn left onto Valencia St',
      name: 'Valencia St',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'left' },
      distanceMeters: 80,
    }),
    baseStep({
      instruction: 'Turn right onto Market St',
      name: 'Market St',
      lat: 37.772,
      lng: -122.418,
      mapboxManeuver: { type: 'turn', modifier: 'right' },
      distanceMeters: 60,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 5000,
      distanceTraveled: 10,
      durationRemaining: 600,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Continue on Mission St',
      maneuverType: 'continue',
      maneuverDirection: 'straight',
      distanceToNextManeuverMeters: 150,
    },
    location: null,
    polyline: [
      ...poly,
      { lat: 37.773, lng: -122.417 },
    ],
    steps,
  });
  assert.ok(prog?.followingStep);
  assert.equal(prog.nextStep?.index, 1);
  assert.equal(prog.followingStep?.index, 2);
  assert.equal(prog.followingStep?.kind, 'turn_right');
  assert.equal(prog.nextStep?.nextManeuverKind, 'turn_right');
  assert.equal(prog.nextStep?.nextManeuverStreet, 'Market St');
  assert.equal(prog.nextStep?.nextManeuverDistanceMeters, 80);
});

test('buildNavigationProgressFromSdk leaves followingStep null on last step', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Arrive at destination',
      mapboxManeuver: { type: 'arrive', modifier: '' },
      distanceMeters: 10,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 10,
      distanceTraveled: 9000,
      durationRemaining: 0,
      fractionTraveled: 0.99,
      stepIndex: 0,
      primaryInstruction: 'Arrive at destination',
      maneuverType: 'arrive',
      maneuverDirection: '',
      distanceToNextManeuverMeters: 0,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog);
  assert.equal(prog.followingStep, null);
});

test('buildNavigationProgressFromSdk reuses rich turn metadata only for matching SDK step', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Turn right onto Oak Ave',
      name: 'Oak Ave',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'right', exit: 2 },
      distanceMeters: 120,
      intersections: [
        {
          traffic_signal: true,
          lanes: [{ indications: ['right'], valid: true, valid_indication: 'right' }],
        },
      ],
      bannerInstructions: [
        {
          primary: {
            text: 'Turn right onto Oak Ave',
            components: [{ type: 'icon', text: 'I-80' }],
          },
        },
      ],
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 1200,
      distanceTraveled: 50,
      durationRemaining: 120,
      fractionTraveled: 0.1,
      stepIndex: 0,
      primaryInstruction: 'Turn right onto Oak Ave',
      maneuverType: 'turn',
      maneuverDirection: 'right',
      distanceToNextManeuverMeters: 90,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog?.nextStep);
  assert.equal(prog.nextStep.signal.kind, 'traffic_light');
  assert.equal(prog.nextStep.lanes.length, 1);
  assert.equal(prog.nextStep.roundaboutExitNumber, 2);
});

test('buildNavigationProgressFromSdk forces native primary text to win over REST when they disagree', () => {
  // Regression: previously `preferRouteStepFields` let REST `nextBaseStep.displayInstruction`
  // win whenever the REST step kind didn't match the native kind (e.g. REST promoted an
  // upcoming turn while native still reported depart). That made the turn card say
  // something different from the native voice that just played. Single-authority rule:
  // whenever native emits primary text, native wins. REST is only consulted as a fallback
  // when native is silent.
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Turn left onto Valencia St',
      name: 'Valencia St',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'left' },
      distanceMeters: 80,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 5000,
      distanceTraveled: 10,
      durationRemaining: 600,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Merge onto I-280 North',
      maneuverType: 'merge',
      maneuverDirection: 'slight right',
      distanceToNextManeuverMeters: 150,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog);
  assert.equal(
    prog.nextStep?.displayInstruction,
    'Merge onto I-280 North',
    'native primary text must win — the voice just said "Merge…", not "Turn left…"',
  );
  assert.equal(prog.banner!.primaryInstruction, 'Merge onto I-280 North');
  assert.equal(
    prog.nextStep?.rawType,
    'merge',
    'rawType follows native so the maneuver icon matches the voice',
  );
});

test('buildNavigationProgressFromSdk falls back to REST primary text only when native is silent', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Turn right onto Market St',
      name: 'Market St',
      mapboxManeuver: { type: 'turn', modifier: 'right' },
      distanceMeters: 60,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 1200,
      distanceTraveled: 50,
      durationRemaining: 120,
      fractionTraveled: 0.1,
      stepIndex: 0,
      // No primaryInstruction, no currentStepInstruction — native silent.
      maneuverType: 'turn',
      maneuverDirection: 'right',
      distanceToNextManeuverMeters: 60,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.equal(prog?.nextStep?.displayInstruction, 'Turn right onto Market St');
});

test('buildNavigationProgressFromSdk prefers native secondaryInstruction over REST following-step', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Head north on Mission St',
      name: 'Mission St',
      mapboxManeuver: { type: 'depart', modifier: '' },
      distanceMeters: 200,
    }),
    baseStep({
      instruction: 'Turn left onto Valencia St',
      name: 'Valencia St',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'left' },
      distanceMeters: 80,
    }),
    baseStep({
      instruction: 'Turn right onto Market St',
      name: 'Market St',
      lat: 37.772,
      lng: -122.418,
      mapboxManeuver: { type: 'turn', modifier: 'right' },
      distanceMeters: 60,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 5000,
      distanceTraveled: 10,
      durationRemaining: 600,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Turn left onto Valencia St',
      secondaryInstruction: 'Continue on Valencia for 1 mi',
      maneuverType: 'turn',
      maneuverDirection: 'left',
      distanceToNextManeuverMeters: 150,
    },
    location: null,
    polyline: [...poly, { lat: 37.773, lng: -122.417 }],
    steps,
  });
  assert.equal(
    prog?.banner!.secondaryInstruction,
    'Continue on Valencia for 1 mi',
    'native secondary wins over REST "Then Turn right onto Market St"',
  );
});

test('buildNavigationProgressFromSdk uses thenInstruction as secondary when native secondary is absent', () => {
  // Android path: `secondaryInstruction` may be unset (the Mapbox Maneuver API secondary
  // row is often null on highway merges), but `thenInstruction` — the upcoming maneuver's
  // primary text — is always present. The adapter must surface it so the turn card still
  // shows a "then" row that matches the native engine.
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Head north on Mission St',
      name: 'Mission St',
      mapboxManeuver: { type: 'depart', modifier: '' },
      distanceMeters: 200,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 5000,
      distanceTraveled: 10,
      durationRemaining: 600,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'In 500 ft, turn right',
      thenInstruction: 'Merge onto US-101 South',
      maneuverType: 'turn',
      maneuverDirection: 'right',
      distanceToNextManeuverMeters: 150,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.equal(prog?.banner!.secondaryInstruction, 'Merge onto US-101 South');
});

test('buildNavigationProgressFromSdk prefers native distanceToNextManeuverMeters over REST step distance', () => {
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Turn left onto Valencia St',
      name: 'Valencia St',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'left' },
      distanceMeters: 400, // REST says step is 400 m
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 1000,
      distanceTraveled: 10,
      durationRemaining: 90,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Turn left onto Valencia St',
      maneuverType: 'turn',
      maneuverDirection: 'left',
      distanceToNextManeuverMeters: 75, // native says 75 m remaining on this step
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.equal(
    prog?.nextStep?.distanceMetersToNext,
    75,
    'turn card countdown must match native engine, not REST step metadata',
  );
  assert.equal(prog?.banner!.primaryDistanceMeters, 75);
});

test('buildNavigationProgressFromSdk prefers upcoming actionable maneuver over current depart step', () => {
  // Scenario: we're 5 m into a 120 m depart step, but the native engine has already
  // promoted the upcoming turn to `primaryInstruction` (which is what the banner/voice
  // is pointing at). The adapter should:
  //   - use the native text verbatim (`Turn right onto Oak Ave`)
  //   - skip the non-actionable depart step so REST enrichment hits step index 1
  //   - carry the native distance countdown through, not a geometric guess
  const steps: DirectionsStep[] = [
    baseStep({
      instruction: 'Head north on Mission St',
      name: 'Mission St',
      mapboxManeuver: { type: 'depart', modifier: '' },
      distanceMeters: 120,
    }),
    baseStep({
      instruction: 'Turn right onto Oak Ave',
      name: 'Oak Ave',
      lat: 37.771,
      lng: -122.419,
      mapboxManeuver: { type: 'turn', modifier: 'right' },
      distanceMeters: 90,
    }),
  ];
  const prog = buildNavigationProgressFromSdk({
    progress: {
      distanceRemaining: 400,
      distanceTraveled: 5,
      durationRemaining: 60,
      fractionTraveled: 0.01,
      stepIndex: 0,
      primaryInstruction: 'Turn right onto Oak Ave',
      currentStepInstruction: 'Head north on Mission St',
      maneuverType: 'turn',
      maneuverDirection: 'right',
      distanceToNextManeuverMeters: 65,
    },
    location: null,
    polyline: poly,
    steps,
  });
  assert.ok(prog?.nextStep);
  assert.equal(prog.nextStep.index, 1);
  assert.equal(prog.nextStep.kind, 'turn_right');
  assert.equal(prog.nextStep.displayInstruction, 'Turn right onto Oak Ave');
  assert.equal(prog.nextStep.distanceMetersToNext, 65);
});
