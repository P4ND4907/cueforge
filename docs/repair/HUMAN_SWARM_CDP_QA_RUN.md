# Human Swarm CDP QA Run

Profile: standard
Seed: 1779589535559-npmx4oi6
Visual fault injection: off
Randomization: seeded shuffled routes, varied safe action order, exploratory cross-page checks, and jittered viewport stress where enabled.
Runs: 1
Duration per run: 0.25 minutes
Personas per run: 5
Route checks: 70
Failures/friction routes: 0
Panda Notes created: 0

## Persona Split

- Mika: simple onboarding and first match path
- Rowan: expert pages, raw tools, and proof panels
- Chiefy: mic analyzer, permissions, reports, and replay readiness
- Panda: Sound Match, hearing model, masking, calibration, and player trial
- Nova: mobile-style overflow, quiet mode, privacy, and exports

## Run Summaries

### Run 1
- Routes: 70
- Notes: 0
- Notes saved through UI: 0
- Mika: 14 routes, 0 friction route(s), 0 UI note(s).
- Rowan: 14 routes, 0 friction route(s), 0 UI note(s).
- Chiefy: 14 routes, 0 friction route(s), 0 UI note(s).
- Panda: 15 routes, 0 friction route(s), 0 UI note(s).
- Nova: 13 routes, 0 friction route(s), 0 UI note(s).

## Notes

No failures or friction notes were created.

## Files

- docs/repair/cueforge-human-swarm-cdp-results.json
- docs/repair/cueforge-human-swarm-cdp-ui-feedback-notes.json
- docs/repair/human-swarm-cdp-summary.png

## Blocked Run Addendum

### 2026-05-23T19:24:27.4660298-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this environment still prevents the Node QA runner from spawning its child process, so no new CDP browser evidence or Panda Notes were generated in this pass.

### 2026-05-23T20:25:48.9861657-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse hit the same Windows spawn restriction, so the CDP swarm pass produced no fresh browser coverage or Panda Notes for follow-up repair.

### 2026-05-23T21:27:21.4926546-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this pulse reproduced the same environment-level spawn block, so the CDP swarm run generated no fresh browser evidence or Panda Notes for repair follow-up.

### 2026-05-23T22:38:00.0000000-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight pass hit the same child-process spawn restriction in the current Windows environment, so no fresh CDP coverage, screenshots, or Panda Notes were generated before preflight.

### 2026-05-23T23:30:38.3354698-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this QA pulse reproduced the same environment-level spawn restriction, so the CDP pass could not generate fresh browser evidence, screenshots, or Panda Notes before the preflight run.

### 2026-05-24T00:32:11.3139658-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight pulse hit the same Node child-process restriction at Chrome launch, so the swarm pass produced no fresh browser coverage, screenshots, or Panda Notes before preflight.

### 2026-05-24T01:32:26.9802832-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight pulse reproduced the same Windows child-process spawn restriction, so the CDP swarm pass again produced no fresh browser evidence, screenshots, or Panda Notes before preflight.

### 2026-05-24T02:34:20.2951556-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse hit the same Node child-process restriction again, so the short CDP pass produced no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-24T03:34:46.6344094-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse reproduced the same environment-level child-process restriction, so the short CDP pass generated no fresh browser coverage, screenshots, or Panda Notes before preflight.

### 2026-05-24T04:37:13.0000000-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse hit the same environment-level child-process restriction again, so the short CDP pass produced no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-24T05:37:43.4865725-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse reproduced the same Windows child-process restriction, so the short CDP pass generated no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-24T06:39:48.3245973-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse hit the same environment-level child-process restriction, so the short CDP pass produced no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-24T07:40:59.0173743-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse reproduced the same Node child-process spawn restriction, so the short CDP pass generated no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-24T08:42:22.1145368-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse hit the same Windows child-process spawn restriction again, so the short CDP pass produced no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-24T09:44:46.6921584-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse reproduced the same environment-level child-process restriction, so the short CDP pass generated no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.

### 2026-05-25T00:04:53.8322794-08:00

- Command: `node tools/Run-HumanSwarmCdp.mjs --duration=120000 --repeat=1`
- Result: blocked before browser launch
- Error: `Error: spawn EPERM`
- Detail: this overnight QA pulse hit the same environment-level child-process restriction again, so the short CDP pass produced no fresh browser coverage, screenshots, or Panda Notes before the preflight gate run.
