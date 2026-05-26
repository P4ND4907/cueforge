# CueForge Community Memory

Last updated: 2026-05-26T05:45:00Z

This is the GitHub-side memory for public outreach. It uses public community/thread data only; no account cookies, private messages, or personal data are collected.

## Rules

- Build karma with useful comments and replies before any new launch posts.
- Prefer high-engagement, relevant communities over random posting.
- Save the thread before replying.
- Do not repost filtered or removed content.
- Do not drop links unless the community rules clearly allow it or someone asks.
- Do not use assisted comments in communities that visibly prohibit them.
- Never claim personal testing experience that did not happen.

## Current Diagnosis

Reddit filtered the early tester posts in `r/alphaandbetausers`, `r/betatests`, and `r/SideProject`. Treat that as an account-trust signal. The safe path is profile completion, useful no-link comments, and slow follow-up after people reply. Do not create new subreddit posts right now.

May 24 social lane: use `docs/social/2026-05-24-social-command-center.md` as the baseline rollout pack. Discord and X can carry updates. Reddit stays reply-only until profile posting and ordinary comments are healthy.

May 25 social lane: use `docs/social/2026-05-25-live-social-sprint.md` for the Auto Detect/device-name/game-profile story. Reddit feed showed one high-fit invited thread, `r/micro_saas - Drop your product, I'll help you find your first 100 users`; prefer that kind of invited product reply over cold launch posts.

May 25 search update: verified Discord targets now include `discord.gg/steelseries`, `discord.gg/logitechg`, `discord.gg/pcmr`, `ilovePCs / PC Build Help`, Indie Hackers Discord, and TurboStarter Discord. Treat official hardware/community servers as learn-and-help spaces first, not places to drop the app link on entry.

May 26 social lane: use `docs/social/2026-05-26-desktop-scan-options-update.md` for the desktop-scan/APO-mixer-booster story. The safest hook is "CueForge now explains browser-only vs desktop scan and groups audio layers in plain words." Discord and X can use the app link. Reddit stays helpful/no-link unless the thread explicitly asks for products or someone asks for the link.

## High-Engagement Watchlist

| Community | Members | Active Now | Hot Comments | Mode | Fit | Next move |
| --- | ---: | ---: | ---: | --- | --- | --- |
| r/buildapc | 8,455,508 | unknown | 474 | high | DACs, sound cards, IEM/headset output, streaming setup questions | Helpful no-link comments in active hardware/audio threads. |
| r/pcgaming | 3,954,119 | unknown | 1,746 | very high | Game audio, PC platform settings, competitive discussions | Read first. Comment only when thread asks about audio, not as app promotion. |
| r/Gaming_Headsets | 34,745 | unknown | 6 | medium | Headset/IEM setup and comfort advice | Give practical test steps and ask what platform/game they use. |
| r/EqualizerAPO | 808 | unknown | 21 | low | APO device routing, config text, Peace UI, Windows endpoint issues | Help users verify the correct playback endpoint and avoid stacked filters. |
| r/audioengineering | 643,411 | unknown | 86 | high | Measurement/process questions only | Ask careful measurement questions. Do not pitch CueForge. |
| r/iems | 125,117 | unknown | 137 | manual/read-only | Very relevant but visible rules include No AI | Read only unless the owner writes manually. |

## Active Thread Queue

### 1. r/buildapc - Are gaming sound cards actually a thing anymore?

URL: https://www.reddit.com/r/buildapc/comments/1tjgc1a/are_gaming_sound_cards_actually_a_thing_anymore/
Status: drafted
Tags: sound-card, dac, fps-audio
Next move: Reply with one no-link practical answer if the account can comment cleanly.

Suggested reply shape:

```text
I would separate the problem into clean output, driver/routing stability, and software processing. For IEMs or normal headphones, a decent USB DAC/interface is usually enough if the motherboard output is already clean. A gaming sound card only really earns its spot if you use its routing or surround features. Big thing for FPS: do not stack every spatializer at once. Game HRTF plus Windows Sonic/Dolby plus device surround plus EQ can make direction worse. Fair test: same map/range, same volume, one spatial mode at a time, one EQ at a time, then one real match note for footsteps, direction, comms, and fatigue.
```

### 2. r/micro_saas - Drop your product, I'll help you find your first 100 users

URL: https://www.reddit.com/r/micro_saas/comments/1tljvaz/drop_your_product_ill_help_you_find_your_first/
Status: drafted
Tags: first-100-users, beta-testers, product-feedback
Next move: Reply only if the thread is still active and rules fit. Use one concise product reply, preferably with "link is on my profile" instead of a direct app link.

Suggested reply shape:

```text
CueForge - a local-first web app for Windows FPS players who have messy headset/mic/audio stacks.

It helps players check the real audio chain, clean up confusing device names, test mic/EQ changes, save game profiles, and export configs/reports without dumping private device IDs.

The first 100 users I need are not generic gamers. I need people with SteelSeries/HyperX/Realtek/USB DAC/Discord/Sonar/APO setups who can run Auto Detect, play one real match, and say what got clearer, worse, or confusing.

Link is on my profile. I am mostly trying to learn where those players already hang out.
```

### 3. r/SideProject - Looking for 3 beta testers

URL: https://www.reddit.com/r/SideProject/comments/1tm00lb/looking_for_3_beta_testers/
Status: drafted
Tags: tester-exchange, first-run-feedback, sideproject
Next move: Reply only if the exchange is still active. Offer a real review back and avoid a direct app link unless asked.

Suggested reply shape:

```text
I can trade feedback if you still need testers. CueForge is a local-first web app for Windows FPS players with messy headset/mic/audio setups.

What I need tested is pretty narrow: run Auto Detect, see if it identifies the right headset/mic without weird Windows device names, save a game profile, then tell me what felt unclear.

I can give you a real first-run review back too.
```

### 4. r/SaaS - how the hell do you find beta testers?

URL: https://www.reddit.com/r/SaaS/comments/1ta2g8q/how_the_hell_do_you_find_beta_testers/
Status: drafted
Tags: beta-testers, audience, positioning
Next move: Helpful no-link comment only. The value is the positioning lesson: target problem-sufferers, not generic beta testers.

Suggested reply shape:

```text
The useful beta testers are usually not people who enjoy testing. They are people already annoyed by the exact problem.

For CueForge I am not looking for "gamers" broadly. I am looking for Windows FPS players who already complain about Discord/Sonar/APO/headset routing, weird device names, bad mic gain, or footsteps feeling inconsistent. That makes the ask much more concrete: run one setup check, play one match, report what got clearer/worse/confusing.
```

## Conversation Flow

1. Pick one priority community where the thread is directly about audio, routing, EQ, mic quality, footsteps, or setup problems.
2. Save the URL, title, and copied public context in CueForge Community Hub -> Thread Memory.
3. Use the generated reply as a starting point, then make it sound like the owner actually read the thread.
4. Leave the app link out unless somebody asks for the tool.
5. Mark the thread as `commented`, `needs-followup`, or `filtered` so the next reply queue stays honest.
