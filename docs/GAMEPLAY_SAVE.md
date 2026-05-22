# Gameplay Save

Gameplay Save lets testers keep CueForge running during matches without wasting memory or storage.

## What It Saves

- Current 10-band EQ.
- Selected game profile.
- Selected source profile.
- Beta check-in summary.
- Save timestamp and source.

## What It Does Not Save

- Audio recordings.
- Passwords, email recovery data, phone numbers, or DOB.
- Raw Windows device IDs.
- Gameplay capture.
- Network analytics.

## Performance Rules

- Auto-save is throttled.
- Storage history is capped.
- Snapshots are small JSON objects.
- Live mic meters can run in lighter performance mode.
- No background upload happens.
