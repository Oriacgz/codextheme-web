let csrf = '';
export function setCsrf(value) {
  csrf = value || '';
}
export function getCsrf() {
  return csrf;
}
export function endpoint(route) {
  const i = route.indexOf('&');
  return (
    '/api/community?route=' +
    encodeURIComponent(i < 0 ? route : route.slice(0, i)) +
    (i < 0 ? '' : route.slice(i))
  );
}
export async function request(route, { method = 'GET', body, signal } = {}) {
  const raw = body instanceof Blob;
  const response = await fetch(endpoint(route), {
    method,
    credentials: 'same-origin',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
      : AbortSignal.timeout(60000),
    headers: {
      ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'x-csrf-token': csrf } : {}),
    },
    body: body == null ? undefined : raw ? body : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return result;
}
export const imageUrl = (id) => endpoint(`themes/${id}/image`);
export const downloadUrl = (id) => endpoint(`themes/${id}/download`);
