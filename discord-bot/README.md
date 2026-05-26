# CueForge Panda Guide

Small Discord bot for the CueForge Beta server. It welcomes new testers, keeps the server active, and turns messy player feedback into useful CueForge testing notes.

## Commands

```text
/start
/download
/downloadpanel
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
/roles
/modroles
/claim
/score
/leaderboard
/award
```

## What The New Commands Do

```text
/rollcall
Posts a quick public check-in. Use this before or after match sessions so testers can say what they are playing, what gear they are using, and what changed.

/download
Sends a private download/start card with the Windows alpha link, web app fallback, first-run steps, and safety boundary.

/downloadpanel
Mod-only command that posts a public download/start panel in the current channel so existing members can always find CueForge without waiting for a welcome message.

/diagnose
Helps separate a CueForge tuning issue from a game mix, bad server/desync, Windows routing, Discord processing, or mic setup problem.

/social
Drafts a short Discord, X, or Reddit update that points people back to the Discord hub. It is meant for human approval before posting and pairs with the Community Hub approval queue inside CueForge.

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

/roles
Posts the tester/game role panel. It supports both buttons and reaction-role emojis, so it works like a lightweight MEE6/Carl-bot role picker without adding another public bot.

/modroles
Mod-only map of the private staff roles and what they are for.

/claim
Lets a tester claim capped points for a real watch party, match test, clip, bug replay, setup post, or helping another tester.

/score
Shows a tester's points and tier.

/leaderboard
Shows the top testers.

/award
Mod-only verified reward for extra work.
```

The bot does not scrape Discord, X, or Reddit, auto-watch content, fake activity, auto-post from personal accounts, force downloads, or farm rewards. It gives clean prompts, welcome/download messages, click/reaction-to-pick tester roles, and a proof-based reward loop so you can collect feedback without turning the server into spam.

## New-Member Download Flow

When a new member joins, the bot posts the normal public welcome card in `WELCOME_CHANNEL_ID` with buttons for:

```text
Download Windows Alpha
Open Web App
Start Here
Feedback
Invite
```

It also tries to DM the member the same download/start card. Discord users can block server DMs, so a failed DM is ignored because the public welcome still has the links.

Set this to disable welcome DMs:

```text
WELCOME_DM_ENABLED=false
```

The download button points to `CUEFORGE_DOWNLOAD_URL`. It is still a user-clicked link; the bot does not force a download or run an installer. Because the Windows alpha is unsigned, SmartScreen can show `Windows protected your PC`; the bot copy should tell testers to use only the official GitHub release and continue only if they trust that file.

## Existing-Member Access

Use this once in `#start-here`, `#lab-updates`, or a dedicated download channel:

```text
/downloadpanel
```

Then pin the panel or add it to Discord Server Guide. It gives already-joined members the Windows alpha link, web app fallback, release notes, feedback link, and first-run path.

Any member can also use:

```text
/download
```

That returns the same download/start card privately, which keeps public channels clean while still making the link easy to find.

Role buttons and reaction roles require:

```text
Manage Roles
Add Reactions
Read Message History
View Channel
Send Messages
Use Slash Commands
```

In the Discord Developer Portal, enable the bot's `SERVER MEMBERS INTENT`. The code also uses `GuildMessageReactions`, so make sure the bot invite includes permissions for message reactions.

The bot's highest role must sit above every self-assignable tester/game role. Do not put it above `Chiefyy Forge Queen` or private staff roles unless you want it able to manage those too.

Run `/roles` in the `role-picker` channel. The bot posts a panel, adds the matching emoji reactions, and stores the panel message id in `discord-bot/data/role-picker.json`. That file is ignored by Git.

## Setup

1. Create a Discord app and bot in the Discord Developer Portal.
2. Copy `.env.example` to `.env`.
3. Fill in the token, client id, guild id, and channel ids.
4. Confirm the public CueForge links in `.env`:

```text
CUEFORGE_WEB_URL=
CUEFORGE_DOWNLOAD_URL=
CUEFORGE_RELEASE_URL=
CUEFORGE_FEEDBACK_URL=
WELCOME_DM_ENABLED=true
```

5. Install dependencies:

```powershell
npm install
```

6. Register slash commands:

```powershell
node --env-file=.env src/index.js --register
```

7. Start the bot:

```powershell
node --env-file=.env src/index.js
```

Keep `.env` private. Do not commit bot tokens, passwords, phone numbers, DOB, recovery codes, or private account data.

Reward state is stored locally in `discord-bot/data/rewards.json`. That folder is ignored by Git so real tester activity does not get committed.
