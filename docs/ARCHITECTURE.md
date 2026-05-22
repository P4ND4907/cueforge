# AudioTuner Architecture

AudioTuner has two platform layers.

## Web Build

The web build is the current product surface. It is used for:

- Setup readiness checks.
- Mic and headphone testing through browser audio APIs.
- EQ generation and Equalizer APO text export.
- Hearing model, Audio DNA, Blind Match, and Tactical Masking Lab.
- Redacted player reports and replayable tester packets.

The web build should not write Windows audio settings, install drivers, or change routing.

## Windows Desktop Shell

A desktop shell is the correct next layer when AudioTuner needs native control. The desktop app can wrap the existing React UI and add a small native bridge for:

- Reading Windows audio endpoints with stable device names.
- Detecting Equalizer APO, Peace, Sonar, and active routing.
- Writing Equalizer APO config files after explicit approval.
- Backing up existing configs before changes.
- Running setup checks without browser permission friction.

Recommended path: Tauri or Electron with a locked-down native bridge. Keep the bridge narrow, audited, and user-approved.

## Native Action Rules

Every native action should follow the same pattern:

1. Show exactly what will change.
2. Require an explicit user click.
3. Create a backup when writing files.
4. Apply the change.
5. Show the result and how to undo it.

No silent installs. No hidden routing changes. No background driver edits.
