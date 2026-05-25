# CueForge Copilot Instructions

CueForge is a local-first Windows audio test lab for players using IEMs, headsets, USB mics, Discord, Equalizer APO, Peace, Sonar, and real-world audio chains that never behave perfectly.

## Non-Negotiables

- Do not add hidden telemetry, silent uploads, silent recording, or account-data capture.
- Do not silently install drivers, change Windows routing, or write directly into Equalizer APO system locations.
- Native desktop actions must be explicit, user-clicked, backed up or draft-only, and reversible.
- Browser mode must keep the security boundary clear: it can use Web Audio and browser permissions, but it cannot run native Windows scans.
- Desktop mode uses Electron with `contextIsolation: true`, `nodeIntegration: false`, and a narrow preload API.
- Keep raw device IDs, group IDs, local paths, emails, phone numbers, tokens, passwords, and recovery codes out of exported reports.
- Prefer small pure helpers with tests for logic. Keep React UI changes thin and player-facing.

## Current Desktop Foundation

- `electron/main.mjs` owns native IPC, Windows scan execution, external link handling, and APO draft file creation.
- `electron/preload.cjs` exposes only `window.cueforgeDesktop`.
- `tools/Scan-AudioSetup.ps1` creates a local bridge report.
- `src/desktopBridgePlan.js` explains the browser warning and desktop fix path.
- `src/privacyAudit.js` must pass before sharing any report/update.
- `src/issuePatternMemory.js` learns recurring problem patterns locally and suggests reviewed debug playbooks.

## Build Commands

```powershell
npm install
npm test
npm run build
npm run desktop
npm run desktop:dir
npm run desktop:package
npm audit --audit-level=moderate
```

## Definition Of Done

- Unit tests pass.
- Production build passes.
- If Electron/native code changed, desktop shell opens and `window.cueforgeDesktop.info()` returns metadata.
- Auto Detect can run or explain the Windows scan.
- Driver Layer saves an APO draft only inside CueForge app data.
- Privacy Export Audit passes.
- The app copy stays honest about browser versus desktop limits.
