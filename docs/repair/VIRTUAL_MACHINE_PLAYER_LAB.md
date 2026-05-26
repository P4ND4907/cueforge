# Virtual Machine Player Lab

Generated: 2026-05-24T10:33:33.486Z
Players: 1
Seed: 907
Feature depth: 6

## Summary

- Step runs: 10
- Pass / warn / fail: 10 / 0 / 0
- Panda Notes created: 0
- Diagnosis accuracy: 100.0%
- Improvement rate: 100.0%
- Harm rate: 0.00%
- Privacy failure rate: 0.00%
- Desktop packaged smoke: pass - Packaged app rendered: Setup Command Center; bodyLength 7960.

## Gear Coverage

- desktop-speakers-standalone-mic: 1

## Problem Coverage

- smart-screen-trust-friction: 1

## Journey Details

### Tess-desktop-speakers-standalone-mic - Desktop speakers + standalone mic

- Game: Tarkov / Siege / COD
- Problem: smart-screen-trust-friction
- Expected lane: baseline-check
- Chosen lane: baseline-check
- Verdict: fixed
- Setup confidence: 96%
- Steps pass/warn/fail: 10/0/0
- Notes: 0

1. PASS - Download / Clean VM user profile
   Started with isolated storage, no saved CueForge profile, no copied tester state.
2. PASS - Download / Download/open app
   Download path staged from GitHub Pages app link; app URL and release link are reachable inputs for the tester journey.
3. PASS - Setup Gate / Guided setup and gear import
   Desktop speakers + standalone mic: setup score 100, player-test-ready.
   Next: Continue into tuning.
4. PASS - Mic Lab / Mic analyzer
   Mic stream opened from Blue-style USB mic; real signal detected at 84% (900ms / 15 frames / 48000Hz).
   Next: Keep baseline
5. PASS - Masking Lab / Anti-masking tune
   Footsteps under explosions: 70 -> 81 masking score
   Next: Retest the same fight or training-range cue before calling it fixed.
6. PASS - Hearing Model / Personal hearing baseline
   12/12 tone responses mocked for this clean-machine player.
   Next: Use as a light overlay only.
7. PASS - Share CueForge / Copy/import audio profile
   Shared profile copied and re-imported with 10 EQ bands.
   Next: Keep this text-only so friends can send profiles without accounts or uploads.
8. PASS - Auto Detect / Auto-detect gear chain
   Desktop speakers + standalone mic: 96% confidence. local hardware proof ready; still needs real-match feedback to call this setup proven
   Next: Run or refresh the Windows scan before a real match.
9. PASS - EQ Studio / Review EQ export
   10 EQ bands created for Tarkov / Siege / COD.
   Next: Review before exporting APO.
10. PASS - Report Lab / Final tester report and replay package
   User verdict fixed; diagnosis lane baseline-check; 0 developer note(s) created.
   Next: No blocking notes. Keep this scenario in release proof.

## Repair Notes

No Panda Notes were created by this run.
