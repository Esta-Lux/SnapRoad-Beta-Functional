/**
 * Lock in iOS Swift-enum → Mapbox Directions canonical maneuver string
 * normalisation. Without this, `resolveManeuverKind` /
 * `ManeuverIcon.resolveIconKey` miss on every iOS turn and fall through to
 * the default "continue" glyph — which shows up as the straight arrow that
 * fought the real turn direction during user-reported navigation.
 *
 * iOS emits `String(describing: Swift.Enum.case)` — camelCase case names
 * like `takeOnRamp`, `reachFork`, `takeRoundabout`, `straightAhead`,
 * `sharpLeft`, `slightRight`, `uTurn`. Android already emits canonical
 * Mapbox strings (`on ramp`, `straight`, `sharp left`, `slight right`,
 * `uturn`), so these mappings must be idempotent on Android / JS inputs.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeSdkManeuverType,
  normalizeSdkManeuverDirection,
} from './navSdkProgressAdapter';

test('normalizeSdkManeuverType maps iOS Swift enum cases to canonical strings', () => {
  assert.equal(normalizeSdkManeuverType('takeOnRamp'), 'on ramp');
  assert.equal(normalizeSdkManeuverType('takeOffRamp'), 'off ramp');
  assert.equal(normalizeSdkManeuverType('reachFork'), 'fork');
  assert.equal(normalizeSdkManeuverType('takeRoundabout'), 'roundabout');
  assert.equal(normalizeSdkManeuverType('exitRoundabout'), 'roundabout');
  assert.equal(normalizeSdkManeuverType('roundaboutTurn'), 'roundabout');
  assert.equal(normalizeSdkManeuverType('takeRotary'), 'rotary');
  assert.equal(normalizeSdkManeuverType('passNameChange'), 'continue');
  assert.equal(normalizeSdkManeuverType('useLane'), 'continue');
});

test('normalizeSdkManeuverType is idempotent on already-canonical Android strings', () => {
  assert.equal(normalizeSdkManeuverType('turn'), 'turn');
  assert.equal(normalizeSdkManeuverType('on ramp'), 'on ramp');
  assert.equal(normalizeSdkManeuverType('merge'), 'merge');
  assert.equal(normalizeSdkManeuverType('depart'), 'depart');
  assert.equal(normalizeSdkManeuverType('arrive'), 'arrive');
});

test('normalizeSdkManeuverType normalises case and whitespace', () => {
  assert.equal(normalizeSdkManeuverType('  Turn  '), 'turn');
  assert.equal(normalizeSdkManeuverType('TURN'), 'turn');
  assert.equal(normalizeSdkManeuverType(''), '');
  assert.equal(normalizeSdkManeuverType(null), '');
  assert.equal(normalizeSdkManeuverType(undefined), '');
});

test('normalizeSdkManeuverDirection maps iOS direction enum cases', () => {
  assert.equal(normalizeSdkManeuverDirection('straightAhead'), 'straight');
  assert.equal(normalizeSdkManeuverDirection('sharpLeft'), 'sharp left');
  assert.equal(normalizeSdkManeuverDirection('sharpRight'), 'sharp right');
  assert.equal(normalizeSdkManeuverDirection('slightLeft'), 'slight left');
  assert.equal(normalizeSdkManeuverDirection('slightRight'), 'slight right');
  assert.equal(normalizeSdkManeuverDirection('uTurn'), 'uturn');
});

test('normalizeSdkManeuverDirection is idempotent on canonical strings', () => {
  assert.equal(normalizeSdkManeuverDirection('left'), 'left');
  assert.equal(normalizeSdkManeuverDirection('right'), 'right');
  assert.equal(normalizeSdkManeuverDirection('straight'), 'straight');
  assert.equal(normalizeSdkManeuverDirection('sharp left'), 'sharp left');
  assert.equal(normalizeSdkManeuverDirection('slight right'), 'slight right');
  assert.equal(normalizeSdkManeuverDirection('uturn'), 'uturn');
});

test('normalizeSdkManeuverDirection handles missing / whitespace', () => {
  assert.equal(normalizeSdkManeuverDirection(''), '');
  assert.equal(normalizeSdkManeuverDirection(null), '');
  assert.equal(normalizeSdkManeuverDirection(undefined), '');
  assert.equal(normalizeSdkManeuverDirection('   Left   '), 'left');
  assert.equal(normalizeSdkManeuverDirection('RIGHT'), 'right');
});

test('normalizeSdkManeuverDirection supports underscore separators (defensive)', () => {
  assert.equal(normalizeSdkManeuverDirection('straight_ahead'), 'straight');
  assert.equal(normalizeSdkManeuverDirection('sharp_left'), 'sharp left');
  assert.equal(normalizeSdkManeuverDirection('slight_right'), 'slight right');
  assert.equal(normalizeSdkManeuverDirection('u_turn'), 'uturn');
  assert.equal(normalizeSdkManeuverDirection('u-turn'), 'uturn');
});
