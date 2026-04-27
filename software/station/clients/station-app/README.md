# @normacore/station-app

Desktop wrapper for station-viewer. Electron shell, zero UI duplication.

## Quick Start

```bash
# prereqs: node >=22, station backend running on :8889
yarn install

# dev mode — loads Vite dev server (start station-viewer first)
cd ../station-viewer && yarn dev   # terminal 1
cd station-app && yarn dev         # terminal 2 (opens Electron → localhost:5173)

# prod mode — loads built dist
cd ../station-viewer && yarn build
yarn start   # loads station-viewer/dist via file://
```

## Build & Package

```bash
yarn build          # tsc → dist/
yarn package:mac    # electron-builder → release/
```

## Architecture

```
station-app (Electron)
  ↓ loads
station-viewer (React/Vite)
  ↓ connects
station backend (ws://127.0.0.1:8889/api)
```

- **Dev:** Electron → `http://localhost:5173` (Vite HMR)
- **Prod:** Electron → `station-viewer/dist/index.html` (`file://`)
- **Router:** Auto-detects `file://` → `HashRouter`, otherwise `BrowserRouter`
- **Backend URL:** Injected via `window.stationDesktop.backendUrl` (preload bridge)

## Files

```
src/
  main.ts       # Electron main process
  preload.ts    # contextBridge — exposes stationDesktop API
  types.d.ts    # TS declarations
```

## Config

Backend defaults to `ws://127.0.0.1:8889/api`. Override later via config persistence (Phase 3).

## Stack

- Electron 35
- TypeScript 5.9
- electron-builder
