# Audio Regression Policies

Versioned pass/fail contracts for audio fixture and loopback regression runs.

`eq-render-a-b.json` is the minimum CueForge A/B policy: it uses `cue_steps_reference.wav`, captures the active default render endpoint with WASAPI loopback, requires bounded loudness/phase/cue-band behavior, and fails on device changes, communications endpoint hijacks, double processing, DC offset, or clipping.

These files define proof gates only. They do not capture audio, upload data, change Windows audio devices, or apply EQ.
