# Electron Playwright QA

Desktop-shell smoke checks for packaged app startup, preload API exposure, navigation safety, and no blank-window regressions.

Run:

```powershell
npm.cmd run test:playwright:electron
```

The smoke launches `electron/main.mjs`, verifies the first meaningful CueForge screen, checks the locked preload bridge, and confirms desktop info points at CueForge-owned app data paths.
