import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directionsStepsFromSdkRoutes, polylineFromSdkRoutes } from './navSdkGeometry';

test('directionsStepsFromSdkRoutes builds one step per native leg step with summed length', () => {
  const routes = {
    mainRoute: {
      distance: 500,
      expectedTravelTime: 60,
      legs: [
        {
          steps: [
            {
              shape: {
                coordinates: [
                  { latitude: 37.77, longitude: -122.42 },
                  { latitude: 37.771, longitude: -122.419 },
                ],
              },
            },
            {
              shape: {
                coordinates: [
                  { latitude: 37.771, longitude: -122.419 },
                  { latitude: 37.772, longitude: -122.418 },
                ],
              },
            },
          ],
        },
      ],
    },
    alternativeRoutes: [],
  };
  const steps = directionsStepsFromSdkRoutes(routes);
  assert.equal(steps.length, 2);
  assert.ok(steps[0]!.distanceMeters >= 1);
  assert.ok(steps[1]!.distanceMeters >= 1);
  const poly = polylineFromSdkRoutes(routes);
  assert.equal(poly.length, 4);
});
