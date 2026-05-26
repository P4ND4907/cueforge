# Common Problems And Better Solutions

The code map lives in:

```text
src/audio-science/gameAudioProblems.js
```

## Why This Matters

CueForge should not build from random cool features. It should build from real FPS audio problems:

- footsteps buried under explosions
- duplicate spatial layers
- wall/door/stair occlusion confusion
- server or game-mix problems mistaken for EQ problems
- mic clipping or Discord routing blamed on the headset

## Current Problem Map

### Low-End Masking

Problem: explosions, vehicles, bass-heavy tuning, or low-mid buildup hide movement detail.

Better solution: reduce masking pressure before boosting cue bands.

Test: compare one quiet route and one chaotic fight with the same EQ.

### Spatial Layer Stacking

Problem: game HRTF plus Sonar, Atmos, THX, or Windows Spatial Sound can destabilize direction.

Better solution: confirm one spatial layer before EQ.

Test: left/right/center check, then game-only versus game plus virtual mixer.

### Occlusion Or Wall Filtering

Problem: map geometry, portals, diffraction, and wall filtering can remove cue detail.

Better solution: treat this as map/game-specific until repeated captures prove otherwise.

Test: door, stairwell, wall, and open-space comparisons on the same map.

### Server Or Game Mix

Problem: live server behavior or game patch mix changes can feel like bad EQ.

Better solution: compare offline/training against live server before changing a global profile.

Test: same setup, same route, offline then live.

## Design Rule

Every new feature should answer:

```text
What player problem does this detect?
What signal proves it?
What can CueForge safely recommend?
What should CueForge refuse to claim?
```
