# PixelDesk

Retro pixel-art RPG file organizer for Windows (Electron + TypeScript).

    npm install
    npm test         # unit + real-filesystem tests
    npm run typecheck
    npm start        # build + launch
    npm run dist     # Windows installer (electron-builder)

Optional fonts: see assets/fonts/README.txt

## Safety model
- Only folders picked in the native folder dialog are ever scanned (top level only, no symlinks followed).
- Drives, system folders and UNC paths are rejected.
- Scanning is read-only. Moves happen only after a native confirmation dialog the renderer cannot bypass.
- Never overwrites: hard-link/EXCL-copy, verify, then remove the old name. Name clashes get "(1)", "(2)"...
- Every sort is saved to the Journal and can be undone (also confirmed, also non-overwriting).
- Electron: contextIsolation on, nodeIntegration off, sandbox on, strict CSP, navigation blocked,
  typed + validated IPC, sender-frame check, restricted preload API.
