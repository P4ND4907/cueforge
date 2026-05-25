# Swarm Repair

Repair manifests define what the app is allowed to do after Panda Notes, redacted reports, or swarm routes find a problem.

Current repair queues:

- `panda-notes.repair.json`
- `route-regressions.repair.json`

Allowed repairs are narrow: copy fixes, layout fixes, selector regressions, fixture updates, and reviewed tickets. Blocked repairs include public posting, Windows audio changes, APO writes, raw audio upload, and private account data storage.

Source edits still require developer review and passing tests.
