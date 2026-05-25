# State-Of-Art Gap Analysis

CueForge should be described as a sound-scene intelligence prototype, not a finished state-of-the-art acoustic imaging product.

## Current Readiness

The current codebase now has:

- real WAV parsing and PCM decoding
- STFT / FFT feature extraction
- band energy, transient score, stereo pan, and stereo width
- temporal evidence accumulation
- post-mix echo-scene inference with explicit confidence boundaries
- game audio engine and routing map
- common problem database
- benchmark metric helpers
- honest SOTA readiness evaluator

That makes CueForge a research prototype moving toward an advanced prototype.

## Current Blockers

- no committed labeled golden WAV clip suite yet
- no precision/recall benchmark over real player clips yet
- no live WASAPI loopback capture yet
- no process-specific game-only loopback capture yet
- no ML SELD or semantic acoustic imaging model yet
- no latency p95 benchmark in the live app yet
- no large real-player validation set yet

## Research Direction

DCASE 2026 is directly relevant:

- Task 3 covers Semantic Acoustic Imaging for SELD from spatial audio and audiovisual scenes.
- Task 4 covers Spatial Semantic Segmentation of Sound Scenes.

Those tasks aim at richer sound-scene understanding: not only what sound happened, but where it appears in an acoustic map or segmented spatial scene.

CueForge cannot match that from a rendered stereo mix alone. The correct product direction is:

```text
rendered audio evidence
-> local feature extraction
-> temporal confidence
-> masking / routing / scene inference
-> conservative tuning decision
-> player validation
```

## Honesty Rule

Do not claim true game-world position unless CueForge has at least one of:

- game or middleware metadata
- surround/object input that preserves spatial channels
- validated inference against labeled data

Without that, CueForge should say "post-mix inference" and show confidence.

## Sources To Track

- DCASE 2026 Challenge: https://dcase.community/challenge2026/index
- DCASE 2026 Task 3: https://dcase.community/challenge2026/task-semantic-acoustic-imaging-for-sound-event-localization-and-detection-from-spatial-audio-and-audiovisual-scenes
- DCASE 2026 Task 4: https://dcase.community/challenge2026/task-spatial-semantic-segmentation-of-sound-scenes
- Unreal spatialization overview: https://dev.epicgames.com/documentation/unreal-engine/spatialization-overview-in-unreal-engine
- Unity Audio Spatializer SDK: https://docs.unity.cn/6000.1/Documentation/Manual/AudioSpatializerSDK.html
- Wwise Rooms and Portals: https://www.audiokinetic.com/en/library/
- Steam Audio FMOD Spatializer: https://valvesoftware.github.io/steam-audio/doc/fmod/spatializer.html
- Human echolocation neural dynamics: https://www.ski.org/publication/neural-dynamics-of-human-click-based-echolocation/
- Active Audio Sensing: https://www.ecva.net/papers/eccv_2022/papers_ECCV/html/4904_ECCV_2022_paper.php
