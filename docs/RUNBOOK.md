# CueForge Runbook

## Local Web

```powershell
npm.cmd run dev
```

## Desktop Preview

```powershell
npm.cmd run desktop
```

## Release Checks

```powershell
.\tools\run-checks.ps1
```

The Windows wrapper runs the full layered gate: clean install, unit/regression tests, production build, native manifest validation, fixture validation, harness tests, UI contract tests, desktop directory build, packaged desktop smoke, dependency audit, export redaction, screenshot smoke, and pre-release QA.

The proof flow behind those commands is documented in `docs/QA_EVIDENCE_PIPELINE.md`. Use it when deciding where a new bug belongs: evidence collection, chain graph, route warnings, readiness, lab harness, guided UI, report redaction, or replay artifact.

Run the desktop-shell smoke directly when changing Electron, preload APIs, public asset paths, or packaging:

```powershell
npm.cmd run test:playwright:electron
npm.cmd run test:desktop-smoke
```

The Electron smoke must render `Setup Command Center`, expose only the approved `window.cueforgeDesktop` APIs, resolve desktop info to CueForge-owned app data, and stay free of startup console/resource errors.

## Setup Assessment Snapshot

CueForge publishes one local assessment snapshot after the state bundle updates:

- `localStorage["cueforge:setup-assessment:snapshot"]`
- `window.cueforgeSetupAssessment`
- browser event `cueforge:setup-assessment`

This is the safe handoff for lab runners and future integrations. It contains summaries and state anchors, not raw audio, raw device IDs, raw Windows paths, or account data.

## Companion Repo Patterns

Use the companion integrations as patterns, not hidden operators:

- Autobot style: scheduled read-only maintenance checks.
- Kalshi Scout style: release/readiness smoke and freshness checks.
- Feedback Automation style: redacted packet triage and approval queues.
- Crypto Intelligence style: versioned local snapshot contracts.

Validate the contracts with:

```powershell
npm.cmd run validate:manifest
```

Validate the checked-in swarm routes, jobs, and repair queues with:

```powershell
npm.cmd run validate:swarm
```

For a non-Windows shell, use:

```sh
./tools/run-checks.sh
```

The shell wrapper skips the Windows-only desktop package smoke and keeps the browser/harness/release gates.

## Panda Notes Repair

```powershell
npm.cmd run notes:repair
```

Review `docs/repair/PANDA_NOTES_REPAIR_QUEUE.md` before making source edits.

## Native Boundary

The desktop bridge may detect devices and trusted companion tools. It must not silently change routing, drivers, APO configs, Discord settings, or game settings.
