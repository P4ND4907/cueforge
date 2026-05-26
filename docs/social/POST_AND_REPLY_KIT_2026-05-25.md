# CueForge Post and Reply Kit - 2026-05-25

Use this when manually posting from the logged-in social accounts. The goal is useful tester conversations, not noisy reach.

## QA Guardrails

Use these checks before pressing send:

- Say "I am building" or "working on" for Audio Support Hub and Sound Match v2. Do not claim those features are live until implementation ships.
- One link maximum in a post unless the thread explicitly asks for product links.
- Disclose that CueForge is your project when relevant.
- Do not ask for upvotes, likes, reposts, follows, or vote help.
- Do not paste the same text across multiple communities.
- Do not DM strangers.
- Read community rules before posting in any subreddit or Discord.
- Stop if a post/comment is filtered, removed, rate-limited, or the account gets a suspicious activity prompt.
- Avoid claims like "hear through walls", "magic surround", "guaranteed footsteps", "driver cleaner", "system optimizer", or "automatic fix".
- Keep support claims honest: CueForge verifies, explains, previews, exports, and creates reports. It does not silently change Windows routing or install drivers.

Policy checks used:

- Reddit rules: https://redditinc.com/policies/reddit-rules
- Reddit spam guidance: https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community
- Reddiquette: https://support.reddithelp.com/hc/en-us/articles/205926439-Reddiquette
- X authenticity/spam policy: https://help.x.com/rules-and-policies/platform-manipulation
- Discord community guidelines: https://discord.com/guidelines/

## Posting Order

1. Discord owned update in CueForge Beta.
2. X post about the next Sound Match/Audio Support Hub direction.
3. X post or reply about current Auto Detect/device alias work.
4. Reddit invited-product reply only where the thread asks for products.
5. Reddit no-link helpful comments in audio/headset/APO threads.
6. Modmail before any big game-sub beta recruitment post.
7. Log every action in `docs/social/COMMUNITY_MEMORY.md`.

## Discord Owned Update

Where: `CueForge Beta` -> `#lab-updates`

Attach if useful:

- `assets/discord/cueforge-social-card.png`
- app link
- GitHub PR link if someone asks for proof

```text
CueForge update:

I am turning the audio tools into one clearer Audio Support Hub.

The goal is simple: when game audio feels wrong, the app should help figure out whether the problem is EQ, headset/IEM tuning, Discord, Sonar, APO, Windows routing, mic gain, masking, fatigue, or the game mix itself.

Current work:
- cleaner Auto Detect device names
- editable headset/mic labels
- saved game profiles
- Sound Match as the tuning path
- safer apply/preview decisions
- redacted reports when something needs help

What I need from testers:
run the app on a real Windows setup, check whether Auto Detect names the right headset/mic, play one match, and tell me what got clearer, worse, or confusing.

Web app:
https://p4nd4907.github.io/cueforge/
```

## Discord Intro For Other Servers

Only use where introductions are normal and links are allowed or not needed.

```text
Hey, I am building CueForge, a Windows-first gaming audio setup checker. Mostly here to learn what headset, mic, Discord, Sonar, APO, and routing problems people keep hitting. I will keep links out unless someone asks or the rules allow it.
```

## Discord Reply When Someone Has Audio Trouble

```text
First thing I would check is the actual path, not EQ.

Windows output, game output, Discord input/output, Sonar game/chat, APO or Peace target, headset app processing, and spatial sound can all be separate layers. If two or three of those are active at once, footsteps and comms can get worse even when the EQ looks right.

My clean test would be: one output device, one spatial layer, one EQ path, same volume, then one real match note for direction, comms, mic clarity, and fatigue.
```

## X Post 1 - Sound Match / Support Hub Direction

```text
I am building CueForge into an Audio Support Hub for messy Windows gaming audio.

Not just EQ presets.

Goal: help players figure out if the problem is headset/IEM tuning, Discord, Sonar, APO, Windows routing, mic gain, masking, fatigue, or the game mix.

#CueForge #FPSAudio #PCGaming
```

## X Post 2 - Tester Ask

```text
Need Windows FPS players with messy audio setups to test CueForge.

Best fit:
SteelSeries/Sonar, HyperX, Realtek, USB DACs, APO, Peace, Discord, Voicemeeter, weird mic names, or confusing headset devices.

Run Auto Detect, play one match, tell me what got clearer or confusing:
https://p4nd4907.github.io/cueforge/

#CueForge #GamingAudio #PCGaming
```

## X Post 3 - Technical Question

```text
FPS audio question:

When you change EQ, headset/IEM, Sonar, Discord settings, or Equalizer APO, how do you test whether it actually helped?

One good match is not proof. I am looking for repeatable before/after checks for direction, comms, mic clarity, and fatigue.

#FPSAudio #GamingAudio #Headsets
```

## X Reply - What Is CueForge?

```text
CueForge is my Windows-first gaming audio lab.

It checks the audio chain, mic setup, EQ/export path, device names, game profile, and match feedback so players are not guessing whether the issue is the headset, Discord, APO/Sonar, Windows routing, or the game mix.

App is on my profile.
```

## X Reply - Is It Safe?

```text
The safe boundary is the whole point.

CueForge does not silently install drivers, change Windows routing, or upload raw audio. The web app focuses on checks, preview, safe export text, redacted reports, and manual review before anything system-level.
```

## X Reply - Does It Boost Footsteps?

```text
I am avoiding the "magic footstep boost" claim.

The better goal is proving the chain first: one output path, one spatial layer, sane EQ/headroom, comms not masking the game, mic not clipping, then a real before/after match note. Sometimes the fix is less processing, not more treble.
```

## Reddit Priority 1 - Invited Product Reply

Use only in a thread explicitly asking people to share products, such as a founder/beta/product discovery thread.

```text
CueForge - a local-first web app for Windows FPS players with messy headset, mic, and audio stacks.

It helps players check the real audio chain, clean up confusing device names, test mic/EQ changes, save game profiles, and export configs/reports without dumping private device IDs.

The first users I need are not generic gamers. I need people with SteelSeries/HyperX/Realtek/USB DAC/Discord/Sonar/APO setups who can run Auto Detect, play one real match, and say what got clearer, worse, or confusing.

Link is on my profile. I am mostly trying to learn where those players already hang out.
```

## Reddit Priority 2 - r/EqualizerAPO Draft

Post only after reading the current subreddit rules. If rules are unclear, use this as a comment on an existing troubleshooting thread instead of a new post.

Title:

```text
Testing an Equalizer APO export flow for FPS headset/IEM tuning
```

Body:

```text
Disclosure: CueForge is my project.

I am testing a free local-first FPS audio tool that exports Equalizer APO config text instead of touching drivers or Windows routing directly.

I am looking for APO users who can sanity-check the export style and tell me what would make it easier to review, copy, or troubleshoot.

Current flow:

- pick or tune an IEM/headset profile
- generate APO filter text
- keep Windows/audio routing changes manual
- run a before/after match check
- create a redacted report if something breaks

I am especially looking for feedback on:

- filter format
- preamp defaults
- gain/Q ranges
- whether the export is readable enough
- what warnings should appear before someone applies it

App:
https://p4nd4907.github.io/cueforge/

GitHub:
https://github.com/P4ND4907/cueforge
```

## Reddit Priority 3 - r/Gaming_Headsets Draft

Use as a no-link discussion post if rules allow. Do not include the app link unless asked.

Title:

```text
How do you test whether a headset EQ actually helped in-game?
```

Body:

```text
I am trying to get better at separating three things that usually get mashed together:

- headset/IEM tuning
- game audio problems
- Windows/Discord/audio-chain problems

When you change EQ or switch headsets, what is your real test?

- same map?
- same weapon?
- same game mode?
- specific footstep range?
- Discord callout test?
- fatigue after a long session?

I am especially interested in what makes a headset sound better for one match but worse after an hour.

Disclosure: I am building CueForge, a Windows gaming audio testing app. I am using this thread to improve the testing method, not to claim one magic EQ fixes everything.
```

## Reddit Helpful Comment - Headset Or Routing Thread

```text
Before changing EQ again, I would verify the actual device path.

Windows default device, game output, Discord input/output, Sonar game/chat, APO/Peace target, headset app processing, and spatial sound can all be different layers. The clean test is one spatial mode, one EQ, same volume, same map/range, then one real match note for direction, comms, mic clarity, and fatigue.
```

## Reddit Helpful Comment - APO Not Working

```text
I would confirm the target endpoint before tuning more.

In APO/Peace setups the config can be valid but attached to the wrong device, especially if Sonar, Voicemeeter, a USB DAC, or a headset app is changing the actual playback path. I would test with a very obvious temporary filter at low volume, confirm it affects the device the game is using, then remove the test filter before judging any real EQ.
```

## Reddit Helpful Comment - Sonar / SteelSeries

```text
With Sonar I would separate the question into game path, chat path, and physical headset output.

If the game is going to a Sonar virtual device, APO/Peace may need to target that path or you may be hearing a different device than the one you tuned. I would test one profile with Sonar processing on, one with it bypassed, same volume, and write down which Windows output the game and Discord actually use.
```

## Reddit Helpful Comment - Mic Sounds Bad

```text
For mic problems I would avoid stacking fixes at first.

Windows input gain, Discord input sensitivity, noise suppression, headset app cleanup, NVIDIA Broadcast, Voicemeeter, and APO mic filters can all gate or clip the same signal. Start with one cleanup layer, set gain so normal speech does not clip, then ask one teammate how it sounds in the actual call app.
```

## Reddit Reply - Someone Asks For The Link

```text
Sure. CueForge is here:

https://p4nd4907.github.io/cueforge/

Disclosure: it is my project. The useful test is not just opening it. I need Windows players to run Auto Detect, check the headset/mic names, play one real match, and tell me what got clearer, worse, or confusing.
```

## Modmail Template - High-Risk Game Subs

Use before posting in larger game communities.

```text
Hi mods,

I am building CueForge, a free Windows-first gaming audio testing app for players with messy headset/IEM, Discord, Sonar, APO, and mic setups.

I would like to ask your community a no-link discussion question about how players fairly test audio changes in [GAME], especially direction, comms masking, and fatigue. I can include a disclosure that CueForge is my project and leave the app link out unless someone asks.

Would that be allowed here, or is there a preferred weekly thread/flair for this kind of testing-method discussion?

Thanks.
```

## Game-Specific No-Link Drafts

### Tarkov

```text
How do you tell Tarkov audio issues apart from your own setup?

Serious question for people who tweak IEMs, headsets, Windows audio, Discord, Sonar, APO, etc.

When Tarkov audio feels wrong, how do you decide whether it is the game/binaural audio, map/building vertical audio, headset tuning, Windows/Discord routing, volume/gain/compression, or just raid chaos?

I am working on a repeatable before/after testing process for FPS audio, and Tarkov is hard because one bad raid can make any setting feel cursed.

Disclosure: I built CueForge, a free FPS audio testing tool. Not dropping the link here unless mods/people ask; I mostly want the testing method to be honest.
```

### Siege

```text
What is your fairest test for Siege vertical audio and comms clarity?

Siege gets messy fast because vertical cues, destruction, operator noise, and Discord comms all overlap.

For people who tweak EQ/headsets/IEMs, how do you test a change without fooling yourself? Same site? Same floor/ceiling setup? Gadget noise? Teammate callouts? Fatigue after multiple matches?

Disclosure: CueForge is my project. I am looking for testing-method feedback first, not trying to link-drop.
```

### Warzone

```text
How do you test footstep audio when explosions and streaks mask everything?

For Warzone players who tweak EQ, headsets, IEMs, Sonar, APO, or Windows audio: what is your actual before/after test?

Footsteps can feel good in a quiet building and then disappear under airstrikes, streaks, glass, doors, team comms, and general chaos.

Disclosure: I built CueForge, a free FPS audio testing tool. Keeping this no-link unless people/mods ask because I mostly want real testing input.
```

### Apex

```text
What makes Apex audio feel unreliable: tuning, game mix, or chaos?

For people who tune headsets/IEMs for Apex: how do you tell whether a change actually helped?

Apex has footsteps, verticality, abilities, third parties, voice comms, and long-session fatigue all happening together, so one match is a pretty bad test.

Disclosure: I built CueForge, a free FPS audio testing tool. I am looking for better test design here, not claiming a magic EQ.
```

## What To Log After Posting

Add this to `docs/social/COMMUNITY_MEMORY.md` for each action:

```text
Date:
Platform:
Community/thread:
Action:
Link:
Result:
Next follow-up:
```
