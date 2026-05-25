# CueForge Live Social Sprint - May 25, 2026

Use this pack for the next live pass across Discord, X, Reddit, and community discovery. The goal is useful tester conversations, not noisy reach.

## Current Story

CueForge just got a practical Auto Detect upgrade:

- cleans ugly Windows/browser audio device names
- lets testers save friendly headset/mic names
- saves game profiles
- can auto-switch profiles when a saved game/process is detected
- keeps the public CTA on the web app instead of pushing desktop downloads everywhere

This is the best hook right now:

```text
Need Windows FPS players with messy headset/mic setups to test whether CueForge detects the right devices and explains the setup clearly.
```

## Fresh Proof To Quote

Use only these proof lines until a newer verification replaces them:

```text
npm.cmd test: 78 files / 304 tests passed
npm.cmd run build: passed
npm.cmd run test:playwright:web: 4 browser smoke tests passed
Focused mocked-device QA: ugly SteelSeries/Windows device labels cleaned, friendly aliases saved, game-profile editor visible
CueForge PR: https://github.com/P4ND4907/cueforge/pull/2
```

## Safety Posture

Say this often:

- no account needed for web testing
- no raw recording upload
- no hidden telemetry claim
- no silent driver changes
- no fake enemy-position claims
- export/apply steps stay review-first

Avoid these words in public copy unless explaining what CueForge does not do:

```text
optimizer, debloat, registry cleaner, boost footsteps, magic surround, hear through walls
```

## Live Order

1. Discord owned update in the CueForge server.
2. X update post with one app link.
3. Follow 8-10 relevant X accounts, then stop.
4. Reddit: one invited/product thread reply or one no-link helpful comment, not a promo post.
5. Join/watch Discord communities manually, then read before posting.
6. Log every live action in `docs/social/COMMUNITY_MEMORY.md`.

## Discord Owned Update

Post in `#lab-updates`.

```text
CueForge update:

Small feature, big trust win.

Auto Detect now cleans up weird Windows/browser audio device names so testers do not have to guess which "Default - 00000000" or numbered headset entry is the real one.

New in the current branch:
- cleaned headset/mic names
- editable friendly device names
- saved game profiles
- auto-switch when a saved game/process is detected
- safer public flow that points testers to the web app first

What I need now:
Windows FPS players with real messy setups. SteelSeries, HyperX, Realtek, USB DACs, Discord, Sonar, APO, Peace, Voicemeeter, weird mic names, all of it.

Run Auto Detect, check whether it names the right headset/mic, save a friendly name if needed, play one match, and tell me what felt better, worse, or confusing.

Web app:
https://p4nd4907.github.io/cueforge/

PR/proof:
https://github.com/P4ND4907/cueforge/pull/2
```

## X Post

```text
CueForge update:

Auto Detect now cleans ugly Windows/browser audio device names, lets testers save friendly headset/mic labels, and supports saved game profiles for auto-switching.

Need Windows FPS players with messy audio setups to test it.

https://p4nd4907.github.io/cueforge/

#CueForge #FPSAudio #PCGaming #GamingAudio
```

## X Follow Wave

Follow at most 10, then pause and read/reply:

```text
@SteelSeries
@SteelSupport
@HyperX
@LogitechG
@NVIDIAGeForce
@Windows
@PlayVALORANT
@CounterStrike
@Rainbow6Game
@tarkov
```

Do not ask for follow-backs. Do not reply with links unless someone asks what CueForge is.

## Reddit Mode

Reddit stays comment-first. The current account has had filtered posts, so do not create a new launch post today.

### Best Visible Feed Opportunity

The current Reddit feed shows an `r/micro_saas` thread titled:

```text
Drop your product, I'll help you find your first 100 users
```

This is a better fit than cold posting because the thread is explicitly asking for products. Use one concise reply. If the account looks fragile, leave the direct app link out and say the link is on the profile.

Reply:

```text
CueForge - a local-first web app for Windows FPS players who have messy headset/mic/audio stacks.

It helps players check the real audio chain, clean up confusing device names, test mic/EQ changes, save game profiles, and export configs/reports without dumping private device IDs.

The first 100 users I need are not generic gamers. I need people with SteelSeries/HyperX/Realtek/USB DAC/Discord/Sonar/APO setups who can run Auto Detect, play one real match, and say what got clearer, worse, or confusing.

Link is on my profile. I am mostly trying to learn where those players already hang out.
```

### No-Link Helpful Comment

Use for headset/audio-routing threads:

```text
Before changing EQ again, I would verify the actual device path. Windows default device, game output, Discord input/output, Sonar game/chat, APO/Peace target, and headset app processing can all be different layers. The clean test is one spatial mode, one EQ, same volume, same map/range, then one real match note for direction, comms, mic clarity, and fatigue.
```

## Discord Join Targets

Use manual Chrome joins only. Read rules first, do not introduce CueForge immediately, and do not DM people unsolicited.

Target categories:

- SteelSeries/Sonar community or official support server if available
- Equalizer APO / Peace EQ community if available
- PC gaming hardware/community servers with setup-help channels
- game-specific servers with audio/help/off-topic channels for Siege, Valorant, CS2, Tarkov, Apex, or Warzone
- beta tester / indie maker servers only if they have a feedback channel

First safe intro, only where introductions are normal:

```text
Hey, I am building CueForge, a small Windows-first gaming audio setup checker. Mostly here to learn what headset/mic/routing problems people keep hitting. I will keep links out unless someone asks or the rules allow it.
```

## What To Log

For every action, add a line to `COMMUNITY_MEMORY.md`:

```text
Date:
Platform:
Community/thread:
Action:
Link:
Result:
Next follow-up:
```

## Stop Conditions

Stop posting for the session if:

- Reddit filters/removes a comment
- X shows rate-limit or suspicious-activity warnings
- Discord asks for verification or moderator approval
- any community rules are unclear
- the account is not the correct CueForge/P4ND4907 account
