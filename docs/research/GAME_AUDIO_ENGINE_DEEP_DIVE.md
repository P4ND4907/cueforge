# Game Audio Engine Deep Dive

Modern game audio engines already know the things a downstream tuning app wants: source position, listener position, occlusion, obstruction, room transitions, portals, diffraction, reflections, reverb sends, routing, and object metadata.

CueForge usually does not receive those directly. It receives the browser mic stream, imported files, or later a Windows loopback capture. That is why the app should infer carefully, ask for metadata when available, and avoid fake certainty.

## Engine Map

The code map lives in:

```text
src/audio-science/gameEngineMap.js
```

It tracks:

- Wwise
- FMOD
- Unreal Audio Engine
- Unity Audio
- Steam Audio
- Windows Spatial Sound
- Dolby Atmos
- SteelSeries Sonar
- Razer THX
- WASAPI
- Equalizer APO

## Important Boundary

A post-processing app usually does not receive true object positions, room geometry, occlusion, or source labels unless the game exposes them.

CueForge can still be useful by detecting:

- masking pressure
- stereo instability
- duplicated spatial layers
- high-frequency damping that resembles wall filtering
- clipping or bad capture
- repeated weak cues that build temporal confidence
- game/server suspicion when local evidence is stable but player results are bad

## Metadata To Ask For Later

When possible, CueForge should ask games, mods, logs, or user reports for:

- game name, map, mode, patch
- HRTF/spatial setting names
- Windows endpoint and spatial sound status
- Sonar/THX/Atmos status
- APO/Peace active config
- whether the test is offline/training or live server
- whether the issue occurs near walls, stairs, doors, rooms, or open space

## WASAPI Direction

The realistic Windows path is:

1. WAV import first.
2. Endpoint WASAPI loopback next.
3. Process-specific loopback later for game-only capture.

Endpoint loopback is easier but captures the full rendered endpoint, including Discord, Sonar, browser audio, and other apps. Process-specific loopback is safer for game-only evidence when available.
