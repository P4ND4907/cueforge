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

URL:

```text
https://www.reddit.com/r/micro_saas/comments/1tljvaz/drop_your_product_ill_help_you_find_your_first/
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

Validated targets from the May 25 search pass:

| Priority | Community | Link | Why it fits | First action |
| --- | --- | --- | --- | --- |
| 1 | SteelSeries | https://discord.gg/steelseries | Official SteelSeries community; Sonar, custom presets, Discord routing, and Nova headset users map directly to CueForge Auto Detect and profile-switch testing. | Join/read rules, watch Sonar/audio channels, do not post a link on arrival. |
| 2 | Logitech G | https://discord.gg/logitechg | Official Logitech G server with large gaming/creator community and headset/mic users. | Join/read rules, look for support/audio/peripheral channels. |
| 3 | PCMR | https://discord.gg/pcmr | Large PC gaming/hardware community with troubleshooting and setup discussion. | Join/read rules, only help in support/audio threads. |
| 4 | ilovePCs / PC Build Help | https://discord.do/pc-build-help-tech-support-ilovepcs/ | PC troubleshooting server that explicitly includes peripherals and audio-device recommendations. | Check rules before joining; useful comments only. |
| 5 | Indie Hackers Discord | https://discordhome.com/server/indie-hacker | Founder/project feedback audience; useful for app feedback, not FPS tester recruitment. | Use intro/feedback channels if rules allow. |
| 6 | TurboStarter Discord | https://www.turbostarter.dev/discord | Indie/SaaS builder community; useful for distribution feedback and tester-process learning. | Read first; post only in feedback/showcase channels. |

Open target categories after these:

- Equalizer APO / Peace EQ community if a legitimate server is found.
- game-specific servers with audio/help/off-topic channels for Siege, Valorant, CS2, Tarkov, Apex, or Warzone.
- beta tester / indie maker servers only if they have a clear feedback channel.

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

## Fresh Reddit Queue

Use these in order. Prefer replies to active existing threads over new promo posts.

| Priority | Thread | Link | Action |
| --- | --- | --- | --- |
| 1 | r/micro_saas - Drop your product, I'll help you find your first 100 users | https://www.reddit.com/r/micro_saas/comments/1tljvaz/drop_your_product_ill_help_you_find_your_first/ | Best current invited product reply. Use the drafted no-direct-link reply. |
| 2 | r/SideProject - Looking for 3 beta testers | https://www.reddit.com/r/SideProject/comments/1tm00lb/looking_for_3_beta_testers/ | Comment only if tester exchange is still active. Offer CueForge as a web app and say you can test/review theirs too. |
| 3 | r/SaaS - how the hell do you find beta testers? | https://www.reddit.com/r/SaaS/comments/1ta2g8q/how_the_hell_do_you_find_beta_testers/ | Helpful no-link comment: target people already complaining about audio setup, not generic beta testers. |
| 4 | r/betatests - Has anyone actually gotten beta testers here? | https://www.reddit.com/r/betatests/comments/1qqz5lq/has_anyone_actually_gotten_beta_testers_here/ | Read/comment carefully; this community has been fragile for CueForge, so no app link. |
| 5 | r/alphaandbetausers - current tester posts | https://www.reddit.com/r/alphaandbetausers/ | Read only unless account trust improves; previous CueForge posts were filtered. |

Reply for priority 2:

```text
I can trade feedback if you still need testers. CueForge is a local-first web app for Windows FPS players with messy headset/mic/audio setups.

What I need tested is pretty narrow: run Auto Detect, see if it identifies the right headset/mic without weird Windows device names, save a game profile, then tell me what felt unclear.

I can give you a real first-run review back too.
```

Helpful comment for priority 3:

```text
The useful beta testers are usually not people who enjoy testing. They are people already annoyed by the exact problem.

For CueForge I am not looking for "gamers" broadly. I am looking for Windows FPS players who already complain about Discord/Sonar/APO/headset routing, weird device names, bad mic gain, or footsteps feeling inconsistent. That makes the ask much more concrete: run one setup check, play one match, report what got clearer/worse/confusing.
```
