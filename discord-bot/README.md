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
```

The bot does not scrape Discord, X, or Reddit. It gives clean prompts and structured language so you can collect feedback without turning the server into spam.

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
