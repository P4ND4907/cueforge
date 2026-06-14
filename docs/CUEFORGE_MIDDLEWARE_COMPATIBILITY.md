# CueForge Middleware Compatibility

This is the CueForge game/middleware integration contract for quick prototypes that should still survive a future Unity, Unreal, or custom engine build.

The implementation lives in `src/core/middlewareCompatibility.js`.

## Scope

CueForge supports a thin `IAudioBackend` contract that can map to Wwise or FMOD without gameplay code knowing middleware details.

Required backend methods:

- `Init`
- `Shutdown`
- `LoadBank`
- `Play`
- `SetRTPC`
- `SetState`
- `GetProfilerStats`

Gameplay code must reference canonical event IDs from the CueForge manifest. It must not invent event names inline.

## Canonical Manifest

`buildCueForgeMiddlewareCompatibilityManifest()` produces:

- Wwise and FMOD backend records
- one canonical event list
- backend event maps
- RTPC ranges and units
- state/switch groups
- bus layout with per-bus binaural mode
- deterministic build path template
- telemetry event IDs for missing assets, poly caps, and binaural fallback

Backend event mapping example:

```js
{
  wwise: {
    'weapon.fire': 'Event/CueForge/weapon/fire'
  },
  fmod: {
    'weapon.fire': 'event:/CueForge/weapon/fire'
  }
}
```

## Headphone Binaural Rules

CueForge exposes one player toggle for headphone binaural.

The route resolver keeps this safe:

- stereo output plus no platform spatial layer: middleware binaural is allowed
- non-stereo output: fallback to speaker panning
- active platform spatial layer: disable middleware HRTF unless a bus is explicitly forced
- per-bus modes are `off`, `auto`, and `force`

This avoids double HRTF and bad downmix assumptions.

## Voice And CPU Budgets

Current PC prototype budget:

- audio thread: `<= 5 ms`
- SFX voices: `48`
- ambience voices: `16`
- VO voices: `8`
- heavy voices: `2`
- profiler parity tolerance: `+/-1 voice`

Mobile is stricter and already modeled in the same contract.

`evaluateProfilerBudget()` returns issues and telemetry such as `poly-cap-hit` when a scene exceeds caps.

## Mixer Snapshots

Snapshots are versioned JSON:

```js
{
  schema: 'cueforge.mix-snapshot.v1',
  id: 'combat',
  version: '1.0',
  priority: 40,
  rampMs: 250,
  busGains: {},
  sendLevels: {},
  sidechainDucks: {},
  limiterThresholds: {}
}
```

Application is additive and ramped. Priority resolves conflicts deterministically.

## 15-Minute Smoke

`buildMiddlewareSmokeChecklist()` covers:

1. listener movement plus binaural toggle
2. voice cap and virtualization pressure
3. snapshot ramps and sidechain behavior
4. profiler overlay parity within `+/-1 voice`

## Safety Boundary

This contract is a prototype path, not a hidden system modifier.

CueForge still must not:

- silently change routing
- install drivers
- mutate APO, Peace, Sonar, Wwise, or FMOD projects without review
- claim engine-native occlusion or object metadata from a normal stereo mix
- upload raw audio by default
