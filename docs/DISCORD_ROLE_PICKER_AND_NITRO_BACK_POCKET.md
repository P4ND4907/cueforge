# Discord Role Picker + Nitro Back Pocket

Last checked: May 22, 2026.

## Decision

Do not pay for a role bot just for role picking yet.

CueForge Panda Guide now covers the MEE6-style role picker:

```text
/roles
```

The command posts one branded role panel in `role-picker` with:

```text
- Button roles
- Matching reaction roles
- Local saved role-panel message ids
- Public tester/game roles only
- Staff roles excluded from self-assign
```

Use MEE6, Carl-bot, Dyno, or Sapphire later only if the server needs stronger anti-spam, moderation logs, automod workflows, or moderation dashboards.

## Role Picker Setup

1. Create the public tester/game roles first.
2. Put the bot role above those public roles.
3. Keep the bot role below private owner/mod roles unless you explicitly want it able to manage those.
4. Give the bot:

```text
Manage Roles
Add Reactions
Read Message History
View Channel
Send Messages
Use Slash Commands
```

5. Enable `SERVER MEMBERS INTENT` in the Discord Developer Portal.
6. Run `/roles` in `role-picker`.
7. Pin the message.

The bot saves role-panel ids in:

```text
discord-bot/data/role-picker.json
```

That folder is ignored by Git.

## Public Role Map

```text
🐼 Panda Pilot
🎧 IEM Listener
🎮 Headset Grinder
🎙️ Mic Checker
🎚️ EQ Forger
🎬 Clip Hunter
🐞 Bug Tracker
🧪 Build Tester
🌿 Casual Tester
🔥 Sweat Stack
🌲 Tarkov Ears
🛡️ Siege Sound
🎯 COD / Warzone
⚡ Apex Audio
🔊 CS2 / Valorant
```

Private roles stay manual:

```text
Chiefyy Forge Queen
Bamboo Mod
Triage
```

## Nitro / Boost Notes

Nitro is not required for role picking, onboarding, Server Guide, or the CueForge bot.

Nitro can help the server look more polished if the boosts are worth it:

```text
Nitro subscribers get 2 server boosts and a 30% discount on future boost purchases.
Nitro Basic does not include boost perks.
```

Useful boost-backed perks to keep in the back pocket:

```text
2 boosts / Level 1:
- Better server cosmetics and starter boost perks.

7 boosts / Level 2:
- Custom role icons.
- Better community polish once roles matter socially.

Additional perk:
- Enhanced Role Styles cost 3 available boosts.
- Server Tags cost 3 available boosts.
- Both together need 6 available boosts.
```

Important: additional perks use dedicated available boosts and do not count toward server boost levels while allocated to those perks.

## When To Pay

Wait until one of these is true:

```text
50+ real members and daily chat
10+ active testers in one week
People are asking for profile/server identity perks
The server needs role icons, server tags, or enhanced role styles to look more official
The Discord invite is being used in public posts and first impression matters
```

First paid move:

```text
Nitro on Panda account only if you want the 2 boosts plus personal account perks.
```

First server spend:

```text
Use boosts for Level 1 polish first.
```

Later polish:

```text
Use 3 available boosts for Enhanced Role Styles on Chiefyy Forge Queen, Bamboo Mod, Panda Pilot, and EQ Forger.
Use 3 available boosts for a server tag only when the community has enough identity to make the tag valuable.
```

## Official References

- Discord Server Boosting FAQ: https://support.discord.com/hc/en-us/articles/360028038352-Server-Boosting-FAQ
- Discord Enhanced Role Styles: https://support.discord.com/hc/en-us/articles/31444213087255-Enhanced-Role-Styles
- Discord Custom Role Icons FAQ: https://support.discord.com/hc/en-us/articles/4409571023639-Custom-Role-Icons-FAQ
- Discord Server Guide FAQ: https://support.discord.com/hc/en-us/articles/13497665141655-Server-Guide-FAQ
- Discord Community Onboarding Examples: https://support.discord.com/hc/en-us/articles/10394859532823-Community-Onboarding-Examples
