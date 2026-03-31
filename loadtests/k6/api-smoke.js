/**
 * Light load / smoke for HTTP APIs (staging or production).
 *
 *   k6 run loadtests/k6/api-smoke.js -e BASE_URL=https://api.example.com
 *
 * GitHub: run workflow "Load test (k6)" with base URL input.
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || "1m",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  const base = (__ENV.BASE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
  let res = http.get(`${base}/health`, { timeout: "15s" });
  check(res, { "health 200": (r) => r.status === 200 });

  res = http.get(`${base}/openapi.json`, { timeout: "15s" });
  check(res, { "openapi 200": (r) => r.status === 200 });

  res = http.get(`${base}/api/config`, { timeout: "15s" });
  check(res, { "public config 200": (r) => r.status === 200 });

  sleep(0.3);
}
