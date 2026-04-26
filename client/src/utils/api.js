const BASE = '/api';

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, url, body) {
  const opts = { method, headers: {}, credentials: 'include' };
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body) {
    opts.body = body;
  }
  const res = await fetch(`${BASE}${url}`, opts);
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (onUnauthorized && !url.startsWith('/auth/')) onUnauthorized();
    const err = new Error(data?.error || 'Authentication required');
    err.status = 401;
    err.body = data;
    throw err;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`);
    err.issues = data?.issues;
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url) => request('DELETE', url),
};
