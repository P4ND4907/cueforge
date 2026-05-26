# Audio Baselines

Golden metric baselines for before/after fixture regression.

For `eq-render-a-b`, the baseline should include integrated loudness, phase average, cue-band energy, DC offset state, clipping state, active default render endpoint fingerprint, communications endpoint fingerprint, and double-processing signature state. Store derived metrics and hashed endpoint fingerprints only, not raw device IDs or raw audio.
