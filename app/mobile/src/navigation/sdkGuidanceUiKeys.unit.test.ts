import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sdkGuidanceStabilityKey } from './sdkGuidanceUiKeys';

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
