# CueForge Discord High-Flow Playbook

Goal: make CueForge feel alive without turning it into a maze. Big servers work because the first path is obvious, noisy traffic has a container, and staff/mod areas stay out of the way.

## What To Borrow

1. Keep the first screen simple.
   New testers should see `START HERE`, `SETUP LAB`, `REPORTS + IDEAS`, `MATCH TESTING`, `BAMBOO LOUNGE`, and private/voice areas after that. Do not add channels just because a bigger server has them.

2. Use roles and onboarding to shrink the visible server.
   Good onboarding asks what the member is here for, then shows only the channels that matter. CueForge should ask for game, gear, and testing style.

3. Treat repeated feedback like support tickets.
   Reports should use templates and threads so real issues do not get buried. One issue, one thread/post, one outcome.

4. Keep announcements separate from chat.
   `lab-updates` is for release notes, test nights, and plans. `bamboo-lounge` is for normal talk.

5. Make every channel answer one question.
   If a channel cannot explain itself in one sentence, merge it or rename it.

## Applied CueForge Flow

```text
LIVE ROOMS + STAFF
- private live rooms, private build rooms, moderator/test voice
- collapsed by default so it does not own the first impression

START HERE
- lab-updates
- rules
- general
- faq-roadmap
- role-picker
- start-here

SETUP LAB
- mic-checks
- signal-setups
- eq-forge
- match-audio
- setup-showcase

REPORTS + IDEAS
- bug-replays
- pawprint-ideas
- wild-lab

MATCH TESTING
- match-checkins
- fps-specific
- clip-evidence
- wins-and-fails

BAMBOO LOUNGE
- side-chat
- bamboo-lounge
- panda-radio

STAFF FORGE
- dev-backroom
- build-notes
- triage-queue

VOICE LAB
- panda-radio-voice
- mic-check-voice
- match-comms-voice
- listening-lab-voice
```

## Live Status - May 22, 2026

Posted and verified in the live CueForge Beta Discord:

```text
start-here: final quick path with CueForge link, testing loop, and privacy reminder.
lab-updates: server cleanup announcement and channel flow.
match-checkins: before/after real-match report template.
bug-replays: replayable bug report template.
signal-setups: gear-chain setup template.
```

Still needs Discord settings/UI approval:

```text
Make start-here, rules, lab-updates, and faq-roadmap read-only.
Create public tester/game roles and staff roles.
Assign Chiefyy's staff role only after confirming the exact account in-server.
Enable Community Onboarding / Server Guide when available.
Add one trusted moderation/helper bot only after reviewing its permission prompt.
```

Do not automate:

```text
Passwords, tokens, DOB, phone numbers, recovery codes, fake joins, auto-watchers, self-bots, or spam posting.
```

## Server Guide Copy

Post in `start-here`:

```text
Welcome to CueForge Beta.

This is the Panda Lab for FPS audio: IEMs, headsets, mics, Discord chains, Equalizer APO, Peace, Sonar, clips, and real match notes.

Fast path:
1. Open CueForge: https://p4nd4907.github.io/cueforge/
2. Run Setup Journey and Self Test.
3. Post your gear in #signal-setups.
4. Play one real match.
5. Post what changed in #match-checkins or what broke in #bug-replays.

Use threads for anything that needs follow-up. Keep private info private.
```

Post in `match-checkins`:

```text
Match check-in format:

Game:
Map/mode:
Gear:
Mic:
Tools running:
CueForge profile:

Before:
After:
What improved:
What got worse:
Likely cause: tuning / game audio / server timing / Discord / mic / Windows routing
```

Post in `bug-replays`:

```text
Report format:

What broke:
Expected:
Actual:
Steps to reproduce:
Game/gear/tools:
Browser or desktop shell:
Redacted report attached? yes/no
Clip or screenshot:
Can staff reproduce it? yes/no/unknown
```

Post in `signal-setups`:

```text
Setup format:

IEM/headset:
Mic:
DAC/interface:
Windows output:
Discord settings:
EQ/APO/Peace/Sonar:
Game:
What you are trying to hear better:
What currently sounds wrong:
```

## Onboarding Questions

Use these once Community Onboarding is enabled:

```text
What are you testing with?
- IEMs
- Headset
- Mic / Discord comms
- Equalizer APO / Peace
- Clips and match evidence

What games do you care about?
- Tarkov
- Siege
- COD / Warzone
- Apex
- CS2 / Valorant
- Other FPS

How serious is your testing?
- Casual tester
- Competitive tester
- Bug/repro tester
- Setup helper
```

Default channels should be limited to `start-here`, `rules`, `lab-updates`, `role-picker`, `signal-setups`, `match-checkins`, `bug-replays`, and `bamboo-lounge`.

## High-Traffic Rules

```text
One report per thread.
No raw passwords, DOB, phone numbers, recovery codes, raw device IDs, or private screenshots.
No fake activity, reward farming, self-bots, or spam joins.
Use clips when the audio issue is hard to describe.
If the problem is probably the game/server/Discord/Windows and not CueForge, say that.
```

## Sources

- Discord Forum Channels FAQ: https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQDiscord
- Discord Community Onboarding Examples: https://support.discord.com/hc/en-us/articles/10394859532823-Community-Onboarding-Examples
- Discord Server Guide FAQ: https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ
- Discord game community guide: https://docs.discord.com/developers/game-development/how-to-create-a-community-for-your-game
- Discord community setup guide: https://discord.com/community/getting-set-up
- Discord verified moderation guidance: https://support.discord.com/hc/en-us/articles/115001987272-Verified-Server-Moderation-Guidelines
