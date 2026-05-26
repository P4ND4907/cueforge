# Audio Fixtures

Deterministic clips and generated buffers for masking, speech, rumble, clipping, channel, and stereo-health tests.

The first A/B policy fixture is `cue_steps_reference.wav`: a short reference cue-step render used by `eq-render-a-b` to prove bounded cue-band lift, stable loudness, phase health, no DC offset warning, and no clipping. The committed policy lives in `qa/audio/policies/eq-render-a-b.json`; the WAV itself should be generated or captured locally by the lab runner, not uploaded from a player session.

Raw player recordings do not belong here unless explicitly redacted and approved.
