# CueForge Tester Guide

Thanks for testing CueForge. The goal is simple: find out whether the app helps real players get clearer cues, cleaner comms, and better mic confidence without leaking local machine data.

CueForge is not a preset pack from a big company. It is a player-built audio lab. Import or auto-detect your setup, run one real match, and send the truth back. Better, worse, or weird all helps.

## Who Should Test

- FPS players using IEMs, gaming headsets, or USB DACs.
- Players using a HyperX-style boom mic, standalone USB mic, or headset mic.
- Players using Equalizer APO, Peace, SteelSeries Sonar, Discord, or Windows audio routing.
- Anyone who notices inconsistent footsteps, harsh IEM treble, muddy explosions, or unclear comms.

## Test Session

1. Open the web app.
2. Open `Community Hub` and copy the roll call if you are coordinating feedback in Discord.
3. Run `Self Test`.
4. Open `Auto Detect` and import or auto-detect your setup.
5. Open `Mic Lab` and confirm live mic feedback works.
6. Open `Calibration` and generate a profile.
7. Open `EQ Studio` and review the Equalizer APO export.
8. Open `Player Trial`, play one match or round, complete the five-step script, and export the tester packet.
9. Open `Report Lab` and export a redacted issue report if anything breaks.

## What To Send Back

Use GitHub issues and include:

- Game tested.
- Headset/IEM and mic used.
- Whether Equalizer APO, Peace, Sonar, or Discord was part of the setup.
- What improved.
- What got worse.
- Whether the issue feels like tuning, the game mix, server timing, Discord, mic setup, or Windows routing.
- The exported Player Trial packet.
- The redacted Report Lab JSON for bugs.

Do not paste unredacted Windows device reports into GitHub.

## Response Expectations

GitHub issues are the repair queue. The hourly CueForge issue watcher checks for new bug and tester-feedback reports, tries to reproduce clear issues, runs tests when it changes code, and comments back with either a fix result or the missing details needed.

Target response rhythm:

- Clear privacy leak: same day when seen.
- Reproducible broken flow: first triage within about an hour while the watcher is active, fix attempt as soon as the report has enough detail.
- Tuning feedback: grouped into the next calibration/profile pass.
- Vague reports: watcher asks for the exact page, setup import, report packet, and what changed in-game.

## Privacy Check

Report Lab should remove raw device IDs, group IDs, Windows paths, computer names, full user-agent strings, emails, and phone numbers. If you see any of those in a report preview, open a Privacy / Redaction Review issue.
