# Privacy Notes

AudioTuner is local-first. The app does not send reports, device data, mic input, or tuning files to a server.

## Local Data

The app may store these items in browser local storage:

- Hearing model progress.
- Audio DNA history.
- Blind Match results.
- Latest self-test results.
- Latest redacted issue report.
- Latest player trial packet.

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

`tools/audio-setup-report.json` is generated from the local Windows machine. It can contain local device and install data, so it is ignored by Git and excluded from release ZIPs.
