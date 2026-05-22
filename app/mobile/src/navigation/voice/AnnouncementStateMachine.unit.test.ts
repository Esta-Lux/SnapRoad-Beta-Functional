import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AnnouncementPhase,
  initialAnnouncementState,
  nextAnnouncementCue,
} from './AnnouncementStateMachine';

const thresholds = { preAnnounce: 250, orion: 60, immediate: 15 };

test('announcement state machine steps through pre, Orion, immediate once', () => {
  let state = initialAnnouncementState(4, thresholds);
  let out = nextAnnouncementCue({ state, distanceMeters: 240, nowMs: 10_000 });
  assert.equal(out.cue, 'pre');
  assert.equal(out.state.phase, AnnouncementPhase.PRE_ANNOUNCED);
  state = out.state;

  out = nextAnnouncementCue({ state, distanceMeters: 55, nowMs: 16_000 });
  assert.equal(out.cue, 'orion');
  assert.equal(out.state.phase, AnnouncementPhase.ORION_SPOKEN);
  state = out.state;

  out = nextAnnouncementCue({ state, distanceMeters: 10, nowMs: 22_000 });
  assert.equal(out.cue, 'immediate');
  assert.equal(out.state.phase, AnnouncementPhase.IMMEDIATE_ANNOUNCED);
});

test('announcement state machine debounces duplicate calls', () => {
  const state = initialAnnouncementState(2, thresholds);
  const first = nextAnnouncementCue({ state, distanceMeters: 240, nowMs: 10_000 });
  const second = nextAnnouncementCue({ state: first.state, distanceMeters: 50, nowMs: 12_000 });
  assert.equal(second.cue, null);
});
