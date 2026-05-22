# CueForge Panda Guide

Small Discord bot for the CueForge Beta server. It welcomes new testers, keeps the server active, and turns messy player feedback into useful CueForge testing notes.

## Commands

```text
/start
/checkin
/bug
/setup
/testnight
/rollcall
/diagnose
/social
/prompt
/rewardrules
/watchparty
/questboard
/serverguide
/claim
/score
/leaderboard
/award
```

## What The New Commands Do

```text
/rollcall
Posts a quick public check-in. Use this before or after match sessions so testers can say what they are playing, what gear they are using, and what changed.

/diagnose
Helps separate a CueForge tuning issue from a game mix, bad server/desync, Windows routing, Discord processing, or mic setup problem.

/social
Drafts a short Discord, X, or Reddit update that points people back to the Discord hub. It is meant for human approval before posting.

/prompt
Drops a lightweight community question so the server does not feel dead between builds.

/rewardrules
Posts the Panda Lab reward rules.

/watchparty
Posts a real watch-party or test-lab prompt. This is for actual participation, not fake watch time.

/questboard
Posts five small quests that make the server feel active without spam.

/serverguide
Posts the polished new-member guide for Discord Server Guide, start-here, or a pinned welcome.

/claim
Lets a tester claim capped points for a real watch party, match test, clip, bug replay, setup post, or helping another tester.

/score
Shows a tester's points and tier.

/leaderboard
Shows the top testers.

/award
Mod-only verified reward for extra work.
```

The bot does not scrape Discord, X, or Reddit, auto-watch content, fake activity, or farm rewards. It gives clean prompts and a proof-based reward loop so you can collect feedback without turning the server into spam.

## Setup

1. Create a Discord app and bot in the Discord Developer Portal.
2. Copy `.env.example` to `.env`.
3. Fill in the token, client id, guild id, and channel ids.
4. Install dependencies:

```powershell
npm install
```

5. Register slash commands:

```powershell
node --env-file=.env src/index.js --register
```

6. Start the bot:

```powershell
node --env-file=.env src/index.js
```

Keep `.env` private. Do not commit bot tokens, passwords, phone numbers, DOB, recovery codes, or private account data.

Reward state is stored locally in `discord-bot/data/rewards.json`. That folder is ignored by Git so real tester activity does not get committed.
