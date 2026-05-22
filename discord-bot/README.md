# CueForge Panda Guide

Small Discord bot for the CueForge Beta server. It gives new members a friendly welcome and provides slash-command templates for check-ins, bug reports, setup posts, and test nights.

## Commands

```text
/start
/checkin
/bug
/setup
/testnight
```

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

Keep `.env` private. Do not commit bot tokens.
