# CueForge Agent Guide

CueForge is the audio chain verifier and personal sound engine for gamers.

## Rules

- Keep changes local-first.
- Never silently change Windows audio routing, drivers, APO configs, Discord settings, or social accounts.
- Prefer explicit exports, reports, and reviewable manifests.
- Keep raw device IDs, paths, emails, phone numbers, tokens, and recovery data out of reports.
- Run `tools/run-checks.ps1` before release builds on Windows.

## Architecture

- `src/app` contains route-level UI.
- `src/core` contains state, chain, scoring, manifests, and export contracts.
- `src/detection` normalizes browser and desktop bridge evidence.
- `src/lab` contains synthetic fixtures and repeatable test harnesses.
- `src/native` is the future desktop/native boundary.
