# CueForge

**Make your game audio less of a guessing game.**

CueForge is a Windows-first audio chain verifier and personal sound engine for players who want their game sound, comms, mic, and EQ setup to make sense. It gives players a repeatable way to prove their chain, learn their own sound preference, test a match, clean up a mic, tune by game intent, build hearing-aware EQ, and export Equalizer APO configs.

It does not silently install drivers or rewrite Windows audio routing. It makes the hidden parts visible, generates configs, and keeps the final system-level apply step explicit.

## Why CueForge

Big audio companies have polished apps, device partnerships, and finished presets. CueForge is different on purpose: it is a local-first chain verifier plus personal sound engine for players who want to know what is actually happening in their setup.

- It starts from the real chain: game, Windows, Discord, mic gain, headset/IEM, EQ, and optional desktop bridge data.
- It uses the CueForge Brain to connect chain proof, personal preference, conflict warnings, game intent, safe export/apply, local evidence, and native-engine readiness.
- It turns one real match into useful evidence through Player Trial, Beta Check-in, Report Lab, and Panda Notes.
- It keeps native changes explicit instead of silently touching drivers or routing.
- It gives testers a direct repair loop: clear reports become reproducible issues, tests, fixes, and release notes.

The promise is simple: import or auto-detect your setup, run one real match, and tell us what got better or worse.

## Tester Call

CueForge needs honest ears on real setups. If you play FPS games on Windows and have ever wondered whether your footsteps, comms, mic, or IEM EQ are helping or hurting you, you are exactly the kind of tester this needs.

The best testers are players with real, messy setups: headsets, IEMs, USB mics, Discord, Equalizer APO, Peace, Sonar, Windows routing, or anything else that makes audio harder than it should be.

Good feedback includes:

- What game was tested.
- What headset/IEM/mic was used.
- Whether footsteps, direction, comms, mic quality, or comfort improved.
- Which Discord/X/Reddit signal it came from if the note came through the community hub.
- A redacted Report Lab JSON when something breaks.
- A Player Trial packet after a match session.

Use GitHub issues for feedback:

- Bug or broken flow: open a Bug Report.
- Tuning impressions: open Player Feedback.
- Privacy concern: open Privacy / Redaction Review.

## Public Alpha

- Web app: https://p4nd4907.github.io/cueforge/
- Latest Windows alpha release: https://github.com/P4ND4907/cueforge/releases/latest
- Feedback thread: https://github.com/P4ND4907/cueforge/issues/1

The Windows alpha is unsigned while CueForge builds reputation, so Windows may show `Windows protected your PC`. That prompt is expected for an unsigned alpha, not proof that the app is broken. Only run builds from the official GitHub release; if you trust that download, choose `More info` and then `Run anyway`. Use the web app first if you want the lightest test.

If the Windows app opens to a blank dark window, delete the old download and download again from the release page. The fixed `v0.1.0-alpha.2` asset SHA256 is `8371FD9FF12AB795157302F681177D1BEDD214A967E1D5812F5CF010D84A2621`.

## Public Roadmap

The big-picture plan lives here:

- [Master Plan](docs/MASTER_PLAN.md)
- [CueForge Differentiator](docs/CUEFORGE_DIFFERENTIATOR.md)
- [Tester Guide](docs/TESTER_GUIDE.md)
- [Privacy Notes](docs/PRIVACY.md)
- [Analyzer Plan](docs/HIGH_END_ANALYZER_PLAN.md)
- [Open-Source Stack](docs/OPEN_SOURCE_STACK.md)
- [Security Privacy Release Gate](docs/SECURITY_PRIVACY_RELEASE_GATE.md)
- [Native Engine Roadmap](docs/NATIVE_ENGINE_ROADMAP.md)
- [SOTA Gap Analysis](docs/research/STATE_OF_ART_GAP_ANALYSIS.md)
- [Codex Next Steps](docs/prompts/CODEX_NEXT_STEPS.md)
- [GitHub Copilot Desktop Foundation Prompts](docs/prompts/GITHUB_COPILOT_DESKTOP_FOUNDATION.md)
- [v0.2.0 Acceptance Checklist](docs/ACCEPTANCE_CHECKLIST_v0.2.0.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

The roadmap breaks CueForge into five workstreams: player testing, audio engine, game intelligence, community loop, and release system. It also includes the May-July 2026 release timeline and the first public update pack.

## Developer Architecture

CueForge v0.2.0-alpha.3 now has a formal foundation layer for the next desktop/native work:

- `src/app/routes` holds route-level app surfaces such as Command Center, Auto Detect, Self Test, Hearing, Blind Match, Masking Lab, Report Lab, and Player Trial.
- `src/core/chain`, `src/core/scoring`, `src/core/manifests`, and `src/core/exports` expose stable adapters around the current chain graph, readiness, native manifest, and report/export policy.
- `src/detection` separates browser device collection, desktop bridge evidence, and routing heuristics.
- `src/lab` contains offline fixtures, signal generators, and harness helpers for repeatable test sessions.
- `src/native` is reserved for the Electron bridge and future helper contracts. Native actions still require explicit player approval.
- `src/securityPrivacyGate.js` and `.github/workflows/release-gate.yml` keep local-first privacy, Electron hardening, hashed export fingerprints, and native capability rules release-blocking.
- `tools/run-checks.ps1` is the quick release gate: tests, production build, dependency audit, and pre-release QA.

Use [Architecture](docs/ARCHITECTURE.md), [State v2 Contract](docs/STATE_V2_CONTRACT.md), [Runbook](docs/RUNBOOK.md), and [Test Matrix](docs/TEST_MATRIX.md) before adding new modules.

## Platform Direction

The current web build is the right foundation for safe testing, tuning, feedback capture, and GitHub distribution. The right way around browser limits is a desktop app shell, not a browser workaround.

- Keep the web build for player trials, report replay, EQ generation, and privacy-safe exports.
- Use the Windows desktop shell for one-click local setup scanning, native device detection, and safe Equalizer APO draft exports.
- Keep every native action explicit: show the planned change, require a user click, write a backup, then apply.
- Follow the native engine ladder: v0.3 offline DSP sandbox, v0.4 desktop preview, v0.5 Windows user-mode research, v0.6 mic pack, v0.7 spatial research, v1.0 signed public beta.

## What v0.2.0 Will Not Build

CueForge needs trust more than flashy promises. These stay blocked for the Seamless Engine Foundation:

- Kernel-mode driver.
- Full custom APO installer.
- Auto-routing changes.
- Always-on background service.
- Cloud AI personalization.
- Aggressive pitch shifting.
- Real-money paid unlocks.
- Game memory reading.
- Anti-cheat-adjacent hooks.
- Claims that CueForge can hear exact enemy positions automatically.

The product should stay honest: no hidden driver changes, no sketchy anti-cheat risk, and no fake "AI hears enemies" claims.

## What It Does

- Optional Setup Journey, a standalone bamboo soundwalk with a 3D Three.js scene, click-to-start Web Audio bed, gear profile, device scan, calibration direction, and clean handoff back into the main app.
- Community Hub for Discord-first roll calls, this-or-that tester input, X/Reddit post drafts, an approval queue, and local signal summaries.
- Player Trial with a repeatable match script, post-match ratings, next-fix recommendations, and an exportable tester packet.
- Beta Check-in with anonymous local tester IDs, proof codes, active-day counts, opt-in 12-second local mic evidence, and exportable packets for real beta feedback without hidden telemetry.
- Gameplay Save with throttled local snapshots and a performance mode that keeps live meters lighter during matches.
- Panda Notes, a right-click UI debugger for tagging confusing text, broken-feeling controls, layout issues, missing feedback, slow spots, and ideas. Notes stay local and attach only to reports/export packs the tester chooses to send.
- Panda Notes inbox in System Info for review, fixed/needs-retest states, repair packets, and verified cleanup.
- Panda Notes repair runner for exported notes and redacted reports: `npm run notes:repair` writes `docs/repair/PANDA_NOTES_REPAIR_QUEUE.md` and `docs/repair/PANDA_NOTES_REPAIR_PACKET.txt`.
- Pre-release QA gate: `npm run qa:preflight` runs tests, build, repair queue, audit, privacy checks, and writes `docs/repair/PRE_RELEASE_QA_RUN.md`.
- Shared safety rules for max boost, hearing-model boost, treble boost, required preamp headroom, limiter ceiling, click-to-play tones, and visible hearing warnings.
- CueForge Brain for scoring the product promise across chain verification, personal sound identity, conflict warnings, game intent, safe export/apply, local evidence, and native-engine readiness.
- Virtual machine player lab: `npm run qa:vm-lab` runs clean-machine player journeys with mocked IEM/DAC, headset, standalone mic, virtual mixer, Sonar, APO, and OEM-enhancer setups. It writes detailed results and Panda Notes to `docs/repair/VIRTUAL_MACHINE_PLAYER_LAB.md`.
- Shortcut Vault in System Info for saving player links/actions while locking code-like shortcuts so public copy and export packs stay redacted.
- Permission recovery cards that explain how to fix blocked, skipped, unsupported, or granted mic/device states without pretending the browser can be bypassed.
- Auto Self Test for browser audio APIs, devices, Windows bridge report, autotune, privacy export audit, hearing model, storage, tone engine, and mic permission.
- Auto Detect for browser audio devices plus an optional Windows bridge report.
- Setup Intelligence in Auto Detect that turns detected/imported gear into a game focus, budget lane, companion-layer warnings, and a copyable setup plan.
- Auto Detect copy/paste setup kit for Discord, Reddit, GitHub issues, and beta check-ins without raw device IDs.
- Privacy Export Audit in System Info for checking reports, setup summaries, self-test logs, Panda Notes, and export packs before sharing an update.
- Target-Gated Release Queue in System Info so new builds stay queued until tester counts and proof gates are both ready.
- Issue Pattern Memory that groups repeated setup, mic, routing, game/session, masking, IEM fatigue, UI, privacy, and performance problems into local debug playbooks for future automation.
- Driver Layer for detecting trusted companion audio layers such as Equalizer APO, Peace, Sonar, FxSound/OEM enhancers, Dolby/DTS/THX spatial layers, mic processors, VB-CABLE, and Voicemeeter without silently changing routing.
- Live Mic Lab with level, voice presence, noise estimate, clip risk, spectral bands, FPS clarity, comms readiness, tuning confidence, likely-source diagnosis, and conservative EQ nudges.
- Real WAV feature extraction foundation for PCM decode, STFT/FFT, band energy, transient score, stereo pan/width, temporal evidence, echo-scene inference, scene graph, EQ decision, and coach output.
- Sound-scene intelligence guardrails that separate post-mix inference from true game-world metadata.
- IEM/headphone checks for left, right, center, and sweep testing.
- Auto Calibration wizard for output target, game focus, treble sensitivity, bass preference, footstep focus, and mic boom/noise.
- Sound Match, the this-or-that ear test that learns a personal EQ curve and hidden preference model for EQ, dynamics, and spatial recommendations.
- Tactical Masking Lab that stress-tests footsteps, comms, and IEM sharpness against masking scenarios.
- Report Lab for real player testing: create redacted issue reports, import them later, and replay the exact EQ/game/source/mic state that caused a problem.
- EQ Studio with 10-band editing, local source profiles, and Equalizer APO export.
- Export Pack that downloads setup instructions, APO config, calibration data, hearing profile, Audio DNA snapshot, and safe shortcuts with locked code redaction.
- Personal Hearing Model with left/right tone checks, saved results, compensation overlay, and JSON export.
- Audio DNA, a saved fingerprint of EQ shape, hearing progress, device confidence, mic chain, and game focus.

## Run

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5177
```

Public page:

```text
https://p4nd4907.github.io/cueforge/
```

## Desktop Shell

Use the desktop shell when you want CueForge to handle the Windows bridge step from inside the app:

```powershell
npm run desktop
```

The desktop shell wraps the same CueForge UI, grants mic permission inside the app window, and adds a native Auto Detect action that runs the local Windows audio scan. It reads device/tool information and writes a local bridge report under the app data folder.

The scanner looks for Windows audio endpoints and common companion layers: Equalizer APO, Peace, SteelSeries Sonar, FxSound, Razer THX/Synapse, Dolby Access/Atmos, DTS Sound Unbound, Nahimic, Realtek Audio Console, NVIDIA Broadcast, Elgato Wave Link, Logitech G HUB, Corsair iCUE, Voicemod, VB-CABLE, and Voicemeeter. If Windows exposes the device/app cleanly, CueForge labels it; if not, the app marks the recommendation as starter guidance instead of pretending it is proven.

It also adds a safer APO apply lane: `Driver Layer` can save the current Equalizer APO text as a timestamped draft inside CueForge's app-data folder and open that folder. The player still reviews and pastes the config into Equalizer APO or Peace.

Native actions are still explicit. CueForge does not silently install drivers, change Windows routing, or rewrite Equalizer APO configs in the background.

Open `Settings` when the setup has too much going on. CueForge starts in quiet mode: background soundwalk audio and cinematic video audio are off by default, while mic feedback and headphone tests still require direct button clicks.

If Self Test shows `WARN - Desktop bridge availability` in the web app, that is expected. The fix is to run CueForge as the desktop app:

```powershell
npm run desktop
```

Then open `Auto Detect`, click `Run Windows scan`, and rerun `Self Test`. For GitHub Copilot or VS Code work on the desktop foundation, use `.github/copilot-instructions.md` and `docs/prompts/GITHUB_COPILOT_DESKTOP_FOUNDATION.md`.

Build a local unpacked desktop folder or portable Windows package:

```powershell
npm run desktop:dir
npm run desktop:package
```

Local packages are unsigned developer builds right now. A public installer should add real Windows code signing before broad distribution. Release packaging intentionally includes only the desktop UI, Electron bridge, and `tools/Scan-AudioSetup.ps1`; generated Windows scan reports stay in the user's app-data folder and must not be bundled into public downloads.

Desktop smoke coverage is now automated:

```powershell
npm run test:playwright:electron
npm run test:desktop-smoke
```

The Electron smoke launches the built app, checks the first window, verifies the preload bridge API, confirms desktop info resolves to CueForge-owned app data, and fails on startup console/resource errors.

## Optional Windows Bridge

Run this if you want the app to see installed tools and Windows audio devices:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Scan-AudioSetup.ps1
```

Then open `Auto Detect` and click `Load generated bridge report`.

The generated bridge report is local machine data. It is ignored by Git and excluded from release ZIPs.

## Best Setup Path

1. Open `Self Test` and run the full auto test.
2. Open `Auto Detect`, allow microphone permission if prompted, and import or auto-detect your setup.
3. In `Auto Detect`, use `Setup Intelligence` to choose a game focus and budget lane, then copy/export the setup plan.
4. Open `Mic Lab`, start live mic feedback, speak into the mic, and watch level/noise/clip risk.
5. Use `Left`, `Right`, `Center`, and `Sweep` to check channel balance and harsh peaks.
6. Open `Hearing Model`, keep volume low, test left/right ears, and export the hearing profile.
7. Open `Calibration`, generate autotune, and apply it to EQ Studio.
8. Open `Sound Match`, run the this-or-that rounds, and apply the learned curve.
9. Open `Masking Lab`, pick a scenario, and apply the anti-masking curve.
10. Open `Player Trial`, run the guided match script, fill the ratings, and export the tester packet.
11. Open `Beta Check-in`, record a short opt-in evidence clip if the tester agrees, and export the local evidence JSON.
12. Open `Report Lab`, create a redacted report, download it, import it back, and replay it into the app.
13. Open `System Info`, check `Issue Pattern Memory`, run `Privacy Export Audit`, and clear or mark Panda Notes before sharing a tester update.
14. Open `Audio DNA`, save the fingerprint after you like the result.
15. Open `EQ Studio`, export the Equalizer APO config, and paste it into Equalizer APO or Peace.
16. In the desktop shell, open `Driver Layer` and save an APO draft if you want a native folder-based handoff.
17. Use `Export Pack` when you want the full setup bundle instead of a single config.

To run the cinematic setup flow later, open `System Info` and click `Rerun setup`.

## Player Test Reports

Use `Report Lab` during real player tests. It exports a redacted JSON report with the active EQ curve, selected game profile, source profile, analyzer notes, browser audio capability flags, sanitized device summary, and latest self-test results. Importing that same file restores the reproducible state so the issue can be debugged and fixed without guessing from screenshots.

Report exports strip raw device IDs, group IDs, Windows paths, computer names, config paths, full browser user-agent strings, emails, and phone numbers before download.

## Player Trial Packets

Use `Player Trial` after tuning. It gives every tester the same five-step match script, captures ratings for footsteps, direction, comms, mic quality, and comfort, then exports a JSON tester packet with readiness state, feedback score, next-fix recommendations, EQ state, selected game, source profile, and the latest redacted issue report.

## Troubleshooting

- Hidden device names: allow microphone permission from the browser address bar, reload, and scan again.
- No mic movement: set the HyperX mic as the default Windows input, then reload.
- Clip risk high: lower Windows input gain or Discord input sensitivity.
- IEM sounds harsh: reduce 4kHz/8kHz by 1-2dB or increase treble sensitivity in Calibration.
- Autotune sounds thin: raise bass preference by 1-2 points.
- Equalizer APO not affecting sound: open Configurator and ensure APO is installed on the actual output device.
- Sonar active: check whether Sonar routes audio through a virtual device before applying APO to physical output.

## Safety Boundary

The browser app cannot silently install drivers, change firmware, or rewrite Windows routing. That is intentional. The useful path is:

1. Detect and test in the app.
2. Export readable config.
3. Apply explicitly in Equalizer APO, Peace, Sonar, or the CueForge desktop shell's reviewed APO draft flow.

## GitHub Release Check

Before sharing a build:

```powershell
npm test -- src/tests/v020Acceptance.test.js
npm test -- src/tests/releaseScenarios.test.js
npm test
npm run qa:vm-lab -- --count 25 --featureDepth 9
npm run qa:preflight
npm run build
npm audit --audit-level=moderate
```

The release scenario gate covers clean beginner setup, proven APO setup, Sonar + APO, Voicemeeter + VB-CABLE, treble-sensitive competitive tuning, night mode, incomplete hearing-model safety, and privacy-safe report/export payloads.

Also verify that `tools/cueforge-audio-setup-report.json` is not committed or included in public release files.
