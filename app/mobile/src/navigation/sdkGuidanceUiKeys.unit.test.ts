import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sdkGuidanceStabilityKey, sdkGuidanceUiSignature } from './sdkGuidanceUiKeys';
import type { NavigationProgress } from './navModel';

test('sdkGuidanceStabilityKey includes leg + step (multi-leg safe)', () => {
  assert.equal(
    sdkGuidanceStabilityKey({ index: 0, segmentIndex: 0 } as never, 0),
    'sdk|leg:0|step:0',
  );
  assert.equal(
    sdkGuidanceStabilityKey({ index: 0, segmentIndex: 0 } as never, 1),
    'sdk|leg:1|step:0',
  );
  assert.equal(sdkGuidanceStabilityKey({ index: 3, segmentIndex: 0 } as never, 0), 'sdk|leg:0|step:3');
  assert.equal(sdkGuidanceStabilityKey(null, null), 'sdk|leg:0|step:0');
});

test('sdkGuidanceUiSignature: same for small distance wiggle in same 40m bucket (far)', () => {
  const a = {
    instructionSource: 'sdk',
    nextStep: { rawType: 'turn', rawModifier: 'right' } as NavigationProgress['nextStep'],
    banner: { primaryInstruction: 'Turn right' },
    nextStepDistanceMeters: 420,
    nativeStepIdentity: { legIndex: 0, stepIndex: 2 },
  } as unknown as NavigationProgress;
  const b = { ...a, nextStepDistanceMeters: 435 } as unknown as NavigationProgress;
  assert.equal(sdkGuidanceUiSignature(a), sdkGuidanceUiSignature(b));
});

test('sdkGuidanceUiSignature: changes when distance crosses bucket (far)', () => {
  const a = {
    instructionSource: 'sdk',
    nextStep: { rawType: 'turn', rawModifier: 'right' } as NavigationProgress['nextStep'],
    banner: { primaryInstruction: 'Turn right' },
    nextStepDistanceMeters: 200,
    nativeStepIdentity: { legIndex: 0, stepIndex: 2 },
  } as unknown as NavigationProgress;
  const b = { ...a, nextStepDistanceMeters: 250 } as unknown as NavigationProgress;
  assert.notEqual(sdkGuidanceUiSignature(a), sdkGuidanceUiSignature(b));
});
