# Swarm Jobs

Job manifests describe reproducible swarm runs. They are release contracts, not background operators.

Each job records:

- Trigger.
- Command.
- Seed.
- Route coverage.
- Output artifacts.
- Hard gates for system mutation and public posting.
- The same privacy lock used by route manifests.

Current jobs:

- `daily-smoke.job.json`
- `nightly-audio-regression.job.json`
- `release-candidate.job.json`

Jobs can run tests and write local reports. They cannot post publicly, change Windows audio state, install drivers, write APO configs, or upload raw player evidence.
