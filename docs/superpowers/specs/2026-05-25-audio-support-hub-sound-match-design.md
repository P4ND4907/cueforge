# Audio Support Hub + Sound Match Design

Date: 2026-05-25
Status: Approved for specification by user

## Purpose

CueForge should become the place a player goes when game audio feels wrong and they do not know whether the cause is EQ, headset/IEM tuning, Discord, Sonar, APO, Windows routing, mic gain, masking, fatigue, or the game mix itself.

The existing Blind Match and preference model are a good base, but the current flow is too small: five static A/B choices produce a conservative curve. The next product step is a smart Sound Match system that learns preferences with evidence, and an Audio Support Hub that routes common audio problems to the right lab or repair path.

## Goals

- Rename the player-facing tuning path from Blind Match to Sound Match.
- Keep the existing `preferenceModel` as the core personalization model.
- Add an evidence layer so CueForge knows whether a setting is ready to apply, preview only, or needs retesting.
- Let saved device aliases, game profiles, hearing state, masking results, chain conflicts, and player trial feedback influence the recommendation.
- Give users one support entry point for common audio problems.
- Explain changes in plain player language: footsteps, direction, comms, comfort, fatigue, routing, mic, and apply safety.
- Preserve CueForge boundaries: no silent driver changes, no hidden Windows routing edits, no fake enemy-position claims, and no medical hearing claims.

## Non-Goals

- No system-wide audio driver or hidden APO/routing changes.
- No claim that CueForge can recover true enemy positions, wall occlusion, or room geometry from mixed stereo.
- No raw audio upload by default.
- No automatic social posting, Discord posting, or account automation.
- No replacement for Equalizer APO, Sonar, Peace, or headset software. CueForge verifies, explains, exports, and previews.

## Approaches Considered

### Approach 1: Small Sound Match Patch

Add repeat checks and confidence scoring to the current Blind Match flow.

This is fast and low risk, but it does not solve the larger support problem. Users would still need to know whether their issue belongs in Auto Detect, Mic Lab, Masking Lab, Hearing Model, or Report Lab.

### Approach 2: Sound Match v2 + Audio Support Hub

Add a Sound Match evidence layer and a Support Hub router that connects current CueForge labs into one guided audio help surface.

This is the recommended path. It reuses the existing preference model, profile engine, conflict detector, Auto Detect report, Mic Lab, Masking Lab, Player Trial, and Report Lab. It improves trust without inventing a second brain.

### Approach 3: Full Audio Lab With Generated Fixtures

Build deeper generated audio scenes, analyzer feedback, and repeatable audio fixtures before changing the UI.

This is valuable later, especially for native preview and masking research, but it is too much for the next product pass. The app needs a clearer support and decision layer first.

## Recommended Architecture

### Audio Support Hub

New player-facing hub with one question:

```text
What sounds wrong?
```

Problem choices:

- Footsteps are too quiet.
- Direction feels wrong.
- Discord/comms are hard to hear.
- My mic sounds bad.
- Audio feels delayed.
- Sound is harsh or tiring.
- APO, Peace, Sonar, or headset software is not working.
- The game sounds different from test audio.
- I need a shareable report for help.

The hub reads current state and routes the player:

- Auto Detect for missing or confusing devices.
- Conflict Detector for stacked enhancers, spatial layers, APO/Sonar ambiguity, or virtual routing.
- Mic Lab for input gain, clipping, noise, voice presence, and Discord readiness.
- Sound Match for player preference and tuning.
- Masking Lab for footsteps/comms/explosions overlap.
- Hearing Model for treble/fatigue safety.
- Player Trial for one real match proof.
- Report Lab for redacted support packets.

### Sound Match v2

Sound Match remains a short A/B preference flow, but gains evidence:

```text
soundMatchSession
  sessionId
  createdAt
  gameProfileId
  deviceKey
  deviceAlias
  outputType
  rounds
  choices
  repeatChecks
  contradictionCount
  confidence
  applyReadiness
  preferenceModel
  settingDeltas
  whyChips
  safetyWarnings
  nextActions
```

`preferenceModel` remains the core hidden model. The session adds proof around it.

Apply readiness values:

- `blocked`: high-risk chain conflict, missing output, unsafe playback, or severe contradiction.
- `preview-only`: enough to hear a test, not enough to save/apply.
- `ready-to-save`: useful personal setting for this device/game.
- `ready-to-apply`: enough chain proof and safety gates to export/apply manually.

### Adaptive Rounds

The first pass keeps the existing five preference dimensions, then adds repeat and conflict checks:

- footsteps vs comfort
- bass impact vs comms clarity
- wide space vs centered direction
- detail vs fatigue
- direction cues vs body/fullness
- repeat check for the strongest preference
- contradiction check for the riskiest preference

Game and device context can reorder or add weight:

- FPS/tactical games prioritize direction, footsteps, comms, and fatigue.
- Horror/story games prioritize immersion, comfort, and harshness.
- Creator/streaming profiles prioritize voice, monitoring, and mic readiness.
- IEMs and bright headsets get stricter treble safety.
- Sonar/APO/routing conflicts lower apply readiness until the path is proven.

### Setting Preview

Sound Match should output a preview before saving:

```text
Footsteps: +2
Comms: +1
Direction: medium confidence
Fatigue risk: high
Treble lift: capped until hearing check is complete
Routing: confirm APO path before apply
```

Buttons:

- Preview this tuning
- Save for this game
- Save for this device
- Run missing check
- Export report

The app should avoid a strong Apply button until chain health, hearing safety, and match proof are good enough.

### Saved Profiles and Auto-Switch

Sound Match should connect to the editable device profiles already restored:

- device aliases make ugly Windows/browser names readable
- saved game profiles store intent and preferred tuning
- game/process detection can select the best saved profile
- user can still edit the displayed profile name
- auto-switch should be visible and reversible

### Support Diagnosis

The Support Hub should generate concise diagnoses:

```text
Likely routing issue, not EQ. Sonar and APO are both detected, and APO may not touch the output you actually hear.
```

```text
Do not boost treble yet. Hearing check is incomplete and fatigue risk is high.
```

```text
Mic issue first. Your input path has multiple processing layers, so run Mic Lab before judging comms clarity.
```

Each diagnosis includes:

- likely cause
- confidence
- proof used
- next check
- whether the user should preview, save, apply manually, or report

## Data Flow

1. Auto Detect and the chain graph identify output, input, companion layers, routes, and apply targets.
2. Support Hub reads the state and picks the most likely problem category.
3. Sound Match runs adaptive preference rounds for the selected game/device.
4. The evidence layer scores confidence, contradictions, safety gates, and apply readiness.
5. Profile Engine consumes the existing `preferenceModel`, plus session readiness and safety warnings.
6. UI shows why chips and next actions.
7. Saved game/device profile stores the approved result.
8. Player Trial or Report Lab captures whether the change worked in a real match.

## Error Handling and Safety

- Missing output: block apply, route to Auto Detect.
- Missing mic with comms issue: route to Mic Lab or permission recovery.
- High-risk conflicts: block apply and route to Conflict Detector.
- Low Sound Match confidence: preview only.
- Contradictory answers: repeat the relevant round before saving.
- Hearing Model incomplete: cap aggressive treble/cue lift.
- Masking Lab incomplete: label cue separation as unproven.
- Native/desktop bridge missing: warn that browser-only evidence may miss Windows layers.
- Export reports should stay redacted and local unless the user chooses to share.

## Testing Plan

Unit coverage:

- Sound Match sessions calculate confidence, contradictions, readiness, and why chips.
- Preference model remains bounded and backward compatible.
- Profile Engine respects Sound Match readiness and safety warnings.
- Support Hub routes common problems to the correct lab.
- Device/game scoped saves select the right profile and preserve friendly aliases.
- High-risk conflicts block apply readiness.
- Incomplete hearing/masking states cap or downgrade risky changes.

Integration coverage:

- Auto Detect ugly device names feed friendly Sound Match device labels.
- Saved game profile influences Sound Match round order.
- Sonar + APO conflict produces routing-first support diagnosis.
- Mic filter stack produces mic-first support diagnosis.
- Player Trial feedback increases evidence but does not override safety caps.
- Report Lab includes support diagnosis and redacted Sound Match evidence.

UI acceptance:

- Public labels say Sound Match, not Blind Match.
- Audio Support Hub has one obvious entry point.
- Buttons are visible but do not imply silent system changes.
- Why chips fit on desktop and mobile.
- The user can save, preview, report, or run the missing check without losing context.

## Implementation Sequence

1. Add a Sound Match session/evidence module on top of the current `preferenceModel`.
2. Add unit tests for confidence, contradiction, readiness, safety caps, and why chips.
3. Add Support Hub routing logic with tests.
4. Wire Profile Engine to use session readiness without breaking existing Blind Match data.
5. Update UI labels and route copy to Sound Match.
6. Add Audio Support Hub UI using existing Auto Detect, Conflict Detector, Mic Lab, Masking Lab, Hearing Model, Player Trial, and Report Lab routes.
7. Add integration tests and one browser smoke pass.
8. Update README and social copy only after the feature is actually live.

## Approval Notes

The user approved the direction on 2026-05-25:

```text
sure and lets get all the post and replies ready for socal post and ill post them...
```

This spec records the approved product direction. Implementation should not claim the Audio Support Hub is live until the matching UI and tests are shipped.
