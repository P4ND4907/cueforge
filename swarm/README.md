# Swarm Layer

The swarm layer turns CueForge's human-style QA into checked-in, replayable assets. It is for persona routes, scheduled/manual jobs, and reviewed repair queues. It is not telemetry, growth automation, or a hidden self-repair bot.

## Contract

Every route, job, and repair manifest must keep the same safety boundary:

- Raw audio export is off.
- Cloud upload is off.
- Device IDs and user paths are redacted.
- Public reports are summaries only.
- Windows audio settings, drivers, APO targets, Discord settings, and public posts are never changed by a swarm job.

Validate the whole layer with:

```powershell
npm.cmd run validate:swarm
```

## Folders

- `routes/` describes what a persona or randomized tester should walk through.
- `jobs/` describes when and how those route manifests run.
- `repair/` describes which safe fixes can be queued after a route or Panda Note failure.

The validator lives in `src/shared/schemas/swarmManifest.js`, and the release tests live in `src/tests/swarmManifests.test.js`.
