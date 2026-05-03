import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gasPricePointsFromApiEnvelope } from './gasPricesFromApi';

test('gasPricePointsFromApiEnvelope: flat FastAPI body', () => {
  const rows = gasPricePointsFromApiEnvelope({
    success: true,
    data: [{ id: 'gas-ohio', state: 'Ohio', lat: 40.4, lng: -82.8, currency: 'usd', regular: '$3.10' }],
    total: 1,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.state, 'Ohio');
  assert.ok(rows[0]!.regular?.includes('3'));
});

test('gasPricePointsFromApiEnvelope: nested data envelope', () => {
  const rows = gasPricePointsFromApiEnvelope({
    success: true,
    data: { success: true, data: [{ id: 'gas-tx', state: 'Texas', lat: 31.9, lng: -99.9, regular: '$2.99' }] },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.state, 'Texas');
});

test('gasPricePointsFromApiEnvelope: top-level array', () => {
  const rows = gasPricePointsFromApiEnvelope([
    { name: 'Alabama', lat: 32.7, lng: -86.8, regular: '$2.81' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.state, 'Alabama');
});
