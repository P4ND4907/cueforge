# Repository Layout Plan

CueForge is moving from a working monolithic app into a production layout that is safer to test, package, and evolve.

## Target Shape

```text
cueforge/
  src/
    app/
    features/
      setup-command-center/
      autodetect/
      selftest/
      blind-match/
      hearing/
      report-lab/
      player-trial/
      machine-play-lab-ui/
    shared/
      schemas/
      privacy/
      audio/
      state/
  native/
    windows/
      bridge/
      wasapi-harness/
      probes/
      apo/
  qa/
    playwright/
      web/
      electron/
    audio/
      fixtures/
      manifests/
      analyzers/
      baselines/
      reports/
    hardware-profiles/
  swarm/
    routes/
    jobs/
    repair/
  tools/
    ffmpeg/
    scripts/
  docs/
    architecture/
    qa/
    release/
```

## Migration Rules

1. New product workflows start in `src/features`.
2. Cross-feature contracts go in `src/shared` or `src/core`.
3. Native helper and future WASAPI work go in root `native/`, with current implementation adapters allowed in `src/native` until the split is complete.
4. QA artifacts, fixtures, baselines, and reports go in root `qa/`, not app source.
5. Persona and randomized test orchestration goes in `swarm/`.
6. `src/main.jsx` is allowed to keep rendering the app while features are extracted one workflow at a time.
7. Every move needs tests before the old monolith code is deleted.

## Extraction Order

1. Setup Command Center: move command-center UI and card rendering behind `src/features/setup-command-center`.
2. Report Lab: move privacy-safe report and evidence UI behind `src/features/report-lab`.
3. Auto Detect: move chain graph and setup intelligence UI behind `src/features/autodetect`.
4. Hearing and Blind Match: move personalization UI behind `src/features/hearing` and `src/features/blind-match`.
5. Machine Play Lab UI: move metrics, fixture replay, native harness display, and regression oracle UI behind `src/features/machine-play-lab-ui`.

The rule is boring on purpose: extract one complete workflow, prove it, then move the next one.
