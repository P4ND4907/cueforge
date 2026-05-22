# Driver Layer

CueForge should not ship an unsigned kernel driver. The safer path is to detect and guide trusted companion layers first.

## Best Layers To Support

- Equalizer APO: primary system-wide EQ target for CueForge exports.
- Peace UI: visual manager for Equalizer APO presets.
- SteelSeries Sonar: optional game/chat/media virtual mixer.
- VB-CABLE / Voicemeeter: optional virtual routing for loopback tests and stream mixes.
- CueForge Native APO: future signed Windows APO only if beta demand justifies it.

## Current Implementation

The Windows bridge detects:

- Equalizer APO install/config path.
- Peace UI.
- SteelSeries GG / Sonar.
- VB-Audio / VB-CABLE / Voicemeeter style devices.

The app shows these in `Auto Detect` and `Driver Layer`.

## Rules

- Do not silently install drivers.
- Do not silently change Windows default devices.
- Do not stack multiple EQ layers without warning.
- Always show the route, expected device, backup/undo plan, and manual apply step.
