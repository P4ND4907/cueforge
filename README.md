# AudioTuner Local

AudioTuner Local is a safe, local-first gaming audio suite reconstructed from the Perplexity AudioTuner research task. It helps compare headset tuning, simulate mic/game-audio analysis, build EQ profiles, and export Equalizer APO config text without directly changing Windows audio settings.

## Run

```powershell
npm install
npm run dev
```

## Included

- Mic analysis simulator for headset and Discord/game audio issues
- 10-band EQ studio
- Equalizer APO config export
- Game-aware profiles for tactical FPS, battle royale, and comms focus
- Personal hearing model screen
- Extracted data inventory from the Perplexity task

This app does not change Windows audio settings directly. It safely generates tuning recommendations and exportable configs.

## Product Direction

AudioTuner should become the clean home for the audio projects in this workspace:

- `autoeq` can provide Windows/Equalizer APO profile switching.
- `gaming-buddy` can become the Windows desktop shell.
- `footstep-test` can become an audio test module.
- Henry engine diagnostics should stay separate unless the product line expands into non-gaming sound diagnostics.
