# One Smooth Tester Path Design

Date: May 31, 2026

## Goal

CueForge should turn the current collection of useful labs into one obvious tester journey. A new player should open the app, click one main action, complete the minimum useful checks, play one real match, and export feedback that can be replayed without leaking private data.

The build covers four connected outcomes:

- Smooth first-run flow
- Unified tester packet
- Local evidence loop
- Stronger report replay

This is an orchestration build. Existing modules should be reused before adding new feature surfaces.

## Product Promise

The user-facing promise is:

```text
Start Audio Check -> Auto Setup -> Mic Check -> Starter Tune -> Sound Match -> Play Test -> Export Feedback
```

Every step should answer one question:

- Auto Setup: what hardware, apps, and route are active?
- Mic Check: can teammates understand the player?
- Starter Tune: what safe baseline should they try?
- Sound Match: what does this player actually prefer?
- Play Test: did one real match improve or get worse?
- Export Feedback: can CueForge replay the result later?

## Current Assets To Reuse

The repo already has the pieces needed for the first version:

- `src/core/commandCenterFlow.js` builds the Command Center flow and guided setup state.
- `src/ui/SetupCommandCenter.jsx` renders the first-screen summary and next action.
- `src/playerTrial.js` builds player-trial feedback packets.
- `src/audioEvidence.js` builds privacy-safe audio evidence summaries.
- `src/wavFeatureExtractor.js` analyzes imported WAV clips.
- `src/reportPack.js` creates and validates redacted issue reports.
- `src/privacyAudit.js` checks exports for private data leaks.
- `src/issuePatternMemory.js` turns repeated reports, notes, and evidence into debug patterns.

The implementation should connect these more tightly before inventing new product language.

## Approach

Use the Command Center as the shell for the journey. Add a dedicated guided journey model in core code that can compute the current step, completion state, CTA label, and replay/export readiness from existing app state.

The main app should not become more complicated. Simple Mode should show the smooth tester path first. Expert Mode can still expose the full lab bench.

## Feature 1: Smooth First-Run Flow

Add one primary CTA on the Command Center:

```text
Start Audio Check
```

After the first click, the CTA should advance based on state:

```text
Run Auto Setup
Open Mic Check
Use Starter Tune
Run Sound Match
Start Play Test
Export Feedback
```

The flow should show a compact step strip with stable labels and statuses:

- `todo`
- `next`
- `done`
- `blocked`

Blocked states must explain what to do next in plain language. Examples:

- Mic permission blocked: allow mic access or continue with setup-only feedback.
- Browser-only device evidence: desktop scan is recommended, but not required for web testers.
- Route conflict found: fix the conflict before trusting a tune.

Success criteria:

- A first-time tester can identify the next step without reading docs.
- Clicking the primary CTA never lands on a dead-end panel.
- The public tester path matches social copy.

## Feature 2: Unified Tester Packet

Create a new packet builder that merges the important proof into one export:

- app version and schema
- tester fingerprint, not raw username
- selected game and source profile
- redacted setup summary
- chain/readiness summary
- Sound Match result or missing-state reason
- Player Trial scores and notes
- audio evidence summaries
- latest redacted issue report reference/state
- next recommended fixes
- privacy block

The packet should be safe enough for Discord or GitHub. It must not include raw device IDs, local paths, emails, phone numbers, tokens, full browser user agent strings, or raw audio.

Recommended file:

```text
src/testerPathPacket.js
```

Recommended schema:

```text
cueforge.tester-path-packet.v1
```

Success criteria:

- Exported packet contains enough information to decide what happened.
- Privacy audit passes on the packet.
- Existing Player Trial packet behavior keeps working.

## Feature 3: Local Evidence Loop

Add a simple evidence panel that can summarize either:

- existing derived audio evidence, or
- an imported WAV clip analyzed by `extractWavFeatures`.

The panel should output:

- likely cause
- confidence
- recommended next action
- whether EQ should be held, previewed, or avoided
- privacy status

Cause labels should stay conservative:

- `masking`
- `routing`
- `mic-clipping`
- `discord-or-comms-layer`
- `game-or-server`
- `eq-or-profile`
- `unknown`

The evidence loop must not claim true enemy position, game-world geometry, protected playback capture, or medical hearing accuracy.

Recommended file:

```text
src/evidenceLoop.js
```

Success criteria:

- The app can explain what the evidence suggests without overstating certainty.
- WAV import errors are readable and recoverable.
- Raw audio is never included in public exports by default.

## Feature 4: Stronger Report Replay

Report Lab already imports and replays EQ/game/source/analyzer state. This pass should make replay clearer and more complete.

Replay should restore or preview:

- 10-band EQ
- selected game
- source profile
- sample/notes
- analysis result
- Sound Match preference model when present
- latest evidence summary when present
- state anchor and privacy status

After replay, the app should show a short replay receipt:

```text
Replayed: EQ, game, source profile, analysis, Sound Match, evidence summary.
Missing: desktop bridge report. Ask tester for a fresh Windows scan if needed.
```

Success criteria:

- Imported reports are understandable before replay.
- Replay explains exactly what was restored and what was unavailable.
- Invalid reports fail with a useful message.

## Data Flow

```text
Command Center
  -> guided tester path model
  -> route/action selection
  -> Mic Check / Starter Tune / Sound Match / Play Test
  -> tester path packet builder
  -> privacy audit
  -> export feedback

Evidence sources
  -> audioEvidence summaries or WAV analysis
  -> evidence loop decision
  -> tester packet and report preview

Report Lab
  -> redacted issue report
  -> import validation
  -> replay preview
  -> restored app state
  -> replay receipt
```

## Error Handling

- Missing mic permission should not block the whole journey. It should downgrade mic proof and continue.
- Browser-only setup evidence should warn without pretending to know Windows endpoint routing.
- Invalid WAV files should show the parser error and keep the current state unchanged.
- Invalid reports should not call replay handlers.
- Privacy audit failure should block export copy/download until fixed or clearly marked developer-only.

## Testing Plan

Add focused unit tests for:

- guided tester path step selection
- unified tester packet redaction and schema
- evidence loop cause mapping
- WAV import success and failure path, if UI hooks are added
- report replay receipt generation
- privacy audit pass for tester packet and replay exports

Run at minimum:

```powershell
npm.cmd exec vitest run src/tests/commandCenterFlow.test.js src/playerTrial.test.js src/audioEvidence.test.js src/reportPack.test.js
npm.cmd run build
```

For UI changes, also run:

```powershell
npm.cmd run test:ui
```

## Non-Goals

- No silent Windows routing changes.
- No automatic APO writes.
- No driver installs.
- No social posting automation.
- No raw audio upload.
- No enemy-position, wallhack, room-geometry, or medical claims.

## Implementation Order

1. Add the core guided tester path model and tests.
2. Wire the Command Center primary CTA and step strip to that model.
3. Add unified tester packet builder and privacy tests.
4. Add evidence loop builder and a simple UI panel.
5. Upgrade Report Lab replay preview and receipt.
6. Run tests, build, and browser smoke.

## Routing Decision

Default route after `Start Audio Check` should be `Auto Setup`, because the app needs evidence before it can recommend a safe tune. If the user already has scan evidence, the route should advance to the next incomplete step.
