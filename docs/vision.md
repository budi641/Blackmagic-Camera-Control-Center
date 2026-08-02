# Blackmagic Camera Control Center — Project Vision & Requirements

A modern, intuitive, and professional web application serving as a complete remote control and
monitoring center for the Blackmagic Camera app on iPhone. The app exposes a powerful REST API and
WebSocket event stream over the local network; this project turns that capability into a
desktop-optimized control center that is faster, clearer, and more efficient than operating the
phone directly — while laying the groundwork to support additional camera systems in the future
without redesigning the application.

## Core Purpose

The Blackmagic Camera app exposes extensive camera control — recording, transport, exposure, lens,
audio, monitoring overlays, media management, digital slate, color correction, live streaming,
presets, timecode — but the phone screen makes deep control awkward during production. The Control
Center provides a central place on a computer to see and control everything the API offers, with
real-time status, full control, a professional workflow, and an interface designed for clarity and
speed.

## Primary Goals

- **Complete remote control** of every capability exposed by the Blackmagic Camera API.
- **Real-time camera status** — recording, timecode, storage, battery/power, format, codec,
  connection health — always visible at a glance.
- **Intuitive interface** — organized control groups, immediate visual feedback, no hunting through
  phone menus.
- **Better than direct phone control** — faster adjustments, clearer telemetry, bigger targets,
  keyboard shortcuts.
- **Professional workflow support** — multiple cameras, saved layouts, notifications, guarded
  destructive actions.
- **Future extensibility** — architecture accommodates other camera systems (hardware Blackmagic
  cameras speak the same API; other brands can plug into the same connection/state/gateway layers).

## Functional Requirements

### Camera connection & discovery

- Automatically discover cameras on the local network (mDNS `_blackmagic._tcp`) and display all
  available cameras.
- Connect and disconnect individual cameras; manual add by host/IP.
- Show real-time connection status and quality (round-trip time) per camera.
- Reconnect automatically with backoff; one camera dropping never affects others.

### Live camera dashboard

- Recording status with tally-style indication, timecode, clip count.
- Video format, codec, resolution, frame rate, dynamic range.
- Storage: free space, remaining record time, active media, clip count.
- Power: battery percentage / source where exposed.
- Streaming status where exposed.

### Camera controls (all via API)

- **Transport**: record start/stop (guarded stop), playback state.
- **Exposure**: ISO, shutter angle/speed (+measurement mode), white balance (+tint, auto WB),
  ND filter, auto exposure, gain, detail sharpening.
- **Lens**: focus (normalized + autofocus trigger), zoom (focal length), iris (aperture),
  optical image stabilization — honoring per-device controllability descriptions.
- **Audio**: per-channel input selection, gain, phantom power, padding, low-cut filter.
- **Monitoring**: zebra, focus assist, false color, frame guides (+ratio), grids, safe area
  (+percent), display LUT, clean feed — per display.
- **Color correction**: lift / gamma / gain / offset, contrast, hue/saturation, luma contribution.
- **System**: codec format, video format selection from supported lists.

### Recording workflow

- Digital slate for the next clip (scene, take, shot type, reel, lens, project metadata) with
  take increment and reset actions.
- Presets: list, apply, save current camera state as preset, delete (guarded).
- Media: working set, active media selection, clip list, guarded media format (typed confirmation).
- Livestream: platform selection, start/stop.

### User experience

- Notifications for important events: recording start/stop, storage/battery thresholds,
  connection loss/restore — non-intrusive toasts plus an event history panel.
- Saved workspaces: dockable panel layout that persists; multiple named layouts; fullscreen mode.
- Keyboard shortcuts for common actions (record, camera select, fullscreen, theme).
- Dark-first professional theme (light theme available).

## Architecture (v1)

```
LAN                          Node backend                     React frontend
┌──────────────┐   ┌──────────────────────────────────┐   ┌────────────────────┐
│ iPhone cam 1 │◄─►│ discovery (mDNS + manual)        │   │ WS state slices    │
│ iPhone cam 2 │◄─►│ connection mgr (REST+WS, TLS -k) │◄─►│ dockable workspace │
└──────────────┘   │ per-camera state store + caps    │   └────────────────────┘
                   │ REST proxy + WS multiplex        │
                   │ notifications, persistence       │
                   └──────────────────────────────────┘
```

- **Backend** (Node + Fastify + TypeScript): owns all camera connections (self-signed TLS is not
  browser-friendly), discovers devices, aggregates per-camera state seeded by a REST sweep and kept
  live by camera WebSocket events, proxies any REST endpoint transparently (future-proof for new
  API additions), derives notifications, persists cameras/workspaces/preferences.
- **Capability registry**: on connect, the backend pulls each camera's own OpenAPI documentation
  and marks endpoints the device does not implement, so the UI dims unsupported controls and adapts
  automatically to new API versions and to hardware differences.
- **Frontend** (React + Vite + TypeScript + Tailwind + shadcn/ui + zustand + dockview + sonner):
  dockable production-style workspace, per-camera state slices fed by backend WebSocket diffs,
  optimistic writes with rollback, confirmation guards on destructive actions.

## Deferred to v1.1 (architecture is pre-wired)

- **Live video preview**: the REST API does not expose a video feed. The Blackmagic Camera app can
  stream SRT/RTMP to a local media server (e.g. MediaMTX), which can serve WebRTC to the browser.
  The backend will orchestrate MediaMTX, generate the app's service XML for one-tap import, and the
  multiview tiles are designed to host video players.

## Non-goals (v1)

- No cloud sync, accounts, or mobile app.
- No on-camera file transfer/transcoding of recorded media.
