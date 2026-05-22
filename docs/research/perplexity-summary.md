# Perplexity Research Summary

Source context: `C:\Users\carls\Documents\New project\perplexity_task_extraction.md`

## Extracted Program Ideas

- Henry: engine sound diagnostics app where users upload or record engine audio and receive mocked diagnostic issues with confidence scores.
- AudioTuner: gaming audio suite with EQ profiles, headset tuning, mic analysis, hearing-aware compensation, and exportable config.

## Useful Research Threads

- AutoEQ and headphone measurement databases for scientifically grounded correction curves.
- Equalizer APO and HeSuVi for Windows system audio routing and spatialization workflows.
- Web Audio APIs including AudioWorklet, ConvolverNode, and spatial audio primitives.
- RNNoise/WASM for optional browser-based noise reduction.
- EBU R128/loudness-normalization references for volume consistency.
- Game config files for CS2, Valorant, Apex, Fortnite, and Warzone audio/profile tuning.
- Electron/Tauri packaging references for future desktop builds.

## Implementation Boundary

This repo is intentionally safe: it does not alter drivers, install virtual audio devices, or write to system audio config by default. It exports readable recommendations/configs so the user stays in control.

## Recommended Next Steps

1. Add real import/export for profile JSON.
2. Add headset preset examples under `src/`.
3. Connect the existing `autoeq` PowerShell profile switcher as an optional advanced workflow.
4. Add screenshots after the UI is stable.
5. Keep the Henry engine diagnostic concept in a separate repo if it moves forward.
