import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const token = __ENV.TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = http.get(`${baseUrl}/api/clients`, { headers });

  check(response, {
    'respuesta HTTP 200': (r) => r.status === 200,
  });

  sleep(1);
}
