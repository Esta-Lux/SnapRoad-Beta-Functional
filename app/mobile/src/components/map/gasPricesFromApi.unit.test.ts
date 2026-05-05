import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cheapestLocalRegularChip,
  formatLocalGasRegularSummary,
  formatStateGasRegularSummary,
  formatUsdPerGalChip,
  gasPricePointsFromApiEnvelope,
  isLocalStationGasRow,
  matchGasStationNearPlace,
  nearestGasPricePointByLocation,
} from './gasPricesFromApi';

test('gasPricePointsFromApiEnvelope: local fuel price stations', () => {
  const rows = gasPricePointsFromApiEnvelope({
    success: true,
    data: {
      nearby_stations: [
        {
          name: 'Kroger Gas',
          address: 'Kroger',
          regular: 3.129,
          lat: 40.01,
          lng: -83.01,
          distance_miles: 1.2,
          source: 'gasbuddy',
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.name, 'Kroger Gas');
  assert.equal(first.address, 'Kroger');
  assert.equal(first.regular, '3.129');
  assert.equal(first.distance_miles, 1.2);
  assert.equal(first.source, 'gasbuddy');
});

test('gasPricePointsFromApiEnvelope: flat FastAPI body', () => {
  const rows = gasPricePointsFromApiEnvelope({
    success: true,
    data: [{ id: 'gas-ohio', state: 'Ohio', lat: 40.4, lng: -82.8, currency: 'usd', regular: '$3.10' }],
    total: 1,
  });
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.state, 'Ohio');
  assert.ok(first.regular?.includes('3'));
});

test('gasPricePointsFromApiEnvelope: nested data envelope', () => {
  const rows = gasPricePointsFromApiEnvelope({
    success: true,
    data: { success: true, data: [{ id: 'gas-tx', state: 'Texas', lat: 31.9, lng: -99.9, regular: '$2.99' }] },
  });
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.state, 'Texas');
});

test('gasPricePointsFromApiEnvelope: top-level array', () => {
  const rows = gasPricePointsFromApiEnvelope([
    { state: 'Alabama', lat: 32.7, lng: -86.8, regular: '$2.81' },
  ]);
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.state, 'Alabama');
});

test('gasPricePointsFromApiEnvelope: CollectAPI gasoline field maps to regular', () => {
  const rows = gasPricePointsFromApiEnvelope([
    { name: 'Washington', lat: 47.4, lng: -121.49, gasoline: '4.401', midGrade: '4.671' },
  ]);
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.regular, '4.401');
  assert.equal(first.midGrade, '4.671');
});

test('gasPricePointsFromApiEnvelope: Ohio stateCode backfills centroid', () => {
  const rows = gasPricePointsFromApiEnvelope([
    { stateCode: 'OH', gasoline: '3.219', midGrade: '3.499' },
  ]);
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.state, 'Ohio');
  assert.equal(first.lat, 40.3888);
  assert.equal(first.lng, -82.7649);
  assert.equal(first.regular, '3.219');
});

test('nearestGasPricePointByLocation picks closer centroid', () => {
  const pts = [
    { id: 'a', state: 'Far', lat: 45, lng: -100, regular: '1' },
    { id: 'b', state: 'Near', lat: 40, lng: -83, regular: '2' },
  ];
  const n = nearestGasPricePointByLocation(40, -83, pts);
  assert.equal(n?.state, 'Near');
});

test('nearestGasPricePointByLocation picks closer station', () => {
  const pts = [
    { id: 'a', name: 'Far Station', lat: 45, lng: -100, regular: '1' },
    { id: 'b', name: 'Near Station', lat: 40, lng: -83, regular: '2' },
  ];
  const n = nearestGasPricePointByLocation(40, -83, pts);
  assert.equal(n?.name, 'Near Station');
});

test('formatLocalGasRegularSummary includes station and pump verification', () => {
  const s = formatLocalGasRegularSummary({
    id: 'x',
    name: 'Kroger Gas',
    lat: 40,
    lng: -83,
    regular: '3.199',
    distance_miles: 0.8,
  });
  assert.ok(s.includes('Kroger Gas'));
  assert.ok(s.includes('$3.20'));
  assert.ok(s.includes('verify at pump'));
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

test('isLocalStationGasRow distinguishes fuel API rows', () => {
  assert.equal(isLocalStationGasRow({ id: 'x', lat: 0, lng: 0, distance_miles: 0.8 }), true);
  assert.equal(isLocalStationGasRow({ id: 'y', lat: 0, lng: 0, state: 'Ohio' }), false);
});

test('cheapestLocalRegularChip picks lowest-priced local snapshot', () => {
  assert.equal(
    cheapestLocalRegularChip([
      { id: 'a', lat: 0, lng: 0, distance_miles: 1, regular: '3.59' },
      { id: 'b', lat: 0.1, lng: 0.1, distance_miles: 2, regular: '$3.12' },
    ]),
    '$3.12',
  );
});

test('matchGasStationNearPlace pairs close coordinates', () => {
  const m = matchGasStationNearPlace(
    40,
    -83,
    [
      {
        id: 's',
        name: 'Exxon',
        lat: 40.00005,
        lng: -83.00005,
        distance_miles: 0.1,
        regular: '3.45',
      },
    ],
    200,
  );
  assert.ok(m);
  assert.equal(m?.regular, '3.45');
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
