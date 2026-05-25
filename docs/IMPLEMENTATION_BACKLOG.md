# CueForge Implementation Backlog

Status: v0.2.0-alpha.3 planning contract.

This file mirrors `src/data/implementationBacklog.js`. The code version is the source of truth because tests can validate it.

## Current Tasks

| Task | Why it matters | Effort | Status |
| --- | --- | --- | --- |
| Extract Setup Command Center / Auto Detect / Self Test from `main.jsx` into feature modules | Lowers risk and makes automated testing realistic. | medium | in progress |
| Define chain-graph JSON schema and store it as the canonical assessment object | Makes detection results comparable and testable. | medium | in progress |
| Add Windows native helper for current default endpoints and route roles | Moves from installed to active. | high | queued |
| Add WASAPI loopback capture helper | Unlocks true render proof. | high | queued |
| Build fixture pack: impulse, chirp, pink noise, cue clips, comms clips | Enables deterministic regression. | medium | in progress |
| Add FFmpeg/libebur128 analyzers | Gives standardized loudness and signal metrics. | low | queued |
| Add conflict rules engine | Lets app explain why a user setup is wrong. | medium | foundation live |
| Add Playwright web smoke | Proves browser flow. | low | foundation live |
| Add Playwright Electron smoke | Proves desktop bridge flow. | medium | foundation live |
| Add hardware profile manifests | Makes lab reproducible across known setups. | low | foundation live |
| Add Feedback Automation ingestion for tester packets | Closes the feedback loop. | medium | queued |
| Add Autobot-style scheduled maintenance job | Keeps nightly health and route checks running. | medium | queued |
| Add Kalshi-Scout-style commit/readiness smoke | Catches stale builds and broken deploys. | low | in progress |
| Promote swarm into checked-in route manifests and repair jobs | Makes hidden QA reproducible. | medium | manifest live |

## Next Practical Order

1. Canonical chain-graph schema.
2. Feature-module extraction.
3. Commit/readiness smoke hardening.
4. FFmpeg/libebur128 analyzer wrapper.
5. Route graph lab runner hardening on the self-hosted Windows machine.
6. Fixture pack expansion.

Native endpoint roles and WASAPI loopback are high-effort and should wait behind the manifest/smoke foundation unless a tester group is blocked specifically by desktop proof.

## Rules

- No task can ship without a proof gate.
- Native tasks stay read-only until a later explicit apply/backup/undo design exists.
- Browser smoke, desktop smoke, redaction, feedback contract, audio fixture regression, and release readiness are wired into CI; keep the self-hosted route graph lab opt-in until the lab machine is stable.
- Feedback ingestion can read redacted tester packets; it must not upload raw audio or private device data.
- Swarm jobs are now checked in as reproducible route/job/repair manifests and validated by `npm.cmd run validate:swarm`; the next step is connecting them to the CDP swarm runner.
