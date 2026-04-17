import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNativeFullScreenAllowed, parseEnvBool } from './navFeatureFlagLogic';

test('parseEnvBool respects explicit true/false values', () => {
  assert.equal(parseEnvBool('1', false), true);
  assert.equal(parseEnvBool('true', false), true);
  assert.equal(parseEnvBool('0', true), false);
  assert.equal(parseEnvBool('false', true), false);
});

test('parseEnvBool falls back to default for unset/unknown values', () => {
  assert.equal(parseEnvBool(undefined, false), false);
  assert.equal(parseEnvBool(undefined, true), true);
  assert.equal(parseEnvBool('unexpected', false), false);
});

test('full-screen native nav is allowed only when native=on and logic=off', () => {
  assert.equal(isNativeFullScreenAllowed(true, true), false);
  assert.equal(isNativeFullScreenAllowed(true, false), true);
  assert.equal(isNativeFullScreenAllowed(false, true), false);
  assert.equal(isNativeFullScreenAllowed(false, false), false);
});
