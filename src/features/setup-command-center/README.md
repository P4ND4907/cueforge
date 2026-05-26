# Setup Command Center

Default product surface for the guided setup engine.

Owns:

- First-run setup health.
- Audio chain summary.
- Next best action.
- Export/apply status.
- Handoff into Auto Detect, checks, personalization, Player Trial, and Report Lab.

Migration rule: new setup orchestration belongs here first, then `src/main.jsx` should consume it instead of duplicating command-center logic.
