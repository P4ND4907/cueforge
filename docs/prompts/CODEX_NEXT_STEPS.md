# CueForge Codex Next Steps

## Step v0.2 -> v0.3: Real WAV Feature Extractor

Goal: turn CueForge from simulated audio intelligence into real audio science without pretending it has full game-world telemetry.

Pipeline:

```text
WAV file
-> PCM samples
-> STFT / FFT
-> band energy
-> transient score
-> stereo pan / width
-> existing detector
-> temporal evidence
-> echo-scene inference
-> scene graph
-> EQ decision
-> coach
```

Implemented foundation:

- `src/wavFeatureExtractor.js`
- `src/echoSceneInference.js`
- `src/engine/temporalEvidenceAccumulator.js`
- `src/engine/benchmarkMetrics.js`
- `src/engine/stateOfArtEvaluator.js`
- `src/audio-science/gameEngineMap.js`
- `src/audio-science/gameAudioProblems.js`
- `src/wavFeatureExtractor.test.js`
- `src/engine/stateOfArtEvaluator.test.js`

The important boundary:

CueForge can infer masking pressure, lateral stability, high-frequency damping, temporal confidence, and routing clues from rendered audio. It cannot honestly claim true enemy position, room geometry, source labels, occlusion values, or object metadata unless the game exposes those signals or the inference is validated against labeled data.

## Next v0.3 Tasks

1. Add user-selected WAV import to the app UI.
2. Show a WAV analysis report page with:
   - sample rate, channels, duration, bit depth
   - STFT frame count
   - transient score
   - stereo pan / width
   - band energy
   - temporal evidence state
   - echo-scene confidence
   - EQ decision and coach notes
3. Add a local golden clip folder that is ignored by Git.
4. Add JSON fixtures for expected clip labels instead of committing private audio.
5. Add precision, recall, false positive rate, and latency summaries for the golden set.
6. Add a desktop-only WASAPI loopback research branch after file analysis is stable.

## v0.4 Direction

- Process-specific WASAPI loopback for game-only capture.
- Optional ML SELD / acoustic imaging model once there is labeled data.
- Per-game benchmark suites for Tarkov, Siege, COD, Apex, Valorant/CS2, Battlefield, and The Finals.
- User validation packets that compare app predictions to real player notes.
- Desktop foundation hardening from `docs/prompts/GITHUB_COPILOT_DESKTOP_FOUNDATION.md`.

## Prompt For The Next Implementation Pass

```text
Implement the CueForge v0.3 WAV Import UI.

Use the existing `extractWavFeatures` function from `src/wavFeatureExtractor.js`.
Add a local-only WAV import page that accepts `.wav`, reads it as an ArrayBuffer, extracts features, and displays the coach report.

Requirements:
- no upload
- no raw audio stored unless the user exports it
- show the honest boundary: inferred post-mix scene, not true game-world objects
- include temporal evidence, echo-scene confidence, stereo pan/width, transient score, and EQ decision
- add focused tests for any new pure helper logic
- run `npm test` and `npm run build`
```
