# CueForge Reddit Profile And Outreach

## Live Setup Status

Last updated: May 22, 2026.

Profile updates completed:

```text
Display name: Panda | CueForge
About: Panda behind CueForge. Building a free FPS audio lab for mic checks, IEM/headset EQ, Discord, Equalizer APO, and real match feedback. Honest tests > hype.
Banner/avatar: CueForge panda brand assets applied.
Profile post: blocked by Reddit profile composer error, "community doesn't exist."
Update 003 profile post attempt: blocked by the same Reddit profile composer error on May 22, 2026.
Do not keep retrying the profile composer until the profile/community route is healthy again.
r/alphaandbetausers post: submitted.
Live post: https://www.reddit.com/r/alphaandbetausers/comments/1tkdalt/looking_for_fps_audio_testers_using_iems_headsets/
Current status: Reddit filters removed the repeated/link-heavy alphaandbetausers post. Do not repost the same title/body/link.
Safe action now: use the GitHub release/issue as the owned link hub, then do modmail permission asks and no-link helpful comments. Do not mass post the GitHub/app/Discord links.
r/betatests Update 003 post attempt: submitted May 22, 2026 with one app link and required feedback questions; removed immediately by Reddit filters.
r/SideProject no-link discussion attempt: submitted May 22, 2026 with no app/GitHub/Discord link; removed immediately by Reddit filters.
Current Reddit diagnosis: account-level trust/filter issue. Stop new subreddit post attempts for now. Build trust with normal non-link comments, profile completion, and modmail permission asks before trying another launch-style post.
May 22 update: outreach mode is now reply-only. Do not create new Reddit promo posts; save active threads, answer the existing question, and leave app links out unless someone asks.
May 23 update: Update 004 copy is safe for the Reddit profile or relevant replies only. Do not repost into communities that already filtered launch posts.
May 23 rollout result: Update 004 profile-safe post was staged, but Reddit returned "Hmm, that community doesn't exist. Try checking the spelling." after submit. A no-link helpful comment was drafted in `r/Gaming_Headsets`, but it did not publish visibly after submit. Keep Reddit in manual-confirmation mode until comments are proven healthy.
May 23 evening result: X and Discord lab update posted with the v0.2.0-alpha.3 foundation/proof-loop copy. Reddit profile submit still returns "community doesn't exist." A tailored `r/betatests` post briefly submitted, then Reddit filters removed it. Two no-link comments did publish visibly: one tester-feedback-process comment in `r/betatests`, and one headset/mic recommendation comment in `r/Gaming_Headsets`.
Current karma recovery mode: comments only, no app links, no GitHub links, no repeated beta posts. Focus on helpful replies in headset, EQ, mic, Discord, and tester-feedback threads until comment karma is established.
Clean comment queue saved at `docs/social/REDDIT_COMMENT_QUEUE_2026-05-23.md`. Use it as a human reply queue, not a bulk-post checklist.
May 24 queue: Use the Reddit profile-safe post and no-link comment bank in `docs/social/2026-05-24-social-command-center.md`. Do not create new subreddit promo posts until the profile composer and ordinary comments are proven healthy.
```

Community memory:

```text
Use the in-app Community Hub -> Thread Memory workflow before replying.
GitHub memory file: docs/social/COMMUNITY_MEMORY.md
Watchlist data: docs/social/community-watchlist.json
Save thread URL, title, visible comments/votes, useful context, and the next human reply draft.
Only engage in high-fit, active threads. Avoid communities that visibly prohibit assisted/generated comments.
```

Joined communities:

```text
r/SideProject
r/alphaandbetausers
r/betatests
r/IMadeThis
r/EqualizerAPO
r/Gaming_Headsets
r/EscapefromTarkov
r/Rainbow6
r/CODWarzone
r/apexlegends
r/VALORANT
r/GlobalOffensive
```

## Current Guardrails

Reddit is not Discord. Treat it like a place to participate first, promote second.

The safe operating mode after the filter removal:

```text
Profile post: paused until Reddit's profile composer works again.
Community posts: no-link by default unless rules clearly allow links.
Game subreddits: ask modmail first.
Comments: answer existing audio/help threads with useful advice before mentioning CueForge.
Cadence: one real outreach action at a time, not many similar posts in a row.
Karma mode: helpful comments only, no repeated app links.
```

Official rules and references:

```text
Reddit Rules: https://redditinc.com/policies/reddit-rules
Reddiquette: https://support.reddithelp.com/hc/en-us/articles/205926439-Reddiquette
Reddit spam guidance: https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community
```

Rules that matter for CueForge:

```text
Do not mass-post the same link.
Do not ask for upvotes.
Do not DM people unsolicited.
Disclose that CueForge is your project.
Read each subreddit's rules before posting.
Use your own profile first.
Use modmail when rules are unclear.
Do not use the same title/body across multiple communities.
Keep most activity helpful and non-promotional.
If Reddit filters a post, do not immediately repost it. Rewrite, reduce links, ask mods, or switch to comments/profile.
```

## Filter Recovery Plan

What probably triggered removal:

```text
New account / low trust signals.
Repeated post attempts in the same community.
External app/GitHub/Discord links in the body.
Beta/tester language that looks promotional to filters.
Similar title and body reused too quickly.
```

Use this order now:

```text
1. Stop reposting the same alphaandbetausers link.
2. Use the GitHub release and tester issue as the owned link hub.
3. Use no-link community posts that offer to share the link only when allowed.
4. Ask modmail before posting in game-specific subs.
5. Leave useful non-link comments in audio/help threads.
6. Only share the app link when the community asks or rules clearly allow it.
```

## Safe Post Queue

Use these in order. Stop if a post is filtered or removed, then ask mods instead of reposting.

1. One no-link post in a beta/project-friendly subreddit.
2. One modmail permission ask for a game subreddit.
3. Two helpful comments in existing audio/mic/EQ threads with no link.
4. One tailored follow-up only after someone asks for the app.

Do not post the same body twice. Rewrite the hook for each community and keep the disclosure.

## Update 004 Profile-Safe Copy

Use on the profile only, or rewrite as a relevant reply when someone is already talking about audio chains, EQ, Sonar/APO routing, Discord mic issues, or headset/IEM testing.

```text
Disclosure: CueForge is my project.

Small update for anyone following the build: CueForge now has what I am calling the CueForge Brain.

I do not want this to be just another EQ preset app. The goal is more practical:

Can the app prove what is actually happening in the player's audio chain?
Can it warn when Sonar, APO, Discord, Voicemeeter, VB-CABLE, or spatial layers are making the setup harder to trust?
Can it learn what the player actually prefers instead of forcing one "best" sound?
Can it map the profile to the game intent and keep the export/apply step safe?

That is the lane now: audio chain verifier + personal sound engine.

Latest local proof:
- 53 test files / 182 tests passed
- build passed
- dependency audit clean
- pre-release QA passed
- browser smoke passed
- 70 route checks with 0 notes

I am still looking for real player feedback. The useful test is simple: run setup, play one real match, and say what actually changed. Better, worse, or weird all helps.

App and GitHub are on my profile.
```

The app now has an Auto Detect copy/paste setup kit. Testers can copy a redacted setup summary from `Auto Detect` and paste it into Discord, Reddit comments, GitHub issues, or beta check-ins without raw device IDs.

## Safer No-Link Community Draft

```text
Disclosure: CueForge is my project.

I am looking for a few FPS players willing to do one clean test: run a setup check, play one real match, then say what actually changed.

Most useful testers:
- IEM or headset users
- USB mic or HyperX-style mic users
- Equalizer APO / Peace / Sonar users
- players who can compare footsteps, direction, comms, fatigue, and mic clarity

No hype needed. If it gets worse, that is useful.

I am keeping links out of this post so it does not turn into a link drop. The app, GitHub, and Discord are on my profile, and I can share them if the mods/community are okay with it.
```

## Profile Assets

Avatar:

```text
assets/discord/cueforge-discord-icon.png
assets/discord/cueforge-server-pfp.png
```

Banner:

```text
assets/discord/cueforge-reddit-banner.png
```

Share image:

```text
assets/discord/cueforge-social-card.png
```

## Profile Copy

Display name:

```text
Panda | CueForge
```

About:

```text
Panda behind CueForge. Building a free player-first FPS audio lab for real setups, real matches, and honest feedback. Better, worse, or weird all helps.
```

Social links:

```text
App: https://p4nd4907.github.io/cueforge/
GitHub: https://github.com/P4ND4907/cueforge
Windows alpha: https://github.com/P4ND4907/cueforge/releases/latest
Discord: https://discord.gg/vyQwyJ49v
```

Pinned/profile post title:

```text
I built CueForge and I need real FPS audio testers
```

Pinned/profile post body:

```text
I built CueForge because I got tired of guessing whether a new EQ, mic setting, Discord tweak, or Windows audio chain actually made FPS audio better.

The goal is simple: test the setup, play a real match, then write down what changed.

CueForge is free to test. It is not trying to out-corporate big audio apps. It is a player-built lab for messy real setups: import or auto-detect what you can, run one real match, and tell me what actually changed.

It can:

- run a setup gate and self test
- give live mic feedback
- tune IEM/headset EQ
- export Equalizer APO config text
- run guided match trials
- create redacted bug reports
- collect beta check-ins from real sessions

I am looking for honest testers, not hype. If it helps, say exactly where. If it makes your setup worse, that matters too.

Good feedback:

- game and mode tested
- imported or auto-detected setup summary
- what improved
- what got worse
- whether the problem felt like tuning, game audio, server timing, Discord, mic gain, or Windows routing

Try CueForge:
https://p4nd4907.github.io/cueforge/

GitHub:
https://github.com/P4ND4907/cueforge

Windows alpha:
https://github.com/P4ND4907/cueforge/releases/latest

Discord:
https://discord.gg/vyQwyJ49v

Disclosure: CueForge is my project. It is free to test, and I am looking for real player feedback.
```

## Join And Watch Queue

Join these first after the profile is cleaned up. Do not post in all of them on the same day.

```text
r/SideProject
r/alphaandbetausers
r/betatests
r/IMadeThis
r/EqualizerAPO
r/Gaming_Headsets
r/EscapefromTarkov
r/Rainbow6
r/CODWarzone
r/apexlegends
r/VALORANT
r/GlobalOffensive
```

First action in each community:

```text
Read rules.
Search "audio", "footsteps", "mic", "EQ", "Equalizer APO", "Discord".
Save 2-3 relevant threads.
Leave helpful non-link comments where useful.
Only post when the community rules make room for beta testing or project feedback.
```

## Safer First Places

Use these first because they are naturally closer to projects, testing, or personal posts.

```text
Your own Reddit profile - safest first post.
r/SideProject - project feedback style, check current rules first.
r/alphaandbetausers - beta tester requests, check current rules first.
r/betatests - beta tester requests, check current rules first.
r/IMadeThis - maker-style post, include build context not just a link.
r/indiehackers - if active/relevant, founder feedback style.
```

## Relevant But Riskier Places

These need rule checks or modmail first.

```text
r/EqualizerAPO - relevant to APO exports, ask/verify rules first.
r/Gaming_Headsets - relevant setup/help angle, avoid link-drop.
r/headphones - usually strict; use discussion/help threads only if allowed.
r/headphoneadvice - likely not a promotion target; only answer genuine help questions.
r/pcgaming - strict self-promotion ratio; do not start here.
r/EscapefromTarkov - game-specific, ask mods before beta recruitment.
r/Rainbow6 - game-specific, ask mods before beta recruitment.
r/CODWarzone - game-specific, ask mods before beta recruitment.
r/apexlegends - game-specific, ask mods before beta recruitment.
r/VALORANT - game-specific, ask mods before beta recruitment.
r/GlobalOffensive or CS2 communities - game-specific, ask mods before beta recruitment.
```

## First Week Reddit Plan

Day 1:

```text
Update profile avatar, banner, display name, bio, and links.
Post profile/pinned tester request.
Join/watch 6-8 relevant communities.
Leave 5 useful non-promo comments in relevant threads.
```

Day 2:

```text
Ask modmail permission in 2-3 communities.
Post in one beta/project-friendly subreddit only if rules allow it.
Answer every comment like a real person.
```

Day 3-5:

```text
Share one useful non-link post: "How I am testing whether FPS audio problems are tuning vs game/server/Discord."
Do not repeat the same post across communities.
Tailor each post to that community.
```

## Modmail Permission Ask

```text
Hey mods, quick permission check before I post.

I built CueForge, a free local-first FPS audio testing tool for Windows players using IEMs/headsets/mics, Discord, and Equalizer APO.

I am looking for a small beta group to test mic feedback, footstep clarity, comms clarity, Equalizer APO exports, and redacted bug reports. I would disclose that it is my project and keep it to one feedback request if allowed.

Public page:
https://p4nd4907.github.io/cueforge/

GitHub:
https://github.com/P4ND4907/cueforge

Would a beta tester request be allowed here, or is there a better weekly/help/self-promo thread for it?
```

## Community Post Draft

Title:

```text
I built a free FPS audio test lab and need honest IEM/headset/mic testers
```

Body:

```text
Disclosure: CueForge is my project.

I am looking for a small group of real FPS players to test CueForge and tell me what actually happens in-game.

CueForge is a free local-first FPS audio test lab for players using IEMs, headsets, USB mics, HyperX-style mics, Discord, Equalizer APO, Peace, Sonar, or messy Windows audio chains.

It helps with:

- setup readiness checks
- live mic feedback
- IEM/headset EQ tuning
- Equalizer APO config export
- guided match trials
- redacted bug reports
- beta check-ins from real sessions

What I need:

- game and mode tested
- gear/mic/audio chain
- whether footsteps, direction, comms, fatigue, or mic clarity changed
- what got worse
- whether the issue felt like tuning, game/server, Discord, mic gain, or Windows routing

I am not looking for hype. If it makes your setup worse, that is useful too.

App:
https://p4nd4907.github.io/cueforge/

GitHub:
https://github.com/P4ND4907/cueforge
```

## Game Community Permission Draft

Use this before posting in Tarkov, Siege, COD/Warzone, Apex, Valorant, or CS communities.

```text
Hey mods, quick permission check.

I built CueForge, a free FPS audio testing app. I am trying to separate actual game audio issues from player setup problems like EQ, Discord, mic gain, Windows routing, and IEM/headset tuning.

Would a one-time beta tester request be allowed here if I clearly disclose that it is my project and ask for match feedback instead of doing a link drop?

If not, is there a weekly thread or better place for this?
```

## Comment-First Helpful Replies

Use these when helping in existing threads. Only link CueForge if it genuinely fits the thread and rules allow it.

```text
For footsteps, I would separate the problem into three buckets before changing EQ again: game mix/HRTF, Windows/Discord routing, and headset/IEM tuning. If it only happens in one game or one map, I would not overfit a global EQ to it yet.
```

```text
For mic issues, check clipping before noise suppression. If gain is too hot, suppression just makes the voice sound processed. I usually want a short normal-speaking test and one loud callout before changing anything.
```

```text
Equalizer APO is powerful, but stacking APO, Peace, Sonar, Discord processing, and Windows enhancements can make it hard to know what is actually changing. I would test one layer at a time and write down the before/after.
```
