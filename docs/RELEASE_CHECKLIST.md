# Release Checklist

Use this before pushing or sharing a tester build.

## Required Checks

```powershell
npm test
npm run build
npm audit --audit-level=moderate
npm run desktop
```

## Manual Smoke Test

1. Open the app at `http://127.0.0.1:5177`.
2. Confirm the immersive `Setup Journey` is the first screen for a fresh browser profile.
3. Run `Self Test`.
4. Create a redacted report from `Report Lab`.
5. Open `Report Lab` and confirm the report preview appears.
6. Open `Player Trial`, complete the five steps, and export a tester packet.
7. Open `EQ Studio` and confirm the Equalizer APO export includes 10 filters.
8. In the desktop shell, open `Auto Detect`, run `Run Windows scan`, and confirm a Windows bridge report loads.

## Privacy Check

Before sharing:

- Confirm `tools/cueforge-audio-setup-report.json` is not committed.
- Confirm release ZIPs do not include `tools/cueforge-audio-setup-report.json`.
- Confirm exported reports do not show raw device IDs, Windows paths, computer names, emails, or phone numbers.

## Platform Decision

Use the web build for controlled player testing and GitHub distribution.

Use the desktop shell when native device setup is required. Native writes must always be explicit, backed up, and reversible.
