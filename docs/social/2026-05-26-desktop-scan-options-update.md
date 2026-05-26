# CueForge Social Update Kit - Desktop Scan Options

Use this pack for the next manual Discord, X, Reddit, and GitHub update. Goal: explain the new desktop-scan wording and the richer APO/mixer/booster detection without sounding like CueForge magically changes Windows audio.

## Verified Story

CueForge just made the desktop evidence step clearer:

- Browser mode now gives one clear option: `Use desktop app for full scan`.
- Browser-only testing stays available as a lighter fallback.
- Desktop evidence now labels audio layers in plain groups:
  - APO/processors
  - mixers/routing
  - sound boosters/effects
  - chat/utilities
- The Windows scan proof no longer says "no companion audio tools" when tools like FxSound, Razer/Realtek audio, Discord, or Logitech G HUB are present.

Fresh proof:

```text
Commit: 4d19587 Clarify desktop scan options
Tests: 37 passed
Build: passed
GitHub Pages: built and live
Live app: https://p4nd4907.github.io/cueforge/
```

Safe wording:

```text
CueForge checks and explains the audio chain. It does not silently install drivers, change Windows routing, or edit APO/Sonar/Discord settings.
```

Avoid:

```text
automatic fix, magic footsteps, hear through walls, driver cleaner, optimizer, guaranteed boost
```

## Discord Owned Update

Where: `CueForge Beta` -> `#lab-updates`

Attach if useful:

- `assets/discord/cueforge-social-card.png`
- a screenshot of Device Scan showing the desktop evidence card

```text
CueForge update:

I cleaned up the desktop scan step so it is less confusing.

Instead of hitting a dead-end browser warning, Device Scan now gives one clear option:

Use desktop app for full scan

Browser-only checks still work for lighter setup testing, but the desktop app is the path for stronger Windows evidence: endpoints, APO, mixers/routing, sound boosters/effects, Discord/chat utilities, and running-game context.

The proof card also got smarter. It now groups detected layers instead of only looking for APO/Sonar/Voicemeeter:

- APO/processors
- mixers/routing
- sound boosters/effects
- chat/utilities

That matters because real setups are messy. Someone might not use Equalizer APO, but still have FxSound, Razer/Realtek effects, Discord, Logitech G HUB, SteelSeries/Sonar, VB-CABLE, or other layers changing what they hear.

What I need from testers:
open Device Scan, check whether CueForge describes your real audio stack clearly, and tell me where the wording still feels confusing.

Web app:
https://p4nd4907.github.io/cueforge/
```

## Discord Short Follow-Up

Use in `#signal-setups` after the main update if people are active.

```text
Quick tester ask:

Post your setup chain in this format:

Game:
Output:
Mic:
Discord output/input:
APO or Peace:
Mixer/routing app:
Sound booster/effects:
Headset/IEM app:
What sounds wrong:

I am checking whether CueForge explains messy setups in normal words instead of dumping weird Windows device names.
```

## X Premium Post

Use as one longer X post.

```text
CueForge update:

I cleaned up the desktop scan flow.

Browser mode can test mic permission, Web Audio, and exposed device names, but it cannot fully read local Windows audio layers. So the app now makes that clear with one option:

Use desktop app for full scan

That scan is for stronger evidence around endpoints, APO/processors, mixers/routing, sound boosters/effects, Discord/chat utilities, and running-game context.

Also fixed the proof wording. CueForge no longer acts like "no APO/Sonar" means "no companion audio tools." Real setups can still have FxSound, Razer/Realtek effects, Discord, Logitech G HUB, headset apps, mic processors, and routing layers.

Looking for Windows FPS players with messy audio stacks to test whether the app explains their setup clearly.

https://p4nd4907.github.io/cueforge/

#CueForge #FPSAudio #GamingAudio #PCGaming
```

## X Short Post

Use if you want a tighter update.

```text
CueForge update:

Device Scan now explains desktop vs browser mode clearly.

Desktop scan = endpoint, APO, mixer/routing, sound booster/effects, Discord/chat, and running-game evidence.

Browser-only = lighter mic/device checks.

Need messy Windows FPS setups to test it:
https://p4nd4907.github.io/cueforge/

#CueForge #FPSAudio #PCGaming
```

## X Reply - What Are APO / Mixers / Boosters?

Use when someone asks what those layers mean.

```text
APO/processors = Equalizer APO, Peace, or filters that affect a Windows endpoint.

Mixers/routing = Sonar, Voicemeeter, VB-CABLE, Wave Link, etc.

Boosters/effects = FxSound, Realtek/Razer/Dolby/DTS/Nahimic-style processing.

CueForge tries to explain which layers are in the chain before anyone judges EQ.
```

## Reddit Helpful Comment - No Link

Use in headset/APO/Sonar/audio troubleshooting threads. Do not include the CueForge link unless someone asks.

```text
I would check the whole audio chain before changing EQ again.

There are usually separate layers:

- APO/processors: Equalizer APO, Peace, endpoint filters
- mixers/routing: Sonar, Voicemeeter, VB-CABLE, Wave Link
- boosters/effects: FxSound, Realtek/Razer/Dolby/DTS/Nahimic-style processing
- chat/utilities: Discord, headset apps, mic cleanup tools

If two or three of those are stacked, footsteps/comms can get worse even when the EQ looks fine. I would test one output, one spatial layer, one EQ path, same volume, then one match note for direction, comms, mic clarity, and fatigue.
```

## Reddit Invited Product Reply

Use only in threads explicitly asking for products, beta tools, or "what are you building?" posts.

```text
CueForge - a local-first FPS audio setup checker for Windows players with messy headset/mic/audio stacks.

Recent update: the app now explains desktop scan vs browser-only mode more clearly, and it groups detected audio layers into APO/processors, mixers/routing, sound boosters/effects, and chat/utilities.

The point is not "magic EQ." It is helping players see whether the issue is the headset/IEM, Discord, Sonar/APO, Windows routing, booster effects, mic gain, or the game mix before they keep changing settings.

First testers I need: Windows FPS players with SteelSeries/Sonar, HyperX, Realtek, USB DACs, FxSound, Discord, APO/Peace, Voicemeeter, or weird device names.

Link is on my profile. Disclosure: CueForge is my project.
```

## GitHub Issue / Release Comment

Use in the existing feedback issue or release notes.

```text
Desktop scan wording update is live.

Changes:
- Device Scan now presents `Use desktop app for full scan` instead of a confusing browser-only warning.
- Browser-only remains available for lighter mic/device checks.
- Windows bridge proof now groups detected audio layers into APO/processors, mixers/routing, sound boosters/effects, and chat/utilities.
- Fixed proof copy so systems with FxSound, Razer/Realtek effects, Discord, Logitech G HUB, etc. do not appear as "no companion audio tools."

Verified:
- 37 tests passed
- production build passed
- GitHub Pages built and live
```

## Manual Posting Order

1. Discord `#lab-updates`.
2. X Premium post.
3. Optional X short post the next day, not immediately.
4. Reddit helpful no-link comments only where relevant.
5. Invited product reply only if the thread explicitly asks for products.
6. Log every public action in `docs/social/COMMUNITY_MEMORY.md`.

## Log Template

```text
Date:
Platform:
Community/thread:
Action:
Link:
Result:
Next follow-up:
```
