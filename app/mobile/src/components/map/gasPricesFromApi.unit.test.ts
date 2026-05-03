import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatStateGasRegularSummary,
  formatUsdPerGalChip,
  gasPricePointsFromApiEnvelope,
  nearestGasPricePointByLocation,
} from './gasPricesFromApi';

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

test('nearestGasPricePointByLocation picks closer centroid', () => {
  const pts = [
    { id: 'a', state: 'Far', lat: 45, lng: -100, regular: '1' },
    { id: 'b', state: 'Near', lat: 40, lng: -83, regular: '2' },
  ];
  const n = nearestGasPricePointByLocation(40, -83, pts);
  assert.equal(n?.state, 'Near');
});

test('formatStateGasRegularSummary includes price', () => {
  const s = formatStateGasRegularSummary({
    id: 'x',
    state: 'Ohio',
    lat: 40,
    lng: -83,
    regular: '3.199',
  });
  assert.ok(s.includes('Ohio'));
  assert.ok(s.includes('$3.20'));
});

test('formatUsdPerGalChip parses numbers', () => {
  assert.equal(formatUsdPerGalChip('$3.19'), '$3.19');
  assert.equal(formatUsdPerGalChip('3.456'), '$3.46');
});

test('formatUsdPerGalChip returns null when empty', () => {
  assert.equal(formatUsdPerGalChip(undefined), null);
  assert.equal(formatUsdPerGalChip(''), null);
  assert.equal(formatUsdPerGalChip('--'), null);
});
