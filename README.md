# WorkSynch — Frontend (standalone)

React 19 + Vite 6 + Tailwind CSS 4 frontend extracted from the `worksynch` monolith.
It talks to the backend (`server.ts` in `../worksynch`) over REST + WebSocket.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api + /uploads to the backend
```

Make sure the backend is running first:

```bash
cd ../worksynch
npm install
npm run dev      # http://localhost:3000
```

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Backend origin for REST + uploads + avatars. Empty = same-origin (dev proxy) | `""` |
| `VITE_WS_URL` | Explicit WebSocket URL override | derived from `VITE_API_URL`, else same-origin |
| `VITE_DEV_PROXY_TARGET` | Where Vite forwards `/api` + `/uploads` in dev | `http://localhost:3000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id (Drive integration) | `""` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps browser key | `""` |

See `.env.example`. For production, set e.g.:

```bash
VITE_API_URL=https://worksynch-backend.onrender.com
```

## Scripts

- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — `tsc --noEmit`

## How the split works

- All backend calls go through `src/config/api.ts`:
  - `apiFetch(path, init)` — same as `fetch`, but prefixes `VITE_API_URL` when set.
  - `apiUrl(path)` — build a backend URL (used for the CSV export link).
  - `backendFileUrl(path)` — resolve `/uploads/...` avatar URLs against the backend.
  - `getWebSocketUrl()` — backend WS URL (`VITE_WS_URL` → `VITE_API_URL` → same-origin).
- `vite.config.ts` proxies `/api` and `/uploads` to `VITE_DEV_PROXY_TARGET` (default `http://localhost:3000`) during dev, so an empty `VITE_API_URL` just works locally.
- `src/utils/offlineAppHtmlGenerator.ts` is server-only (used by `server.ts`); it is kept for reference but never imported by the UI.

## Deploy

- Frontend: Netlify / Vercel / any static host (`npm run build` → `dist/`), with `VITE_API_URL` set to the backend.
- Backend: keep running `../worksynch` (`npm run build && npm start`, serves API + WebSocket on `PORT`).
