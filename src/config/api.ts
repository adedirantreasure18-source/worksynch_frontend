/**
 * Central backend connection config for the standalone frontend.
 *
 * - `VITE_API_URL` = backend origin (e.g. http://localhost:3000 or
 *   https://worksynch-backend.onrender.com). Empty string = same-origin
 *   (works with the Vite dev proxy in vite.config.ts).
 * - `VITE_WS_URL` = optional explicit WebSocket URL override.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL: string = stripTrailingSlash(
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || ''
);

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = `/${path}`;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}

/** Drop-in replacement for fetch() that prefixes relative /api + /uploads calls. */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) {
    return fetch(apiUrl(input), init);
  }
  return fetch(input, init);
}

/** Resolve a backend-hosted file path (e.g. /uploads/avatar-....jpg). */
export function backendFileUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return apiUrl(path);
}

export function getWebSocketUrl(): string {
  const override = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (override) return stripTrailingSlash(override);

  if (API_BASE_URL) {
    try {
      const u = new URL(API_BASE_URL);
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      u.pathname = '/';
      u.search = '';
      u.hash = '';
      return stripTrailingSlash(u.toString());
    } catch {
      // fall through to same-origin
    }
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:3000';
}
