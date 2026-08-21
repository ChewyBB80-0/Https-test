import http from 'k6/http';
import { check, sleep } from 'k6';

// Paths get appended to BASE_URL, so it must stay a bare origin: a query string
// or trailing slash here turns every step into a malformed homepage hit that
// still returns 200 and passes the checks.
const BASE_URL = (__ENV.BASE_URL || 'https://idlehoursco.com').split('?')[0].replace(/\/+$/, '');
const SEARCH_TERM = __ENV.SEARCH_TERM || 'synthetic test';
const PRODUCT_PATH = __ENV.PRODUCT_PATH || '/product/example-product';
const CART_PATH = __ENV.CART_PATH || '/cart';
const USER_AGENT = __ENV.USER_AGENT || 'SyntheticTrafficBot/1.1 (+https://idlehoursco.com/?country=US)';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

function pause() {
  sleep(1 + Math.random() * 2);
}

function getHeaders(extra = {}) {
  return {
    'User-Agent': USER_AGENT,
    ...extra,
  };
}

export default function () {
  let res = http.get(`${BASE_URL}/`, {
    headers: getHeaders(),
  });
  check(res, { 'homepage status 200': (r) => r.status === 200 });
  pause();

  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(SEARCH_TERM)}`;
  res = http.get(searchUrl, {
    headers: getHeaders(),
  });
  check(res, {
    'search status is 200 or redirect': (r) => r.status === 200 || r.status === 302 || r.status === 301,
  });
  pause();

  res = http.get(`${BASE_URL}${PRODUCT_PATH}`, {
    headers: getHeaders(),
  });
  check(res, {
    'product page status is 200 or redirect': (r) => r.status === 200 || r.status === 302 || r.status === 301,
  });
  pause();

  res = http.post(
    `${BASE_URL}${CART_PATH}`,
    JSON.stringify({ productId: 'synthetic-product', quantity: 1 }),
    {
      headers: getHeaders({ 'Content-Type': 'application/json' }),
    },
  );
  check(res, {
    'cart request accepted': (r) => r.status >= 200 && r.status < 400,
  });
  pause();
}
