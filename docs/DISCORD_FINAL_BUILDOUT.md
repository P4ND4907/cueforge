# CueForge Discord Final Buildout

This is the finished server setup target.

## Live Status - May 22, 2026

Completed in the live `CueForge Beta` Discord:

```text
Community Server: enabled
Onboarding: ON
Rules channel: #rules
Community updates channel: #lab-updates
Default onboarding channels: 9 total, 6 chattable
Server Guide: welcome sign, starter tasks, and resource pages configured
Chiefyy Forge Queen: assigned to Chiefyy / chiefbabyy with Administrator enabled
Bamboo Mod: moderation permissions enabled without Administrator
Read-only pages verified: start-here, rules, lab-updates, faq-roadmap
```

May 24 social update queue:

```text
Use `docs/social/2026-05-24-social-command-center.md` for the current #lab-updates post, short pinned reminder, profile copy, and timeline.
Core message: CueForge is the audio chain verifier and personal sound engine for gamers.
Safe claim boundary: no magic surround, no exact enemy position claims, no public-release-ready claim until real Windows loopback proof passes.
```

Onboarding default path:

```text
start-here
rules
lab-updates
role-picker
signal-setups
match-checkins
bug-replays
clip-evidence
bamboo-lounge
```

Onboarding question:

```text
What are you testing first?
```

Answers:

```text
IEM / headset tuning - signal-setups, eq-forge, match-checkins, clip-evidence
Mic and comms check - mic-checks, match-audio, bug-replays
Bug replay or clip review - bug-replays, clip-evidence, match-checkins
Game-specific audio feedback - match-audio, match-checkins plus game roles
```

Server Guide tasks:

```text
Read the rules.
Post your audio chain in #signal-setups.
Say what changed after one match in #match-checkins.
Drop a clip or replay when audio feels off in #clip-evidence.
```

Resource pages:

```text
lab-updates
faq-roadmap
start-here
```

Bot note: do not authorize any third-party bot without a visible permission review. Start with the custom CueForge Panda Guide, then add one trusted helper only if it solves a real gap.

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
Chiefyy Forge Queen
Bamboo Mod
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
AutoMod helpers
Welcome messages
Slowmode/mod logs
Basic anti-spam
```

Role picker update:

```text
Use the custom CueForge Panda Guide for role picking first.
The /roles command posts both buttons and matching reactions.
It stores role-panel message ids locally so reaction roles keep working after restarts.
MEE6/Carl-bot/Dyno stay in the back pocket only if moderation or anti-spam needs outgrow the custom bot.
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
/rewardrules - explains points, caps, proof, and tiers
/watchparty - posts a real watch-party/test-lab prompt
/questboard - posts five small useful quests
/serverguide - posts the polished new-member guide
/roles - mod-only command that posts click/reaction-to-pick tester and game roles
/modroles - shows the private staff role map
/claim - lets testers claim capped points for real participation
/score - shows a tester's points and tier
/leaderboard - shows the top testers
/award - mod-only verified reward
```

Use `/rollcall` in `lab-updates` or `match-checkins` before a test block. Use `/diagnose` when someone says "audio is bad" but the cause is unclear. Use `/social` for posts that need approval before leaving Discord.

## Server Guide Setup

Use Discord `Server Settings > Onboarding` and set:

Default channels:

```text
start-here
rules
lab-updates
role-picker
signal-setups
match-checkins
bug-replays
clip-evidence
bamboo-lounge
```

New member to-dos:

```text
Read the rules.
Post your audio chain in #signal-setups.
Say what changed after one match in #match-checkins.
Drop a clip or replay when audio feels off in #clip-evidence.
```

Resource pages:

```text
Start Here
Rules + Privacy
Tester Guide
Rewards
FAQ / Roadmap
```

If a channel is mostly reading material, make it a Server Guide resource page or keep it read-only. If a channel needs conversation, give it one clear job and pin the format.

## Alive But Not Messy

Weekly server rhythm:

```text
Monday - Setup clinic
Tuesday - Mic checks
Wednesday - Watch party / clip review
Thursday - Match test night
Friday - Patch notes and wild ideas
Weekend - Open squad tests
```

Pin one prompt per active room:

```text
match-checkins: Game, gear, before, after, what changed.
bug-replays: What broke, steps, report, clip, no private info.
signal-setups: Gear chain, tools, Windows routing, what you want fixed.
clip-evidence: Link, timestamp, what audio did right or wrong.
mic-checks: Mic, gain, Discord settings, evidence result.
```

## Reward Loop

```text
Allowed:
- Real watch parties
- Match tests
- Clip evidence
- Replayable bug reports
- Setup-chain posts
- Helping another tester

Not allowed:
- Auto-watchers
- Fake activity
- Reward farming
- Spam joins
- Self-bots
```

Point tiers:

```text
25 - Lab Regular
60 - Signal Hunter
120 - Panda Captain
220 - Forge Legend
```

Self-claims are capped at 3 per person per day. Mods can use `/award` when someone does extra verified work.

## Role Colors

```text
Chiefyy Forge Queen - gold
Bamboo Mod - teal
Build Tester - blue
Panda Pilot - green
IEM Listener - teal
Headset Grinder - slate
Mic Checker - pink
EQ Forger - purple
Clip Hunter - orange
Bug Tracker - red
Tarkov Ears - dark teal
Siege Sound - gold
COD / Warzone - deep red
Apex Audio - orange
CS2 / Valorant - blue
Casual Tester - gray
Sweat Stack - red
```

Public click roles should be tester/game roles only. Do not make `Chiefyy Forge Queen` or `Bamboo Mod` public self-assign buttons.

## Welcome Message

```text
Welcome to the CueForge Panda Lab.

This server is for players who want better FPS audio without guessing forever. Bring your IEMs, headset, mic, Discord chain, Equalizer APO setup, clips, and honest feedback.

Fast path:
1. Open CueForge: https://p4nd4907.github.io/cueforge/
2. Run Self Test.
3. Import or auto-detect your setup.
4. Play one real match.
5. Post what changed in #match-checkins or what broke in #bug-replays.

Useful beats perfect. If CueForge makes something worse, say it.
```

## Role Picker Message

```text
Pick your lane.

Click a button or react with what fits:

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

Bot permission checklist:

```text
Manage Roles
Add Reactions
Read Message History
View Channel
Send Messages
Use Slash Commands
SERVER MEMBERS INTENT enabled in the Developer Portal
Bot role placed above public tester/game roles
Bot role kept below private owner/mod roles unless explicitly needed
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
