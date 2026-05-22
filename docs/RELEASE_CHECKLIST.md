# Release Checklist

Use this before pushing or sharing a tester build.

## Required Checks

```powershell
npm test
npm run build
npm audit --audit-level=moderate
npm run desktop
```

## May 22, 2026 Alpha Proof

- `npm test`: 16 files, 42 tests passed.
- `npm run build`: production build passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Windows portable package: `CueForge-0.1.0-x64.exe`.
- Desktop startup smoke: packaged `CueForge.exe` launched and responded.
- Public release: `v0.1.0-alpha.1`.
- Release asset SHA256: `B6A90EEA50D07B76B9E3F1BB561C594349A94F11E4131203701767DD81C87AB0`.
- Issue watch automation: active hourly triage for GitHub tester feedback and bugs.

## Manual Smoke Test

1. Open the app at `http://127.0.0.1:5177`.
2. Confirm a fresh browser profile lands on the standard `Audio Command Center`, not the cinematic setup flow.
3. Confirm private media-build materials are not visible in the public sidebar or bundled docs.
4. Run `Self Test`.
5. Create a redacted report from `Report Lab`.
6. Open `Report Lab` and confirm the report preview appears.
7. Open `Player Trial`, complete the five steps, and export a tester packet.
8. Open `EQ Studio` and confirm the Equalizer APO export includes 10 filters.
9. In the desktop shell, open `Auto Detect`, run `Run Windows scan`, and confirm a Windows bridge report loads.

## Privacy Check

Before sharing:

- Confirm `tools/cueforge-audio-setup-report.json` is not committed.
- Confirm release ZIPs do not include `tools/cueforge-audio-setup-report.json`.
- Confirm exported reports do not show raw device IDs, Windows paths, computer names, emails, or phone numbers.

## Platform Decision

Use the web build for controlled player testing and GitHub distribution.

Use the desktop shell when native device setup is required. Native writes must always be explicit, backed up, and reversible.
