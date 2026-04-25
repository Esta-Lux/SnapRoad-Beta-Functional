import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANE_SVG_STRAIGHT, LANE_SVG_STRAIGHT_PATH_START } from './laneSvgPaths';
import type { SdkStepGapDisplay } from '../hooks/useSdkStepGapDisplay';

/**
 * Guardrails: top turn card = forward “up”; bottom stat strip is a separate surface (no flip of lane art).
 * SDK headless + JS pipelines both honor the same {@link import('./navModel').NavStep} fields on the card.
 */
test('lane HUD: straight SVG path tip is toward the top of the viewBox (ahead = up on turn card)', () => {
  assert.ok(LANE_SVG_STRAIGHT.startsWith(LANE_SVG_STRAIGHT_PATH_START));
});

test('SDK gap snapshot type includes lane/signal hold fields (TypeScript contract)', () => {
  const continuing: NonNullable<SdkStepGapDisplay> = {
    holdPrimary: 'Continuing…',
    holdSecondary: undefined,
    holdManeuverIcon: 'straight',
    holdManKind: 'straight',
    holdRawType: '',
    holdRawMod: '',
    holdLanes: [],
    holdShields: [],
    holdRoundaboutExit: null,
  };
  assert.equal(continuing.holdPrimary, 'Continuing…');
  assert.equal(continuing.holdLanes.length, 0);
});
