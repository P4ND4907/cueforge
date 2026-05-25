# Privacy Notes

CueForge is local-first. The app does not send reports, device data, mic input, or tuning files to a server.

## Local Data

The app may store these items in browser local storage:

- Hearing model progress.
- Audio DNA history.
- Blind Match results.
- Latest self-test results.
- Latest redacted issue report.
- Latest player trial packet.
- Anonymous beta tester ID and beta check-ins.
- Gameplay save settings and capped gameplay save snapshots.
- Shortcut Vault entries for player links/actions and locked developer codes.
- App settings for quiet mode, background soundwalk audio, cinematic video audio, Panda Notes, and desktop bridge hints.

## Redacted Reports

Report exports remove or generalize:

- Raw browser device IDs.
- Group IDs.
- Windows `DeviceID` fields.
- Computer and user names.
- Config paths and Windows paths.
- Full browser user-agent strings.
- Emails and phone numbers in notes.
- Code-like shortcuts, tokens, passwords, secrets, and private release codes.

Reports keep the useful debugging parts:

- EQ curve.
- Selected game and source profile.
- Browser audio capability flags.
- Sanitized device summary.
- Self-test results.
- Player notes after redaction.
- Public player shortcuts after locked code shortcuts are replaced with `[locked]`.

## Audio Evidence

CueForge audio evidence exports are summaries, not recordings.

- Raw audio stays local by default.
- Uploads are opt-in only.
- Public evidence packets include derived metrics such as level, voice presence, noise, clip risk, analyzer summary, recommendations, and suggested tweaks.
- Public evidence packets do not include raw audio blobs, `data:audio` URLs, full system dumps, raw usernames, phone numbers, emails, Windows paths, or raw device IDs.
- Tester identity is represented with a hashed fingerprint when a packet needs stable correlation.

This is enforced by `src/core/evidencePrivacyPolicy.js`, `src/audioEvidence.js`, and the export redaction gate.

## Protected Playback Boundary

Desktop loopback capture is a measurement tool, not a universal recorder. Windows playback paths can be constrained by DRM or protected-content behavior, so CueForge should never promise that it can capture every protected stream. The lab can report when loopback proof is unavailable and fall back to fixture rendering, explicit mic/input checks, and player-visible A/B tests.

## Files Not For Git

`tools/cueforge-audio-setup-report.json` is generated from the local Windows machine when the manual scanner is run. It can contain local device and install data, so it is ignored by Git and excluded from desktop release packages. The packaged desktop build includes the scanner script, not a captured report.

## Beta Check-in

Beta Check-in stores an anonymous tester ID and check-in history in local browser storage. It does not send analytics, passwords, phone numbers, DOB, recovery data, or raw device IDs anywhere.

When a tester exports a beta packet, they choose whether to attach it to GitHub or send it manually. The packet exists to prove real sessions happened without secretly tracking players.

## Gameplay Save

Gameplay Save stores small local snapshots on a throttle. A snapshot contains EQ values, selected game, source profile, and beta summary. It does not record audio, track gameplay, send network analytics, or store private account data.
