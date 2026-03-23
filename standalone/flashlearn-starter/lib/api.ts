const BASE_URL = process.env.NEXT_PUBLIC_FLASHLEARN_API_URL || 'https://flashlearnai.witus.online/api/v1';
const API_KEY = process.env.FLASHLEARN_API_KEY || '';

/**
 * Central API client for FlashLearnAI.WitUS.Online Public API.
 * All pages use this to make authenticated requests.
 */
export async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
    cache: 'no-store',
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json.error?.message || `API error: ${res.status}`;
    throw new Error(message);
  }

  return json.data as T;
}

/**
 * Client-side API client (uses NEXT_PUBLIC env var for browser calls).
 */
export async function clientApi<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_FLASHLEARN_API_URL || 'https://flashlearnai.witus.online/api/v1';
  const key = process.env.NEXT_PUBLIC_FLASHLEARN_API_KEY || '';

  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `API error: ${res.status}`);
  return json.data as T;
}
