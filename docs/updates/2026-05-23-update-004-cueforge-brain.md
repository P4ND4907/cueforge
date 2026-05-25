# CueForge Update 004 - CueForge Brain

Date: May 23, 2026

## Angle

This update explains the product better because the app now does the product better.

CueForge is not just an EQ screen. It is becoming an audio chain verifier and personal sound engine for gamers: prove the setup, learn what the player prefers, warn when other apps are fighting the chain, map the game intent, export safely, and keep the evidence local.

## What Changed

- Added CueForge Brain.
- Added a 7-pillar proof strip to Setup Command Center.
- Added `cueforge-brain.json` to release packs.
- Connected the new brain to CueForge State v2, Chain Graph, Conflict Detector, Readiness Score, Profile Engine, native manifest, and export packs.
- Cleaned the GitHub Pages bundle so stale generated assets are not piling up.
- Added the public differentiator doc: `docs/CUEFORGE_DIFFERENTIATOR.md`.

## Proof

- `npm.cmd test`: 53 files / 182 tests passed.
- `npm.cmd run build`: passed.
- `npm.cmd audit --audit-level=moderate`: 0 vulnerabilities.
- `npm.cmd run qa:preflight`: PASS.
- `npm.cmd run notes:repair`: 0 notes / 0 repair actions.
- Live browser check: CueForge Brain rendered with 7 pillars, Start Setup Flow opened Auto Detect, no console errors, no overflow.
- Human swarm check: 70 route checks, 0 notes.

## Discord Lab Update

```text
CueForge update: the app has a real brain now.

I do not want CueForge to be another "boost footsteps" preset tool. There are already plenty of those.

The direction is clearer now:

CueForge = audio chain verifier + personal sound engine.

That means it should help answer:
- what is actually in my audio chain?
- are Sonar / APO / Discord / routing layers fighting each other?
- what does my ear actually prefer?
- what mode fits this game?
- is this safe to export or apply?
- what proof do we have from a real match?

New in this pass:
- CueForge Brain score
- 7 proof pillars on the setup page
- release packs now include cueforge-brain.json
- public docs now explain the product direction
- stale site assets cleaned up

Proof pass:
- 53 test files / 182 tests passed
- build passed
- audit clean
- preflight passed
- live browser check passed
- 70 route checks / 0 notes

Try it here:
https://p4nd4907.github.io/cueforge/

Download:
https://github.com/P4ND4907/cueforge/releases/tag/v0.1.0-alpha.2

What I need from testers:
Run setup, play one real match, and tell me what actually changed. Better, worse, or weird all helps.
```

## Discord Match Check-In

```text
New test ask for anyone trying CueForge:

Before changing a bunch of settings, run the setup flow and look at the CueForge Brain section.

Then play one real match and post:

1. Game / mode
2. What your chain looked like
3. Main warning, if any
4. What sounded better
5. What got worse
6. Did the issue feel like tuning, game audio, Discord, routing, mic gain, or gear?

The goal is not hype. The goal is proof.
```

## X Post

```text
CueForge update:

The app now has a real brain.

Not just EQ. It checks the audio chain, learns player preference, flags app conflicts, maps game intent, exports safely, and keeps proof local.

53 test files / 182 tests passed.

https://p4nd4907.github.io/cueforge/

#CueForge #FPSAudio #PCGaming #GamingAudio
```

## Reddit Profile-Safe Update

Use on profile only or as a comment reply when relevant. Do not repost into communities that already filtered launch posts.

```text
Disclosure: CueForge is my project.

Small update for anyone following the build: CueForge now has what I am calling the CueForge Brain.

I do not want this to be just another EQ preset app. The goal is more practical:

Can the app prove what is actually happening in the player's audio chain?
Can it warn when Sonar, APO, Discord, Voicemeeter, VB-CABLE, or spatial layers are making the setup harder to trust?
Can it learn what the player actually prefers instead of forcing one "best" sound?
Can it map the profile to the game intent and keep the export/apply step safe?

That is the lane now: audio chain verifier + personal sound engine.

This pass added:
- CueForge Brain score
- 7 proof pillars in the setup screen
- release packs that include the brain output
- cleaner public docs
- more proof gates before sharing builds

Latest local proof:
- 53 test files / 182 tests passed
- build passed
- dependency audit clean
- pre-release QA passed
- browser smoke passed
- 70 route checks with 0 notes

I am still looking for real player feedback. The useful test is simple: run setup, play one real match, and say what actually changed. Better, worse, or weird all helps.

App: https://p4nd4907.github.io/cueforge/
GitHub: https://github.com/P4ND4907/cueforge
```

## Reddit Comment Version No Link

```text
That is basically the problem I am trying to solve with CueForge.

I am building it less like "here is the perfect EQ" and more like an audio chain verifier: what device is active, what other apps are touching sound, what routing might be confusing the result, and what changed after a real match.

The hard part is not making a curve. The hard part is proving whether the curve actually helped or whether Discord, Sonar, APO, Windows routing, the game mix, or the headset chain made the result unreliable.

Still early, but the latest build now has a brain/readiness layer for that instead of just a bunch of separate tools.
```

## GitHub Issue / Discussion Update

```text
Update 004: CueForge Brain is now wired into the app.

This changes the product direction from separate tuning tools into one proof loop:

- verify the audio chain
- learn player preference
- flag conflicting audio layers
- map game intent
- export/apply safely
- keep evidence local
- prepare for the native engine path

The release pack now includes `cueforge-brain.json`, and the Setup Command Center shows the 7 proof pillars directly in the app.

Proof:
- `npm.cmd test`: 53 files / 182 tests passed
- `npm.cmd run build`: passed
- `npm.cmd audit --audit-level=moderate`: 0 vulnerabilities
- `npm.cmd run qa:preflight`: PASS
- `npm.cmd run notes:repair`: 0 notes / 0 repair actions
- browser QA + responsive pass: clean
- swarm QA: 70 route checks / 0 notes

Next feedback ask: run setup, play one real match, then report what changed and whether the issue felt like tuning, game audio, Discord, Windows routing, mic gain, or gear.
```

## Safety Notes

- Do not mass-post the same body across Reddit communities.
- Prefer owned Discord, X, GitHub, and Reddit profile.
- For Reddit communities, use helpful comments first and no-link versions unless the rules clearly allow project links.
- Do not claim enemy-location detection or hidden system apply.
