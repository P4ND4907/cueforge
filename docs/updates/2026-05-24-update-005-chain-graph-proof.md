# CueForge Update 005 - Chain Graph And Release Proof

Date: May 24, 2026

## Headline

CueForge is becoming a guided audio chain verifier and personal sound engine for gamers.

This update is about trust. The goal is not to sound louder or sell a magic preset. The goal is to show what the player's setup is doing, catch conflicts, recommend the next safe step, and prove changes with real testing.

## What Changed

- Release-candidate acceptance now has a real proof gate.
- Release readiness can pass local checks while still marking public release as blocked until real Windows loopback proof exists.
- Worktree cleanup now has a lane audit so older sprint work is not accidentally reverted or mixed into the wrong release.
- Social copy now tells the same story across Discord, X, Reddit, and GitHub.
- The next public angle is Chain Graph + Setup Command Center, not another generic EQ update.

## Current Proof

- `npm test`: 75 files / 289 tests passed.
- `npm run validate:manifest`: passed.
- `npm run export:redaction-check`: passed.
- `npm run qa:preflight`: passed.
- `npm audit --audit-level=moderate`: clean.
- Release-candidate gate: intentionally blocked until real Windows loopback proof passes.

## Timeline

- May 24-25: social/profile refresh and owned-channel update.
- May 25-27: first-time setup hardening and copy cleanup.
- May 27-31: `v0.2.0-alpha.4` candidate if chain graph, Auto Detect v2, readiness v2, and release gates stay green.
- Early June: native proof sprint for WASAPI/miniaudio loopback and fixture-driven audio metrics.
- Mid June: desktop preview candidate if the bridge and privacy contracts hold.
- Public beta: after real tester proof, real loopback proof, stable download behavior, and no privacy leaks.

## What To Say Publicly

CueForge is not trying to pretend a post-mix app can know exact game-engine object positions. It is trying to become the player-owned layer that proves the real Windows audio chain, finds risky stacking, learns personal preference safely, exports configs, and keeps evidence local.

## Tester Ask

Run one setup. Play one real match. Tell us what changed.

Better, worse, or weird all helps.

## Links

- App: https://p4nd4907.github.io/cueforge/
- GitHub: https://github.com/P4ND4907/cueforge
- Feedback issue: https://github.com/P4ND4907/cueforge/issues/1
- Social rollout pack: `docs/social/2026-05-24-social-command-center.md`
