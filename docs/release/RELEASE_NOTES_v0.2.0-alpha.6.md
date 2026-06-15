# CueForge v0.2.0-alpha.6

Pre-release Windows tester build focused on audio export QA, safer public links, and keeping the latest desktop build aligned with the web app.

## Highlights

- Added a reusable audio ingest manifest so CueForge can gate Sound Match previews, learned EQ exports, OBS/stream checks, headset/IEM test tones, and voice/comms clips from one command.
- Moved CI loudness measurement into `tools/Measure-AudioIngestMetrics.py` instead of keeping Python inline inside GitHub Actions.
- Updated the GitHub Actions audio ingest gate to run the same manifest command used locally.
- Upgraded Vite and the React plugin to clear the high Dependabot audit path while preserving production builds.
- Updated public app, release, issue-template, and social-link surfaces to point at `v0.2.0-alpha.6`.

## Safety Boundary

- Local-first behavior stays intact.
- No fake buttons.
- No hidden native routing.
- No silent driver changes.
- No unsafe preset behavior.
- No raw audio storage.
- Desktop alpha remains unsigned and should be described as a tester build.

## Windows Asset

- File: `CueForge-0.2.0-alpha.6-x64.exe`
- SHA256: `7DD86C43884257AA64E52D6ABBBF70F8476F4D32018491149DC6EB7209A710CD`

## Verified

- `npm test`
- `npm run validate:fixtures`
- `npm run validate:manifest`
- `npm run test:harness`
- `npm run test:ui`
- `npm run export:redaction-check`
- `npm run build`
- `npm run qa:audio-ingest -- --manifest qa/audio/export-manifest.json --output-dir qa/audio/ci --summary-json qa/audio/ci/audio-ingest-summary.json`
- `npm run test:playwright:web`
- `npm run test:desktop-smoke`
- `npm run desktop:package`
