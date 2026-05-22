# CueForge

**Make your game audio less of a guessing game.**

CueForge is a Windows-first gaming audio control center for players who want their game sound, comms, mic, and EQ setup to make sense. It gives players a repeatable way to set up their chain, test a match, clean up a mic, tune for competitive games, build hearing-aware EQ, and export Equalizer APO configs.

It does not silently install drivers or rewrite Windows audio routing. It makes the hidden parts visible, generates configs, and keeps the final system-level apply step explicit.

## Tester Call

CueForge needs honest ears on real setups. If you play FPS games on Windows and have ever wondered whether your footsteps, comms, mic, or IEM EQ are helping or hurting you, you are exactly the kind of tester this needs.

The best testers are players using IEMs, gaming headsets, USB mics, Equalizer APO, Peace, SteelSeries Sonar, Discord, or similar audio chains.

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

## Public Roadmap

The big-picture plan lives here:

- [Master Plan](docs/MASTER_PLAN.md)
- [Tester Guide](docs/TESTER_GUIDE.md)
- [Privacy Notes](docs/PRIVACY.md)
- [Analyzer Plan](docs/HIGH_END_ANALYZER_PLAN.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

The roadmap breaks CueForge into five workstreams: player testing, audio engine, game intelligence, community loop, and release system. It also includes the May-July 2026 release timeline and the first public update pack.

## Platform Direction

The current web build is the right foundation for safe testing, tuning, feedback capture, and GitHub distribution. The right way around browser limits is a desktop app shell, not a browser workaround.

- Keep the web build for player trials, report replay, EQ generation, and privacy-safe exports.
- Use the Windows desktop shell for one-click local setup scanning, native device detection, and safe Equalizer APO draft exports.
- Keep every native action explicit: show the planned change, require a user click, write a backup, then apply.

## What It Does

- Immersive Setup Journey, a standalone first-run bamboo soundwalk with a 3D Three.js scene, click-to-start Web Audio bed, gear profile, device scan, calibration direction, and clean handoff into the main app.
- Community Hub for Discord-first roll calls, this-or-that tester input, X/Reddit post drafts, an approval queue, and local signal summaries.
- Player Trial with a repeatable match script, post-match ratings, next-fix recommendations, and an exportable tester packet.
- Beta Check-in with anonymous local tester IDs, proof codes, active-day counts, opt-in 12-second local mic evidence, and exportable packets for real beta feedback without hidden telemetry.
- Gameplay Save with throttled local snapshots and a performance mode that keeps live meters lighter during matches.
- Panda Notes, a right-click UI debugger for tagging confusing text, broken-feeling controls, layout issues, missing feedback, slow spots, and ideas. Notes stay local and attach only to reports/export packs the tester chooses to send.
- Auto Self Test for browser audio APIs, devices, Windows bridge report, autotune, hearing model, storage, tone engine, and mic permission.
- Auto Detect for browser audio devices plus an optional Windows bridge report.
- Auto Detect copy/paste setup kit for Discord, Reddit, GitHub issues, and beta check-ins without raw device IDs.
- Driver Layer for detecting trusted companion audio layers such as Equalizer APO, Peace, Sonar, VB-CABLE, and Voicemeeter without silently changing routing.
- Live Mic Lab with level, voice presence, noise estimate, clip risk, spectral bands, FPS clarity, comms readiness, tuning confidence, likely-source diagnosis, and conservative EQ nudges.
- IEM/headphone checks for left, right, center, and sweep testing.
- Auto Calibration wizard for output target, game focus, treble sensitivity, bass preference, footstep focus, and mic boom/noise.
- Blind Match tuner that learns a personal EQ curve from A/B choices instead of presets.
- Tactical Masking Lab that stress-tests footsteps, comms, and IEM sharpness against masking scenarios.
- Report Lab for real player testing: create redacted issue reports, import them later, and replay the exact EQ/game/source/mic state that caused a problem.
- EQ Studio with 10-band editing, local source profiles, and Equalizer APO export.
- Export Pack that downloads setup instructions, APO config, calibration data, hearing profile, and Audio DNA snapshot.
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

It also adds a safer APO apply lane: `Driver Layer` can save the current Equalizer APO text as a timestamped draft inside CueForge's app-data folder and open that folder. The player still reviews and pastes the config into Equalizer APO or Peace.

Native actions are still explicit. CueForge does not silently install drivers, change Windows routing, or rewrite Equalizer APO configs in the background.

Build a local unpacked desktop folder or portable Windows package:

```powershell
npm run desktop:dir
npm run desktop:package
```

Local packages are unsigned developer builds right now. A public installer should add real Windows code signing before broad distribution.

## Optional Windows Bridge

Run this if you want the app to see installed tools and Windows audio devices:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Scan-AudioSetup.ps1
```

Then open `Auto Detect` and click `Load generated bridge report`.

The generated bridge report is local machine data. It is ignored by Git and excluded from release ZIPs.

## Best Setup Path

1. Start with the first-run Setup Journey, enter the gear profile, scan devices, and set the first calibration direction.
2. Open `Self Test` and run the full auto test.
3. Open `Auto Detect`, allow microphone permission if prompted, and load the generated bridge report.
4. Open `Mic Lab`, start live mic feedback, speak into the mic, and watch level/noise/clip risk.
5. Use `Left`, `Right`, `Center`, and `Sweep` to check channel balance and harsh peaks.
6. Open `Hearing Model`, keep volume low, test left/right ears, and export the hearing profile.
7. Open `Calibration`, generate autotune, and apply it to EQ Studio.
8. Open `Blind Match`, run the A/B rounds, and apply the learned curve.
9. Open `Masking Lab`, pick a scenario, and apply the anti-masking curve.
10. Open `Player Trial`, run the guided match script, fill the ratings, and export the tester packet.
11. Open `Beta Check-in`, record a short opt-in evidence clip if the tester agrees, and export the local evidence JSON.
12. Open `Report Lab`, create a redacted report, download it, import it back, and replay it into the app.
13. Open `Audio DNA`, save the fingerprint after you like the result.
14. Open `EQ Studio`, export the Equalizer APO config, and paste it into Equalizer APO or Peace.
15. In the desktop shell, open `Driver Layer` and save an APO draft if you want a native folder-based handoff.
16. Use `Export Pack` when you want the full setup bundle instead of a single config.

To run setup again later, open `System Info` and click `Rerun setup`.

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
npm test
npm run build
npm audit --audit-level=moderate
```

Also verify that `tools/cueforge-audio-setup-report.json` is not committed or included in public release files.
