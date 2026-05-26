# Release Readiness

Status: PASS
Version: 0.2.0-alpha.3
Ref: local
Generated: 2026-05-24T11:13:18.001Z

| Check | Status | Detail |
| --- | --- | --- |
| package-version-present | PASS | package.json version 0.2.0-alpha.3. |
| state-version-match | PASS | Core state files reference 0.2.0-alpha.3. |
| release-pack-version-match | PASS | Release pack/app copy references 0.2.0-alpha.3. |
| acceptance-doc-version-match | PASS | Acceptance checklist references 0.2.0-alpha.3. |
| docs-bundle-present | PASS | GitHub Pages entrypoint exists. |
| workflow-needs-green | PASS | No GitHub Actions dependency context was provided; local metadata checks only. |
| release-candidate-acceptance | PASS | Not enforcing for local metadata run. Candidate status: BLOCKED; blockers: 1. |
| tag-version-match | PASS | Not a tag-triggered release. |

## Release Candidate Acceptance

Status: BLOCKED
Ready: no

| Check | Status | Detail |
| --- | --- | --- |
| setup-command-center-default | PASS | Playwright web/Electron smoke lands first-run users in the guided command center. |
| autodetect-presence-active-conflicts | PASS | Normalized report, chain graph, confidence, risks, and next actions render from browser plus bridge evidence. |
| desktop-native-scan-bridge-report | PASS | Electron preload exposes only approved helper APIs and reads reports without changing system state. |
| web-electron-smoke | PASS | Playwright web smoke, Playwright Electron smoke, and packaged desktop smoke pass. |
| real-windows-loopback-regression | BLOCKED | At least one real Windows loopback regression run passes. Missing proof key: realWindowsLoopbackRegressionPassed. |
| redacted-reports-no-private-data | PASS | Privacy audit, export redaction checks, report packs, setup packs, and evidence packets stay sanitized. |
| apo-draft-explicit-reversible | PASS | CueForge saves reviewed APO drafts only after user action and keeps real APO/system writes out of automatic flows. |
| common-conflict-rules-covered | PASS | Rules cover APO + Sonar, Sonar + Discord effects, Voicemeeter loop/echo risk, and wrong default communications endpoint. |
| player-evidence-local-default | PASS | Packets export locally with opt-in sharing and summary metrics by default. |
| build-metadata-visible | PASS | Version metadata is checked in release readiness, release packs, and acceptance docs. |
| release-notes-honest-boundary | PASS | Release copy states the Windows-first chain-verification boundary and does not promise engine-level occlusion for arbitrary games. |

Boundary: this gate checks release metadata and upstream job results. It does not publish, tag, upload, or modify release assets.
