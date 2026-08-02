# Blackmagic Camera Control Center

A professional multi-camera remote control and monitoring center for the **Blackmagic Camera app**
(iOS) — and any device speaking the Blackmagic Camera Control REST API. Control recording,
exposure, lens, audio, monitoring overlays, slate, presets, media, color correction, and
livestreaming from a desktop-optimized, dockable web workspace with real-time telemetry.

See [docs/vision.md](docs/vision.md) for the project vision.

## Highlights

- **Auto-discovery** of cameras via mDNS (`_blackmagic._tcp`), plus manual add by IP.
- **Everything the API offers** via a transparent REST proxy — including endpoints added by future
  app updates, with no backend changes.
- **Real-time state** per camera: record tally, timecode, storage, battery, format/codec,
  connection quality (RTT) — seeded by REST, kept live by the camera's WebSocket event stream.
- **Capability-aware UI**: the backend reads each camera's own OpenAPI documentation and dims
  controls the device does not support (e.g. ND filter on iPhone).
- **Production workflow**: digital slate with take increment, camera presets, guarded media
  format, livestream control, event notifications (recording, storage/battery thresholds,
  connection), dockable layouts you can save, keyboard shortcuts, dark/light themes.
- **Multi-camera**: connect several phones/cameras; a grid multiview with per-camera quick REC;
  per-camera isolation (one dropping never affects others).
- **Mock camera included**: full development and CI without hardware.

## Architecture

npm workspaces monorepo:

| Package           | Stack                                                              | Purpose                                                                                          |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `packages/shared` | TypeScript                                                          | API payload types, endpoint registry, WS protocols, state diff helpers                            |
| `packages/server` | Fastify, undici, ws, bonjour-service                                | Discovery, connection manager, state store, capability registry, REST proxy + WS gateway, notifications, persistence, mock camera |
| `packages/web`    | React 18, Vite, Tailwind, shadcn/ui-style, zustand, dockview, sonner | Dockable control workspace                                                                        |

The browser never talks to cameras directly (self-signed TLS + mDNS are not browser-friendly);
all traffic flows through the backend:

```
camera ⇄ (HTTPS REST + WS events, TLS -k) ⇄ server ⇄ (/api proxy + /api/stream WS) ⇄ web
```

## Quick start

Requirements: Node.js ≥ 20.

```bash
npm install
npm run dev
```

Then open http://localhost:7601. By default the server also starts an embedded **mock camera** so
you can explore the entire UI without hardware. To disable it, run with `BMCC_MOCK=0 npm run dev:server`
(in another terminal `npm run dev:web`).

### Connecting a real camera

1. On the iPhone, open Blackmagic Camera → **Settings → Camera Control** and enable the control
   API (note the phone's IP address on your LAN).
2. In the Control Center, discovered cameras appear automatically in the **Cameras** panel —
   click the connect icon. Or click **+** and add the phone's IP manually (HTTPS, port `4444`).
3. The first connection accepts the app's self-signed certificate at the backend; your browser
   only ever talks to the local backend.

Hardware Blackmagic cameras (same API, typically HTTPS port `443` or HTTP port `80`) work too —
the connection manager probes common endpoints automatically.

## Using the app

- **Multi View**: grid of connected cameras with tally, timecode, storage, battery, quick REC.
  Click a tile to make it the active camera for all control panels (or press `1–9`).
- **Recording** panel: status strip + guarded record button (stopping asks for confirmation).
- **Control tabs**: Exposure, Lens, Audio, Color, Monitoring, Slate, Media, Presets, Stream.
- **Events** panel + toast notifications for recording, thresholds, and connection changes.
- **Workspaces** menu: save/apply/delete dock layouts; the current layout autosaves and restores.
- **Keyboard shortcuts**: `R` record toggle (guarded stop), `1–9` select camera, `F` fullscreen,
  `T` theme, `?` shortcut help.

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Run backend + frontend together (with mock camera)       |
| `npm run dev:server`| Backend only (`BMCC_MOCK=0` to disable the mock camera)  |
| `npm run dev:web`   | Frontend only                                            |
| `npm run dev:mock`  | Standalone mock camera on port 4510                      |
| `npm test`          | Unit + mock-camera integration tests (vitest)            |
| `npm run typecheck` | Typecheck all packages                                   |
| `npm run build`     | Production build of the web app                          |

## Configuration (env vars)

| Var              | Default | Purpose                                   |
| ---------------- | ------- | ----------------------------------------- |
| `BMCC_PORT`      | `7600`  | Backend port                              |
| `BMCC_MOCK`      | `1` in dev | Start embedded mock camera (`0` disables) |
| `BMCC_MOCK_PORT` | `4510`  | Mock camera port                          |
| `BMCC_DATA_DIR`  | `packages/server/data` | Persistence directory (JSON) |
| `BMCC_NO_DISCOVERY` | —    | Set `1` to disable mDNS discovery         |

## Backend API (for the frontend / integrations)

- `GET /api/cameras` · `POST /api/cameras` · `DELETE /api/cameras/:id`
- `POST /api/cameras/:id/connect` · `POST /api/cameras/:id/disconnect`
- `GET /api/cameras/:id/state` — flat map of API path → latest value
- `ALL /api/cameras/:id/rest/*` — transparent proxy to the camera (`/video/iso`, …)
- `WS /api/stream` — multiplexed camera list, state snapshots + diffs, notifications
- `GET|PUT|DELETE /api/workspaces[/:name]`, `GET|PUT /api/preferences`, `GET|DELETE /api/notifications`

## Roadmap (v1.1)

- **Live video preview**: orchestrate a local MediaMTX server (SRT/RTMP ingest from the Blackmagic
  Camera app's livestream output, WebRTC playback in the multiview tiles), including generation of
  the app's custom-platform service XML for one-tap import.

## Notes & limitations

- The Blackmagic REST API does not expose audio metering or a video feed; levels shown are the
  gain settings. (Video is covered by the v1.1 plan above.)
- Preset file download (binary) is not proxied; preset apply/save/delete work fully.
- Some properties (e.g. livestream status) are not websocket-subscribable on the camera; the
  backend polls them on a slow interval.
