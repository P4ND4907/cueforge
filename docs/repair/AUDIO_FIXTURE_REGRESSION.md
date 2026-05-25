# Audio Fixture Regression

Status: PASS
Generated: 2026-05-24T10:47:04.528Z

| Check | Status | Detail |
| --- | --- | --- |
| spectral-cue-region | PASS | Cue/presence delta 7.41dB. |
| louder-but-not-clearer-guard | PASS | Low-mask delta 0dB, loudness delta 1.61dB. |
| clipping-risk | PASS | Clipping risk 100/100. |
| phase-inversion | PASS | Stereo polarity inversion is detected as a fail state. |
| ffmpeg-reference-plan | PASS | FFmpeg astats, ebur128, aphasemeter, and axcorrelate references are declared. |
| eq-render-a-b-policy | PASS | Policy locks WASAPI loopback, +/-1 LUFS, phase > 0.95, cue +1.5 to +3dB, no DC offset, and no clipping. |
| usable-signal | PASS | Chain integrity pass. |

## Metrics

- Cue/presence delta: 7.41dB
- Low-mask delta: 0dB
- Loudness delta: 1.61dB
- Clipping risk fixture: 100/100
- Phase fixture status: fail
- EQ render A/B policy: PASS (1.76dB cue lift, 0.73 LUFS loudness delta, phase 1)

Boundary: this runner uses deterministic synthetic buffers only. It does not capture, upload, route, or apply live audio.
