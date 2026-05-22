# CueForge Discord Final Buildout

This is the finished server setup target.

## Public Roles

```text
Panda Pilot
IEM Listener
Headset Grinder
Mic Checker
EQ Forger
Clip Hunter
Bug Tracker
Tarkov Ears
Siege Sound
COD / Warzone
Apex Audio
CS2 / Valorant
Casual Tester
Sweat Stack
```

## Staff / Private Roles

```text
Forge Lead
Lab Mod
Build Tester
Triage
```

## Bot Stack

Use one custom bot plus one moderation bot.

Custom:

```text
CueForge Panda Guide
```

Purpose:

```text
Welcomes new members, posts starter links, gives slash-command templates for check-ins, bugs, setups, and test nights, and helps daily roll calls stay useful.
```

Recommended moderation/helper bot:

```text
Sapphire, Dyno, or Carl-bot
```

Use for:

```text
Reaction roles
AutoMod helpers
Welcome messages
Slowmode/mod logs
Basic anti-spam
```

Do not add multiple overlapping moderation bots at the start. One helper bot is enough.

## Bot Commands

```text
/start - sends the new tester quick path
/checkin - posts the before/after match check-in format
/bug - posts the replayable bug report format
/setup - posts the gear-chain format
/testnight - posts a short test-night call
/rollcall - posts a public daily tester roll call
/diagnose - helps decide if an issue is tuning, game mix, server/desync, routing, Discord, or mic chain
/social - drafts a human-approved Discord/X/Reddit post that points back to the hub
/prompt - drops one quick community prompt
```

Use `/rollcall` in `lab-updates` or `match-checkins` before a test block. Use `/diagnose` when someone says "audio is bad" but the cause is unclear. Use `/social` for posts that need approval before leaving Discord.

## Welcome Message

```text
Welcome to the CueForge Panda Lab.

This server is for players who want better FPS audio without guessing forever. Bring your IEMs, headset, mic, Discord chain, Equalizer APO setup, clips, and honest feedback.

Fast path:
1. Open CueForge: https://p4nd4907.github.io/cueforge/
2. Run Setup Gate.
3. Run Self Test.
4. Play one real match.
5. Post what changed in #match-checkins or what broke in #bug-replays.

Useful beats perfect. If CueForge makes something worse, say it.
```

## Role Picker Message

```text
Pick your lane.

React or reply with what fits:

Panda Pilot - general beta tester
IEM Listener - IEM testing
Headset Grinder - headset testing
Mic Checker - mic and Discord clarity
EQ Forger - Equalizer APO / Peace tuning
Clip Hunter - clips and replay evidence
Bug Tracker - reports and repro steps
Sweat Stack - serious competitive testing
Casual Tester - lower pressure testing

Game tags:
Tarkov Ears
Siege Sound
COD / Warzone
Apex Audio
CS2 / Valorant
```

## Suggested Channel Topics

```text
start-here: First stop. Read this before posting reports or clips.
lab-updates: Daily plans, progress, release notes, and test nights.
role-picker: Pick your tester lane and game tags.
match-checkins: One real match, one honest before/after report.
bug-replays: Repro steps, redacted reports, broken flows, and recovery notes.
signal-setups: Gear chains: IEMs, headsets, mics, APO, Peace, Sonar, Discord, Windows routing.
match-audio: Footsteps, direction reads, clutter, fatigue, comms, and game-specific feedback.
eq-forge: APO configs, Peace imports, tuning questions, and curve comparisons.
mic-checks: Gain, clipping, noise, boom, voice presence, and Discord mic tests.
fps-specific: Tarkov, Siege, COD, Apex, CS2, Valorant, Battlefield, and other FPS notes.
pawprint-ideas: Quick ideas, weird experiments, and useful complaints.
clip-evidence: Clips or replay notes showing audio wins, fails, or confusing moments.
setup-showcase: Show your desk, gear chain, or before/after setup.
wild-lab: Experimental ideas that might become real CueForge features.
wins-and-fails: What worked, what failed, and what surprised you.
dev-backroom: Private build planning, triage, and release prep.
```

## Happiness Layer

Weekly prompts:

```text
What game lied to your ears this week?
What headset/IEM surprised you?
Drop a clip where audio won or sold.
What setting did you change that actually helped?
What should CueForge test next?
```

Daily roll call examples:

```text
Tonight's Panda Lab roll call:
- What game are you testing?
- What headset/IEM/mic chain are you using?
- Did CueForge help, hurt, or do nothing?
- Drop one thing you want changed next.
```

Diagnosis split:

```text
Do not assume every audio problem is EQ.
Check game mix, server/desync, Windows routing, Discord processing, mic gain, and only then CueForge tuning.
```

Server vibe:

```text
Curious, funny, useful, player-first, no corporate sludge.
```
