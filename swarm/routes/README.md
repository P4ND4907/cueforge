# Swarm Routes

Route manifests describe the app surfaces the swarm must test like a real player.

Each route includes:

- Entry surface.
- Required selectors.
- Expected state transitions.
- Required native APIs.
- Fixture IDs.
- Analyzer thresholds.
- Privacy constraints.
- Failure owner.
- Safe auto-repair actions.
- Escalation level.

Current routes:

- `setup-command-center.route.json`
- `auto-detect.route.json`
- `self-test.route.json`
- `report-lab.route.json`

Selectors are intentionally written as a contract for the app and the future CDP runner. If a route cannot be tested with stable selectors, the app should add better player-facing anchors before the route becomes release-blocking.
