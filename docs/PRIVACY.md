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

## Redacted Reports

Report exports remove or generalize:

- Raw browser device IDs.
- Group IDs.
- Windows `DeviceID` fields.
- Computer and user names.
- Config paths and Windows paths.
- Full browser user-agent strings.
- Emails and phone numbers in notes.

Reports keep the useful debugging parts:

- EQ curve.
- Selected game and source profile.
- Browser audio capability flags.
- Sanitized device summary.
- Self-test results.
- Player notes after redaction.

## Files Not For Git

`tools/cueforge-audio-setup-report.json` is generated from the local Windows machine. It can contain local device and install data, so it is ignored by Git and excluded from release ZIPs.

## Beta Check-in

Beta Check-in stores an anonymous tester ID and check-in history in local browser storage. It does not send analytics, passwords, phone numbers, DOB, recovery data, or raw device IDs anywhere.

When a tester exports a beta packet, they choose whether to attach it to GitHub or send it manually. The packet exists to prove real sessions happened without secretly tracking players.
