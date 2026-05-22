# CueForge Architecture

CueForge has two platform layers.

## Web Build

The web build is the current product surface. It is used for:

- Setup readiness checks.
- Mic and headphone testing through browser audio APIs.
- EQ generation and Equalizer APO text export.
- Hearing model, Audio DNA, Blind Match, and Tactical Masking Lab.
- Redacted player reports and replayable tester packets.

The web build should not write Windows audio settings, install drivers, or change routing.

## Windows Desktop Shell

A desktop shell is the correct next layer when CueForge needs native control. The desktop app can wrap the existing React UI and add a small native bridge for:

- Reading Windows audio endpoints with stable device names.
- Detecting Equalizer APO, Peace, Sonar, and active routing.
- Saving reviewed Equalizer APO draft files after explicit approval.
- Backing up existing configs before any future target-file write.
- Running setup checks without browser permission friction.

Current path: Electron with a locked-down preload bridge. The desktop bridge can run the existing Windows audio scanner from inside CueForge, store the report in the app data folder, return the parsed result to Auto Detect, save timestamped APO draft files, and open the relevant app-data folders.

Future native writes to real Equalizer APO or Windows locations should stay behind the same bridge and must be reviewed separately.

## Native Action Rules

Every native action should follow the same pattern:

1. Show exactly what will change.
2. Require an explicit user click.
3. Create a backup when writing files.
4. Apply the change.
5. Show the result and how to undo it.

No silent installs. No hidden routing changes. No background driver edits.
