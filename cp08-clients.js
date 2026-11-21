import http from 'k6/http';
import { check, sleep } from 'k6';

const virtualUsers = Number(__ENV.VUS || 50);
const holdDuration = __ENV.HOLD_DURATION || '5m';
const baseUrl = __ENV.BASE_URL || 'http://localhost:3333';
const listMode = __ENV.LIST_MODE || 'page';
const pageLimit = Number(__ENV.LIMIT || 50);

if (!['page', 'full'].includes(listMode) || pageLimit < 1 || pageLimit > 200) {
  throw new Error('LIST_MODE debe ser page/full y LIMIT debe estar entre 1 y 200.');
}

export const options = {
  stages: [
    { duration: '30s', target: virtualUsers },
    { duration: holdDuration, target: virtualUsers },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const token = __ENV.TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = http.get(
      `${baseUrl}/api/clients?limit=${pageLimit}&page=${page}`,
      { headers }
    );
    check(response, {
      'respuesta HTTP 200': (r) => r.status === 200,
    });
    if (listMode === 'full' && page === 1) {
      totalPages = Number(response.headers['X-Total-Pages'] || 1);
    }
    sleep(1);
  }
}
