# Machine Play Lab UI

The proof UI for fixture rendering, native measurement plans, analyzer metrics, and lab replay.

Owns:

- Fixture/test-manifest presentation.
- Audio Metrics Engine results.
- Native harness plan visibility.
- Regression Oracle handoff.

Boundary: this can measure, render, summarize, and replay. It cannot silently capture live input, upload evidence, or modify system audio state.
