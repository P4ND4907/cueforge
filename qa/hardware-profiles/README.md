# Hardware Profiles

Fixture descriptions for common player chains: USB mic, headset, IEM + DAC, Sonar + APO, Voicemeeter, VB-CABLE, wireless chat/game split, and clean beginner setups.

Schema: `cueforge.hardware-profile.v1`

Validator: `src/shared/schemas/hardwareProfile.js`

Profiles in this folder are explicit enough to drive Auto Detect, VM lab simulations, and release matrix checks:

- `input.kind` / `output.kind` describe the expected device class.
- `matchHints` are human labels CueForge can match without raw device IDs.
- `companions` marks tools as `expected`, `optional`, or `forbidden`.
- `expectations` states routing and measurement requirements such as chat/game split, loopback proof, and max round-trip latency.

Public reports should reference profile IDs and derived assessments, not raw endpoint IDs.
