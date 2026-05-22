# File Inventory

Read and verified for the current local release build.

## Source files

- `package.json` - Vite/React/Electron project metadata, test/build scripts, and desktop packaging config.
- `index.html` - browser entry document with CueForge favicon.
- `public/favicon.svg` - small CueForge wave favicon used by Vite and GitHub Pages.
- `src/main.jsx` - full CueForge application: immersive setup journey, player trial, report lab, mic analyzer, EQ studio, game profiles, hearing model, system info, and Equalizer APO export logic.
- `src/audioData.js` - local IEM, Valorant, competitive FPS, balanced, and HyperX target data pulled from accessible workspace profiles.
- `src/audioData.test.js` - unit coverage for Equalizer APO export text and Valorant process metadata.
- `src/autoTune.js` - calibration curve generator for IEM/headset/game/mic preferences.
- `src/autoTune.test.js` - unit coverage for the generated 10-band autotune curve.
- `src/audioDna.js` - personal audio fingerprint generator.
- `src/audioDna.test.js` - unit coverage for Audio DNA confidence and identity output.
- `src/exportPack.js` - setup pack and text export helpers.
- `src/exportPack.test.js` - unit coverage for generated setup pack payloads.
- `src/reportPack.js` - redacted issue report builder, device summary redaction, and replay validation helpers.
- `src/reportPack.test.js` - unit coverage for report redaction, reproducible state, and validation.
- `src/setupReadiness.js` - player-test readiness scoring and blocker detection.
- `src/setupReadiness.test.js` - unit coverage for ready and blocked setup states.
- `src/playerTrial.js` - guided player test script, feedback scoring, and tester packet builder.
- `src/playerTrial.test.js` - unit coverage for trial steps, feedback scoring, and packet contents.
- `src/betaCheckIn.js` - anonymous beta tester check-ins, proof codes, active-day summary, and export packet builder.
- `src/betaCheckIn.test.js` - unit coverage for beta IDs, proofed check-ins, summaries, and privacy flags.
- `src/audioEvidence.js` - local opt-in audio evidence summary and export packet builder.
- `src/audioEvidence.test.js` - unit coverage for audio evidence summaries, caps, and raw-audio privacy flags.
- `src/communityHub.js` - Discord-first community signal summaries, roll calls, Reddit-safe drafts, setup share text, and redaction.
- `src/communityHub.test.js` - unit coverage for community feedback redaction, summaries, and outreach copy.
- `src/gameplaySave.js` - throttled gameplay save snapshots and lightweight performance-save settings.
- `src/gameplaySave.test.js` - unit coverage for snapshot bounds, trimming, and write throttling.
- `src/uiFeedback.js` - right-click developer UI notes with retrieval tags, area metadata, redaction, and summary helpers.
- `src/uiFeedback.test.js` - unit coverage for UI note redaction, caps, and summaries.
- `src/blindMatch.js` - A/B preference-learning tuner that converts choices into a personal EQ curve.
- `src/blindMatch.test.js` - unit coverage for Blind Match learned curves.
- `src/maskingLab.js` - game-audio masking stress-test and anti-masking EQ generator.
- `src/maskingLab.test.js` - unit coverage for masking score and tuning improvement.
- `src/signalAnalyzer.js` - CueForge signal analyzer for live mic buffers: spectral bands, clipping, noise, FPS clarity, comms readiness, likely-source diagnosis, and EQ nudges.
- `src/signalAnalyzer.test.js` - unit coverage for clipping, masking, usable signal, and empty analyzer output.
- `src/hearingModel.js` - personal hearing model helpers for tone results, compensation, scoring, and APO overlay generation.
- `src/hearingModel.test.js` - unit coverage for hearing model scoring and APO overlay generation.
- `src/styles.css` - complete responsive dark desktop-tool styling.
- `electron/main.mjs` - Electron desktop shell, permission handler, native Windows scan IPC, and safe APO draft IPC.
- `electron/preload.cjs` - locked-down desktop API exposed to the React app.
- `tools/Scan-AudioSetup.ps1` - optional user-run Windows audio setup scanner that writes a JSON report for import.
- `docs/ARCHITECTURE.md` - platform decision notes for web build and desktop shell.
- `docs/DRIVER_LAYER.md` - trusted companion driver/audio-layer strategy and rules.
- `docs/HIGH_END_ANALYZER_PLAN.md` - analyzer architecture, open-source audio stack options, and next build targets.
- `docs/MASTER_PLAN.md` - public roadmap, master map, workstreams, release timeline, and update 001 posting plan.
- `docs/SETUP_JOURNEY_DIRECTOR_SCRIPT.md` - cinematic direction, text-to-video prompt, negative prompt, and app integration notes for the panda bamboo soundwalk.
- `docs/PROMPT_BACKLOG_AUDIT.md` - checkpoint of covered, partially covered, and open requests from the build session.
- `docs/updates/2026-05-22-update-001.md` - first public update copy for Discord, X, and Reddit-safe profile posting.
- `docs/updates/2026-05-22-update-002.md` - Panda Notes update copy for the right-click UI debugger.
- `docs/DISCORD_FINAL_BUILDOUT.md` - live Discord status, roles, onboarding, bot strategy, and channel setup.
- `docs/DISCORD_SETUP.md` - Discord setup guide, welcome copy, onboarding state, and tester formats.
- `docs/SOCIAL_POSTING_PLAN.md` - social cadence, tag strategy, and update 001 image map.
- `docs/REDDIT_PROFILE_AND_OUTREACH.md` - Reddit profile, outreach guardrails, and filter-safe posting plan.
- `docs/RELEASE_CHECKLIST.md` - GitHub-ready hardening and release checklist.
- `docs/PRIVACY.md` - local data and redaction notes.
- `README.md` - product overview, run notes, setup flow, and testing workflow.

## Generated files

- `package-lock.json` - npm dependency lockfile generated by `npm.cmd install`, including Electron and Electron Builder.
- `dist/index.html` - production build entry.
- `dist/assets/index-*.js` - production JavaScript bundle.
- `dist/assets/index-*.css` - production CSS bundle.
- `docs/index.html`, `docs/assets/*`, and `docs/favicon.svg` - refreshed GitHub Pages build copied from `dist`.
- `tools/cueforge-audio-setup-report.json` - generated local Windows scan output. This is intentionally not included in the refreshed ZIP because it can contain local device IDs.
- `%APPDATA%/CueForge/cueforge-audio-setup-report.json` - desktop shell Windows scan output. This is local app data and not committed.
- `%APPDATA%/CueForge/apo-drafts/*.txt` - desktop shell APO draft exports. These are local app data and not committed.

## Verification

- `npm.cmd install` completed.
- `npm.cmd test` completed: 16 test files / 40 tests passed.
- `npm.cmd run build` completed.
- `npm.cmd run desktop:dir` completed and produced `release/win-unpacked/CueForge.exe`.
- `npm.cmd run desktop:package` completed and produced `release/CueForge-0.1.0-x64.exe`.
- Packaged desktop launch smoke completed: `CueForge.exe` started and stayed alive for 5 seconds, then was stopped.
- Electron bridge smoke completed: `window.cueforgeDesktop.info()` returned desktop metadata and `saveApoDraft()` wrote a timestamped APO draft in local app data.
- `npm.cmd audit --audit-level=moderate` completed with 0 vulnerabilities.
- Local server responded at `http://127.0.0.1:5177`.
- Browser workflow tested: setup journey, dashboard, mic analysis with IEM/HyperX sample text, EQ studio, local source profile tabs, game profiles, hearing model hardware targets, and system info page.
- Responsive overflow sweep tested Community Hub, Beta Check-in, Mic Lab, Driver Layer, and System Info at mobile, tablet, and desktop widths with no horizontal overflow offenders.
- Community Hub tested: draft staging, approval state, posted state, and clearing posted drafts through the UI.
- Driver Layer tested: browser fallback message for the desktop-only APO draft helper.
- Mic Lab tested: evidence-recorder CTA routes to Beta Check-in.
- Auto Self Test tested: browser audio APIs, device enumeration, bridge report, autotune generation, export payload generation, hearing model, storage, tone engine, and mic permission reporting.
- Personal Hearing Model tested: reset, heard/missed tone marking, progress update, compensation overlay, export control present.
- Auto Calibration tested: generate autotune, apply to EQ Studio, and confirm exported APO config updates.
- Audio DNA tested: fingerprint generation, save/export controls, and bridge/APO confidence signals.
- Blind Match tested: A/B choice flow, learned curve generation, save/export/apply controls.
- Tactical Masking Lab tested: scenario scoring, anti-masking EQ generation, export/apply controls.
- Report Lab tested: redacted report creation, preview, download path, import validation, and replay into EQ Studio.
- Setup Journey tested: first-run gear profile, device scan path, calibration direction, handoff into the app, and rerun setup control from System Info.
- Setup Journey 3D QA tested: desktop canvas nonblank and animated, click-to-start soundwalk status, final reflection stage, app handoff, no setup nav leak, mobile canvas nonblank, and no mobile horizontal overflow.
- Player Trial tested: five-step match script, step completion, feedback scoring, next-fix output, and tester packet export.
- Privacy hardening tested: report exports redact raw device IDs, group IDs, config paths, Windows paths, computer names, full user-agent strings, emails, and phone numbers.
- Optional Windows scanner ran and found Equalizer APO, SteelSeries GG/Sonar, and USB audio devices.
- Desktop EQ overflow issue found and fixed.
- Mobile viewport check completed at 390x844 with no horizontal overflow.

## Known boundary

The web build intentionally does not modify Windows audio drivers or headset firmware directly. It exports safe configuration text that can be used in tools such as Equalizer APO. The desktop shell can run native scans and save local APO draft files, but direct writes to real Windows or Equalizer APO locations still need explicit approval, backups, and a clear undo path.
