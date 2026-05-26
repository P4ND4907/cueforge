# Driver Layer

CueForge should not ship an unsigned kernel driver. The safer path is to detect and guide trusted companion layers first.

## Best Layers To Support

- Equalizer APO: primary system-wide EQ target for CueForge exports.
- Peace UI: visual manager for Equalizer APO presets.
- SteelSeries Sonar: optional game/chat/media virtual mixer.
- FxSound / OEM enhancers: detect before judging a CueForge EQ curve.
- Dolby, DTS, THX, and game HRTF layers: detect and warn when spatial processing is stacked.
- NVIDIA Broadcast, Elgato Wave Link, Logitech G HUB, Corsair iCUE, and Voicemod: detect mic processing before diagnosing mic quality.
- VB-CABLE / Voicemeeter: optional virtual routing for loopback tests and stream mixes.
- CueForge Native APO: future signed Windows APO only if beta demand justifies it.

## Current Implementation

The Windows bridge detects:

- Equalizer APO install/config path.
- Peace UI.
- SteelSeries GG / Sonar.
- FxSound.
- Razer THX / Synapse.
- Dolby Access / Atmos.
- DTS Sound Unbound.
- Nahimic and Realtek Audio Console.
- NVIDIA Broadcast, Elgato Wave Link, Logitech G HUB, Corsair iCUE, and Voicemod.
- VB-Audio / VB-CABLE / Voicemeeter style devices.

The app shows these in `Auto Detect`, `Setup Intelligence`, and `Driver Layer`.

## Rules

- Do not silently install drivers.
- Do not silently change Windows default devices.
- Do not stack multiple EQ layers without warning.
- Do not call a setup proven until the desktop scan and at least one real-match check-in support it.
- Always show the route, expected device, backup/undo plan, and manual apply step.
