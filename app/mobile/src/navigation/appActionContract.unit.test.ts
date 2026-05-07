import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APP_ACTION_AUDIT, getActionById } from './appActionContract';

test('commute alerts is the single user-facing recurring alert action', () => {
  const labels = APP_ACTION_AUDIT.map((action) => action.label.toLowerCase());

  assert.ok(labels.includes('commute alerts'));
  assert.equal(labels.some((label) => label.includes('place alert')), false);
  assert.equal(getActionById('commute_alerts')?.target, 'commute_alerts');
});
