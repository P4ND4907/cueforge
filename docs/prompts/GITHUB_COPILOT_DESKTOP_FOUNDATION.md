# GitHub Copilot Prompts: CueForge Solo Desktop Foundation

Use these prompts one at a time. Each prompt has a short plan and a tight definition of done. Do not combine them into one giant request.

## Prompt 1 - Desktop Bridge Proof Runner

```text
Implement a CueForge desktop bridge proof runner.

Context:
- Electron entry: electron/main.mjs
- Preload API: electron/preload.cjs
- React app: src/main.jsx
- Current native scan: tools/Scan-AudioSetup.ps1
- Current desktop helper: src/desktopBridgePlan.js

Goal:
Create a repeatable proof path that confirms the desktop app can:
1. expose desktop metadata through window.cueforgeDesktop.info()
2. run the Windows audio setup scan through IPC
3. read the generated bridge report
4. save an APO draft into CueForge app data
5. open the bridge/APO folders only through explicit user action

Rules:
- Do not add hidden telemetry.
- Do not write to real Equalizer APO config locations.
- Do not change Windows routing.
- Keep contextIsolation true and nodeIntegration false.
- Add pure helper tests if any logic is added outside Electron.

Implementation plan:
1. Add a small desktop proof helper module if useful.
2. Add or improve a System Info proof panel that shows desktop metadata, report path, scan status, and APO draft status.
3. Add clear error states for missing PowerShell, missing scanner script, scan timeout, bad JSON, and permission failure.
4. Keep browser mode as a helpful warning with the exact desktop fix path.

Definition of done:
- npm test passes.
- npm run build passes.
- npm run desktop opens.
- In desktop mode, Self Test shows Desktop bridge availability PASS after scan.
- Auto Detect > Run Windows scan loads a report.
- Driver Layer > Save APO draft writes only to CueForge app data.
```

## Prompt 2 - Native Scan Schema And Fixtures

```text
Build the CueForge Windows bridge report schema and fixture tests.

Context:
- Scanner output comes from tools/Scan-AudioSetup.ps1.
- Reports are consumed in src/main.jsx, src/hardwareProof.js, src/communityHub.js, src/privacyAudit.js, and src/desktopBridgePlan.js.

Goal:
Make bridge report parsing stable and testable without committing private machine data.

Implementation plan:
1. Create src/bridgeReportSchema.js with normalizeBridgeReport(report), summarizeBridgeTools(report), and validateBridgeReport(report).
2. Add safe fixture objects in tests with fake device names and fake IDs.
3. Make all consumers use normalized fields where practical.
4. Redact raw IDs and paths before any export or UI copy.
5. Document the schema in docs/ARCHITECTURE.md or docs/DRIVER_LAYER.md.

Rules:
- No real device IDs in fixtures.
- Do not store the generated local report in Git.
- Validation should be tolerant of missing fields but strict about private export fields.

Definition of done:
- npm test passes.
- Privacy audit passes on fixture reports.
- Auto Detect still shows bridge devices/tools.
- System Info bridge proof still works in browser fallback and desktop mode.
```

## Prompt 3 - Desktop First-Run Setup Wizard

```text
Implement a desktop-first setup wizard for CueForge.

Context:
- Browser setup already exists in Setup Journey.
- Desktop shell exposes window.cueforgeDesktop.
- Browser warning should become a guided desktop path, not a dead end.

Goal:
When CueForge is running in desktop mode, guide the player through:
1. confirm mic permission
2. run Windows scan
3. detect companion layers: Equalizer APO, Peace, Sonar, VB-CABLE, Voicemeeter
4. create a redacted setup summary
5. run Self Test
6. save an APO draft only if the player clicks it

Implementation plan:
1. Add desktop-specific copy and status cards without removing web support.
2. Reuse buildDesktopBridgeFixPlan and permissionRecovery helpers.
3. Keep the wizard short: one obvious next action per stage.
4. Save only local app state, never raw private IDs in public export text.

Definition of done:
- In browser mode, setup explains that desktop is needed for native scan.
- In desktop mode, setup can run scan and confirm bridge report loaded.
- Self Test and Auto Detect agree on the bridge state.
- npm test and npm run build pass.
```

## Prompt 4 - Safe APO Draft, Backup, And Undo Design

```text
Design the safe APO apply foundation for CueForge, but do not directly apply to system APO files yet.

Context:
- Current desktop helper saves APO drafts to CueForge app data.
- Future direct apply must be explicit, backed up, and reversible.

Goal:
Create the code/data foundation for a future reviewed APO apply flow:
1. draft folder
2. proposed target path
3. dry-run diff text
4. backup path
5. undo plan
6. warning copy

Rules:
- Do not write to real Equalizer APO config folders in this pass.
- Do not ask for admin privileges.
- Do not change Windows routing.
- The UI must say "draft" or "dry run" clearly.

Implementation plan:
1. Add a pure helper that builds an Apply Plan object from APO config text and optional bridge report.
2. Add tests for safe/unsafe paths and oversized configs.
3. Add a Driver Layer panel that previews the plan and exports it.
4. Keep Save APO draft as the only file-writing action.

Definition of done:
- Tests cover draft, dry-run, unsafe path rejection, and undo text.
- Driver Layer shows no "apply" button that writes to system config.
- Privacy Export Audit still passes.
```

## Prompt 5 - Desktop Packaging Proof Gate

```text
Build the CueForge desktop packaging proof gate.

Context:
- package.json already has desktop, desktop:dir, and desktop:package scripts.
- Public alpha is unsigned, so the app must clearly say that.

Goal:
Create a repeatable release proof checklist for desktop builds.

Implementation plan:
1. Add docs/DESKTOP_RELEASE_PROOF.md.
2. Add a script or documented command sequence for:
   - npm test
   - npm run build
   - npm audit --audit-level=moderate
   - npm run desktop:dir
   - npm run desktop:package
   - launch smoke of release/win-unpacked/CueForge.exe
3. Add expected manual checks:
   - Self Test desktop bridge availability
   - Auto Detect Windows scan
   - Driver Layer APO draft save
   - Privacy Export Audit
4. Add release note copy that explains the unsigned Windows alpha honestly.

Definition of done:
- Docs are clear enough for one solo developer to run.
- No release claim is made without a proof check.
- README links to the desktop proof doc.
```

## Prompt 6 - Pattern Memory To Repair Tickets

```text
Turn Issue Pattern Memory into reviewed repair tickets.

Context:
- src/issuePatternMemory.js groups repeated setup/mic/routing/game/UI/privacy/performance problems.
- Panda Notes already create repair packets.

Goal:
When a pattern becomes automation-ready, CueForge should generate a reviewed repair ticket, not auto-edit source code.

Implementation plan:
1. Add buildPatternRepairTickets(memory) as a pure helper.
2. Each ticket should include pattern id, confidence, evidence count, suspected source, debug playbook, files likely involved, and retest plan.
3. Add System Info controls to copy/export tickets.
4. Make the boundary explicit: source edits require developer review.

Rules:
- No self-repair source edits.
- No public posting.
- No hidden upload.
- Redact all evidence text.

Definition of done:
- Tests cover mic, routing, UI, privacy, and performance tickets.
- System Info displays tickets only when evidence exists.
- npm test and npm run build pass.
```

## Short Solo-Dev Order

1. Desktop Bridge Proof Runner.
2. Bridge Report Schema And Fixtures.
3. Desktop First-Run Setup Wizard.
4. Safe APO Draft/Backup/Undo Design.
5. Desktop Packaging Proof Gate.
6. Pattern Memory To Repair Tickets.

This order keeps the app useful now while building toward a real solo desktop product without making unsafe native promises.
