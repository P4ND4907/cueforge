# CueForge Prompt Backlog Audit

Date: May 22, 2026.

This is a checkpoint against the major requests from the build session.

## Covered

- Local CueForge app rebuilt from the research task and renamed away from the old project identity.
- README, roadmap, privacy notes, release checklist, and outreach docs cleaned to sound human and project-owned.
- Live Mic Lab with mic level, voice presence, noise estimate, clip risk, spectral bands, FPS clarity, comms readiness, likely-source diagnosis, and tuning hints.
- Headphone/IEM test tones for left, right, center, and sweep.
- Auto Detect with browser device scan, auto-name fallback, optional Windows bridge report, and desktop-shell Windows scan.
- Equalizer APO export and export pack.
- Auto Calibration, Blind Match, Tactical Masking Lab, Audio DNA, Personal Hearing Model, Player Trial, Beta Check-in, Gameplay Save, and Report Lab.
- Panda Notes right-click UI feedback system with local-only notes that attach to redacted reports/export packs only when a tester chooses to send them.
- Privacy/redaction pass for raw device IDs, group IDs, paths, computer names, emails, phone numbers, and sensitive account info.
- Discord, Reddit, and X outreach plans, posting drafts, tag strategy, and community safety rules.
- Discord server planning docs, role/channel guidance, bot strategy, and moderation guardrails.
- High-end analyzer plan with open-source building blocks and the next desktop analyzer targets.
- First-run Setup Journey replacing the old setup screen with a 3D bamboo soundwalk, saved gear profile, device scan, calibration direction, and app handoff.
- Director script for the realistic panda bamboo pond cinematic.
- Public `docs/assets` build refreshed so GitHub Pages no longer serves the old setup bundle.
- Fresh live browser QA for the Setup Journey: desktop nonblank/animated 3D canvas, click-to-start soundwalk, reflection stage, app handoff, no setup nav leak, and mobile no-overflow check.

## Partially Covered

- Realistic panda cinematic: director script exists, and the app has a real-time Three.js bamboo fallback. A true photoreal video/render asset still needs to be generated or rendered and wired as the premium background.
- Desktop/native path: Electron shell exists and can run the Windows scan. Explicit driver writes, APO backup/apply, and Windows routing helpers are still future desktop work.
- High-end analyzer: browser analyzer is useful and tested, but the full "serious analyzer" still needs optional desktop clip analysis, FFmpeg/RNNoise-style evidence processing, and game-session separation.
- Social media rollout: drafts, profile copy, Reddit-safe strategy, and Discord docs exist. Actual posting into third-party communities should stay manual/mod-approved to avoid spam filters and account risk.
- Discord buildout: docs and bot strategy exist. Exact server role permissions, bot invites, and live settings still need visible account-level approval inside Discord.
- Gameplay logging: the app stores lightweight local snapshots and privacy-safe evidence summaries. It does not yet record raw gameplay or mic audio files by default.

## Still Open

- Add an opt-in local audio clip recorder/analyzer for testers who explicitly choose to record a short clip. It should never auto-upload and should make raw-audio privacy obvious.
- Package and smoke-test the Electron desktop shell as the recommended Windows build for players who need native scan/setup flow.
- Add the photoreal panda/bamboo/pond cinematic asset as `webm`/`mp4` with a reduced-motion fallback.
- Run a fresh privacy/export audit after the new setup profile fields are included in reports or export packs.
- Decide whether `setupReadiness.js` remains as a backend helper for tester readiness or gets retired now that the old setup UI is gone.
- If Discord bots are shipped, keep them permission-light and avoid self-bots, fake reward farming, auto-watchers, or spam automation.

## Safety Boundaries To Keep

- No stored passwords, phone numbers, DOB, recovery codes, or private account data in GitHub.
- No mass-posting the same promo body into Reddit communities.
- No hidden telemetry, hidden uploads, or silent audio recording.
- No silent driver installs, Windows routing changes, APO writes, or native changes without explicit user action, backup, and undo.
