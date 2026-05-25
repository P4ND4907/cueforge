# Release Checklist

Use this before pushing or sharing a tester build.

## Standard

The release bar is now: if a human can find it, the pre-release process has to learn it.

Six hours before a planned public update, publish a pre-release note draft for approval. It should sound like a real build log from the project owner: what changed, what is being tested, what testers should try, what is still risky, and what slipped into the next update. Public-facing copy should not mention internal tooling, automation, or AI.

Every tester-found issue must get:

1. A plain-language reproduction path.
2. The smallest useful fix.
3. A regression test when the behavior can be tested outside the browser.
4. Live browser proof of the player flow.
5. No console errors, no offscreen UI, no privacy leak, and no hidden Windows/audio change.
6. A repair-queue or release-note entry if testers already saw the bug.

Every product-facing feature also needs one CueForge Brain check: it should improve chain verification, personal sound identity, conflict warnings, game intent, safe export/apply, local evidence, or native-engine readiness. If it does not, keep it out of the main flow.

## Version Ship Bars

Before tagging a version, confirm the release label matches the product proof:

| Release | Theme | Minimum ship bar |
| --- | --- | --- |
| v0.2.0 | Foundations | Setup Command Center default, feature modules extracted, Playwright web + Electron smoke, hardware profile manifests, route graph schema. |
| v0.3.0 | Proof | WASAPI loopback helper, FFmpeg/libebur128 regression, conflict detector, latency/phase tests, feedback ingestion. |
| v0.4.0 | Production readiness | Nightly real-Windows Machine Play Lab, enforced release gates, checked-in swarm manifests, redaction audit, trustworthy user-facing assessment summaries. |

The tested contract is `src/data/releaseShipBars.js`; run `npm run validate:manifest` before calling a version ready.

## Release Candidate Acceptance

A release candidate does not ship unless the checked contract in `src/data/releaseAcceptanceChecklist.js` is green. This is stricter than an alpha scaffold.

Required RC proof:

- Setup Command Center is the default guided entry point.
- Auto Detect shows what is present, what is active, and what is conflicting.
- The Windows desktop shell can run a native scan and safely read the bridge report.
- Web smoke and Electron smoke both pass.
- At least one real Windows loopback regression run passes. The deterministic fixture policy is useful, but it is not a substitute for real endpoint loopback proof.
- Redacted reports contain no raw device IDs, usernames, local paths, emails, or phone numbers.
- APO draft export is explicit and reversible.
- Conflict rules catch APO + Sonar, Sonar + Discord effects, Voicemeeter loop/echo risk, and wrong default communications endpoint.
- Player-trial and audio-evidence packets stay local by default.
- Build metadata is visible enough to detect stale deploys.
- Release notes explain the Windows-first boundary and do not promise engine-level occlusion for arbitrary games.

Open limitations to preserve in public copy:

- Windows-first is the shortest trustworthy release path right now; macOS/Linux parity needs future Core Audio and PipeWire/ALSA backends.
- Public GitHub files are the external source of truth; local QA comments are directional until the matching files are pushed.
- CueForge improves the final audio chain, but arbitrary-game post-mix audio is not engine-native scene geometry or object occlusion.

Local metadata runs stay usable while this is blocked, but tag/release/manual release-candidate runs enforce it:

```powershell
$env:CUEFORGE_RELEASE_CANDIDATE="true"
$env:CUEFORGE_REAL_LOOPBACK_PROOF="true" # set only after the real Windows loopback regression evidence exists
npm.cmd run qa:release-readiness
```

## Required Checks

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-checks.ps1
```

The wrapper expands to `npm ci`, `npm test`, `npm run build`, manifest validation, fixture validation, harness tests, UI contract tests, desktop directory packaging, packaged desktop smoke, `npm audit --audit-level=moderate`, export redaction checks, screenshot smoke, and pre-release QA.

`npm run qa:vm-lab` writes `docs/repair/VIRTUAL_MACHINE_PLAYER_LAB.md` plus replayable JSON/notes for clean-machine player journeys. Use it before sharing a desktop or web build so first launch, setup import, mock gear chains, feature use, report creation, profile sharing, and packaged-app blank-screen risk get checked together.

`npm run qa:preflight` writes `docs/repair/PRE_RELEASE_QA_RUN.md` and blocks the release if tests/build/audit/privacy checks fail or if exported Panda Notes still contain repair actions.

Security and privacy are release blockers, not polish. The gate now starts with:

```powershell
npm test -- src/securityPrivacyGate.test.js src/exportFingerprints.test.js src/privacyAudit.test.js src/electronHardening.test.js
```

This verifies local-first export posture, redaction, hashed fingerprints, Electron hardening policy, native helper capability boundaries, and the non-medical hearing disclaimer. GitHub Actions runs the same gate in `.github/workflows/release-gate.yml`.

## Layered CI

GitHub Actions mirrors the local gate in four layers:

1. Fast path on Windows and Ubuntu: clean install, tests, build, native manifest validation, fixture validation.
2. Browser and harness on Windows: harness tests, UI contracts, screenshot smoke, screenshot artifacts.
3. Desktop shell on Windows: unpacked desktop build and packaged-app smoke.
4. Release gates on Windows: audit, redaction, pre-release QA, repair artifacts.

## May 22, 2026 Alpha Proof

- `npm test`: 30 files, 93 tests passed.
- `npm run build`: production build passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Windows portable package: `CueForge-0.1.0-x64.exe`.
- Desktop startup smoke: packaged `CueForge.exe` rendered from `app.asar`; the GitHub replacement build loaded `Audio Command Center`, 1 script, 1 stylesheet, and no runtime errors.
- Desktop package privacy smoke: generated Windows bridge reports were excluded; release resources include only `Scan-AudioSetup.ps1` under `tools`.
- Windows signing status: unsigned alpha (`Get-AuthenticodeSignature` returns `NotSigned`), so SmartScreen can appear until a signed public installer builds reputation.
- Public release: `v0.1.0-alpha.2`.
- Replaced GitHub asset SHA256: `8371FD9FF12AB795157302F681177D1BEDD214A967E1D5812F5CF010D84A2621`.
- The older broken GitHub asset SHA256 was `1F6CB510BE43EC940F994037F8CF3BF3660B629B35AA991A4411E176A196AEDD`; if that hash is in Downloads, delete it and download again.
- Issue watch automation: active hourly triage for GitHub tester feedback and bugs.
- Panda Notes repair watch: active every 10 minutes for exported notes and redacted reports.

## Manual Smoke Test

1. Open the app at `http://127.0.0.1:5177`.
2. Confirm a fresh browser profile lands on `Setup Command Center`, not the cinematic setup flow.
3. Confirm private media-build materials are not visible in the public sidebar or bundled docs.
4. Run `Self Test`.
5. Create a redacted report from `Report Lab`.
6. Open `Report Lab` and confirm the report preview appears.
7. Open `Player Trial`, complete the five steps, and export a tester packet.
8. Open `EQ Studio` and confirm the Equalizer APO export includes 10 filters.
9. In the desktop shell, open `Auto Detect`, run `Run Windows scan`, and confirm a Windows bridge report loads.
10. Open `Settings`, confirm Quiet mode is on by default, background soundwalk is off, and cinematic video audio is off.
11. Right-click the top-left, center, bottom-right, and mobile-width areas; Panda Note must stay inside the window and remain typeable.
12. Save one Panda Note, export notes, run `npm run notes:repair`, and verify the note becomes a repair queue item.

## Privacy Check

Before sharing:

- Confirm `tools/cueforge-audio-setup-report.json` is not committed.
- Confirm desktop packages do not include generated `tools/cueforge-audio-setup-report.json`.
- Confirm exported reports do not show raw device IDs, Windows paths, computer names, emails, or phone numbers.

## Platform Decision

Use the web build for controlled player testing and GitHub distribution.

Use the desktop shell when native device setup is required. Native writes must always be explicit, backed up, and reversible.
