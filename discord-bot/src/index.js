import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  WELCOME_CHANNEL_ID,
  START_CHANNEL_ID,
  BUG_CHANNEL_ID,
  CHECKIN_CHANNEL_ID
} = process.env;

const links = {
  app: 'https://p4nd4907.github.io/cueforge/',
  discord: 'https://discord.gg/vyQwyJ49v',
  feedback: 'https://github.com/P4ND4907/cueforge/issues/1'
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rewardStorePath = path.resolve(__dirname, '..', 'data', 'rewards.json');
const dailyClaimLimit = 3;
const rewardPoints = {
  'watch-party': 6,
  'match-test': 12,
  'clip-evidence': 16,
  'bug-replay': 18,
  'setup-post': 10,
  'helped-tester': 8
};

const selfAssignRoles = [
  { name: 'Panda Pilot', label: 'Panda Pilot', style: ButtonStyle.Primary },
  { name: 'IEM Listener', label: 'IEM Listener', style: ButtonStyle.Secondary },
  { name: 'Headset Grinder', label: 'Headset Grinder', style: ButtonStyle.Secondary },
  { name: 'Mic Checker', label: 'Mic Checker', style: ButtonStyle.Secondary },
  { name: 'EQ Forger', label: 'EQ Forger', style: ButtonStyle.Secondary },
  { name: 'Clip Hunter', label: 'Clip Hunter', style: ButtonStyle.Secondary },
  { name: 'Bug Tracker', label: 'Bug Tracker', style: ButtonStyle.Secondary },
  { name: 'Build Tester', label: 'Build Tester', style: ButtonStyle.Secondary },
  { name: 'Casual Tester', label: 'Casual Tester', style: ButtonStyle.Secondary },
  { name: 'Sweat Stack', label: 'Sweat Stack', style: ButtonStyle.Secondary },
  { name: 'Tarkov Ears', label: 'Tarkov', style: ButtonStyle.Secondary },
  { name: 'Siege Sound', label: 'Siege', style: ButtonStyle.Secondary },
  { name: 'COD / Warzone', label: 'COD / Warzone', style: ButtonStyle.Secondary },
  { name: 'Apex Audio', label: 'Apex', style: ButtonStyle.Secondary },
  { name: 'CS2 / Valorant', label: 'CS2 / Valorant', style: ButtonStyle.Secondary }
];

const welcomeMessages = [
  (member) => `Welcome ${member}. Grab a role, run CueForge once, and tell us what your game audio is doing right or wrong.`,
  (member) => `Fresh ears in the lab: ${member}. Post your game, gear, mic, and the one sound problem you want fixed first.`,
  (member) => `${member} just joined the Panda Lab. Bring clips, weird setups, and honest before/after notes.`,
  (member) => `Welcome ${member}. If CueForge helps, post it. If it makes things worse, post that too. Both are useful.`
];

const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Get the fast CueForge beta testing path.'),
  new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Get the match check-in format.'),
  new SlashCommandBuilder()
    .setName('bug')
    .setDescription('Get the redacted bug report format.'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Get the audio setup post format.'),
  new SlashCommandBuilder()
    .setName('testnight')
    .setDescription('Get the group test night format.'),
  new SlashCommandBuilder()
    .setName('rollcall')
    .setDescription('Post a tester roll call for the day.')
    .addStringOption((option) =>
      option
        .setName('focus')
        .setDescription('What kind of testers do we need today?')
        .setRequired(true)
        .addChoices(
          { name: 'IEM users', value: 'IEM users' },
          { name: 'Headset users', value: 'headset users' },
          { name: 'Mic testers', value: 'mic testers' },
          { name: 'Equalizer APO users', value: 'Equalizer APO users' },
          { name: 'Tarkov/Siege/COD players', value: 'Tarkov, Siege, and COD players' },
          { name: 'Clip/replay testers', value: 'clip and replay testers' }
        )
    ),
  new SlashCommandBuilder()
    .setName('diagnose')
    .setDescription('Figure out whether an audio issue is tuning, game, server, or setup related.')
    .addStringOption((option) =>
      option
        .setName('symptom')
        .setDescription('What is the main problem?')
        .setRequired(true)
        .addChoices(
          { name: 'Footsteps unclear', value: 'footsteps' },
          { name: 'Direction/vertical audio wrong', value: 'direction' },
          { name: 'Comms buried', value: 'comms' },
          { name: 'Mic sounds bad', value: 'mic' },
          { name: 'Lag/desync/rubberbanding', value: 'server' },
          { name: 'Only one game is bad', value: 'game' }
        )
    ),
  new SlashCommandBuilder()
    .setName('social')
    .setDescription('Draft a social post that points testers back to Discord.')
    .addStringOption((option) =>
      option
        .setName('platform')
        .setDescription('Where is this draft going?')
        .setRequired(true)
        .addChoices(
          { name: 'Discord update', value: 'discord' },
          { name: 'X post', value: 'x' },
          { name: 'Reddit/community', value: 'reddit' }
        )
    ),
  new SlashCommandBuilder()
    .setName('prompt')
    .setDescription('Get a quick engagement prompt for the Panda Lab.'),
  new SlashCommandBuilder()
    .setName('rewardrules')
    .setDescription('Show how Panda Lab rewards work.'),
  new SlashCommandBuilder()
    .setName('watchparty')
    .setDescription('Post a watch-party or test-lab reward prompt.')
    .addStringOption((option) =>
      option
        .setName('focus')
        .setDescription('What are people watching or testing?')
        .setRequired(true)
        .addChoices(
          { name: 'CueForge walkthrough', value: 'CueForge walkthrough' },
          { name: 'Tester clips', value: 'tester clips' },
          { name: 'Patch notes / audio update', value: 'patch notes or audio update' },
          { name: 'Match review', value: 'match review' },
          { name: 'Setup help session', value: 'setup help session' }
        )
    ),
  new SlashCommandBuilder()
    .setName('questboard')
    .setDescription('Post the current Panda Lab quests for making the server feel alive.'),
  new SlashCommandBuilder()
    .setName('serverguide')
    .setDescription('Post the polished new-member guide for Discord Server Guide or start-here.'),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Post click-to-pick tester and game roles.'),
  new SlashCommandBuilder()
    .setName('modroles')
    .setDescription('Show the private staff role map.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim Panda Lab points for real participation.')
    .addStringOption((option) =>
      option
        .setName('activity')
        .setDescription('What did you actually do?')
        .setRequired(true)
        .addChoices(
          { name: 'Joined watch party', value: 'watch-party' },
          { name: 'Ran match test', value: 'match-test' },
          { name: 'Posted clip evidence', value: 'clip-evidence' },
          { name: 'Filed bug replay', value: 'bug-replay' },
          { name: 'Posted setup chain', value: 'setup-post' },
          { name: 'Helped another tester', value: 'helped-tester' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('proof')
        .setDescription('Message, clip, report, or screenshot link if you have one.')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('note')
        .setDescription('Short note, no private info.')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('score')
    .setDescription('Check Panda Lab reward points.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Optional user to check.')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top Panda Lab testers.'),
  new SlashCommandBuilder()
    .setName('award')
    .setDescription('Mod-only manual reward for verified work.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Tester to reward.')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('points')
        .setDescription('Points to add, 1-50.')
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why they earned it.')
        .setRequired(true)
    )
].map((command) => command.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`CueForge Panda Guide online as ${readyClient.user.tag}`);
  if (WELCOME_CHANNEL_ID) {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
    if (channel) {
      await channel.send({
        embeds: [buildWelcomeEmbed()],
        components: [buildLinkRow()]
      }).catch(() => {});
    }
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (!WELCOME_CHANNEL_ID) return;
  const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  await channel.send({
    content: pickWelcomeMessage(member),
    embeds: [buildWelcomeEmbed()],
    components: [buildLinkRow()]
  }).catch(() => {});
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) return replyRoleButton(interaction);
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'claim') return replyClaim(interaction);
  if (interaction.commandName === 'score') return replyScore(interaction);
  if (interaction.commandName === 'leaderboard') return replyLeaderboard(interaction);
  if (interaction.commandName === 'award') return replyAward(interaction);

  const payload = {
    start: {
      embeds: [buildWelcomeEmbed()],
      components: [buildLinkRow()]
    },
    checkin: {
      content: formatBlock(`Game:
Map/mode:
Audio gear:
Mic:
Audio tools running:
CueForge mode/profile:

Before:
- Footsteps:
- Direction:
- Comms:
- Comfort/fatigue:

After:
- Footsteps:
- Direction:
- Comms:
- Comfort/fatigue:

What improved:
What got worse:
What should CueForge change next:`)
    },
    bug: {
      content: formatBlock(`What broke:
What you expected:
What happened instead:
Steps to reproduce:
Game/gear/tools:
Browser or desktop shell:
Did you export a redacted CueForge report? yes/no
Link or paste the redacted report:

Do not paste passwords, phone numbers, DOB, recovery codes, raw device IDs, or private screenshots.`)
    },
    setup: {
      content: formatBlock(`Game:
IEM/headset:
Mic:
DAC/interface:
Discord settings:
Audio tools:
Windows sample rate:
What you want fixed:
What already sounds good:`)
    },
    testnight: {
      content: formatBlock(`CueForge Test Night

Game:
Mode/map:
Time:
Profile:
Gear:
Mic:

Round 1 baseline:
- Footsteps:
- Direction:
- Comms:
- Fatigue:

Round 2 tuned:
- Footsteps:
- Direction:
- Comms:
- Fatigue:

Clip/report link:
Final verdict:`)
    },
    rollcall: {
      embeds: [buildRollCallEmbed(interaction.options.getString('focus'))],
      components: [buildLinkRow()],
      ephemeral: false
    },
    diagnose: {
      embeds: [buildDiagnosisEmbed(interaction.options.getString('symptom'))],
      ephemeral: true
    },
    social: {
      content: formatBlock(buildSocialDraft(interaction.options.getString('platform'))),
      ephemeral: true
    },
    prompt: {
      content: pickPrompt(),
      ephemeral: false
    },
    rewardrules: {
      embeds: [buildRewardRulesEmbed()],
      ephemeral: false
    },
    watchparty: {
      embeds: [buildWatchPartyEmbed(interaction.options.getString('focus'))],
      components: [buildLinkRow()],
      ephemeral: false
    },
    questboard: {
      embeds: [buildQuestBoardEmbed()],
      components: [buildLinkRow()],
      ephemeral: false
    },
    serverguide: {
      embeds: [buildServerGuideEmbed()],
      components: [buildLinkRow()],
      ephemeral: false
    },
    roles: {
      embeds: [buildRolePickerEmbed()],
      components: buildRoleRows(),
      ephemeral: false
    },
    modroles: {
      embeds: [buildModRoleEmbed()],
      ephemeral: true
    }
  }[interaction.commandName];

  if (!payload) return;
  await interaction.reply({ ephemeral: true, ...payload });
});

async function registerCommands() {
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
    throw new Error('DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID are required.');
  }
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands });
}

function buildWelcomeEmbed() {
  return new EmbedBuilder()
    .setTitle('Welcome to the CueForge Panda Lab')
    .setDescription('FPS audio testing for players who want real before/after feedback, not random EQ guessing.')
    .setColor(0x12c99a)
    .addFields(
      { name: 'Fast path', value: 'Run Setup Gate, run Self Test, play one real match, then post a check-in.' },
      { name: 'Post here', value: channelList() },
      { name: 'Privacy', value: 'Do not post passwords, phone numbers, DOB, raw device IDs, recovery codes, or private screenshots.' }
    );
}

function buildLinkRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open CueForge').setURL(links.app),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Feedback').setURL(links.feedback),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Invite').setURL(links.discord)
  );
}

function buildRollCallEmbed(focus) {
  return new EmbedBuilder()
    .setTitle('Daily Panda Lab Roll Call')
    .setDescription(`Today we need ${focus}. Free app, honest feedback, no hype required.`)
    .setColor(0xf6b13d)
    .addFields(
      { name: 'Run this first', value: 'Open CueForge, run Setup Gate, run Self Test, then play one real match.' },
      { name: 'Post after', value: '#match-checkins for before/after, #bug-replays if something breaks, #clip-evidence for proof.' },
      { name: 'What matters', value: 'Footsteps, direction, comms, fatigue, mic clarity, and whether the issue may be game/server related.' }
    );
}

function buildDiagnosisEmbed(symptom) {
  const guidance = {
    footsteps: [
      'Could be tuning if bass masks 2k-5k cues or treble is too sharp.',
      'Could be game/audio-engine if the problem happens only on one map, patch, or vertical layer.',
      'Test: compare two games, one training range, and one real match before changing EQ again.'
    ],
    direction: [
      'Could be HRTF/spatial settings, mono output, Windows enhancements, or game engine vertical audio.',
      'Could be server/desync if enemy position and sound timing disagree.',
      'Test: verify stereo left/right, disable duplicate spatial layers, and compare offline/training vs live server.'
    ],
    comms: [
      'Could be tuning if game low mids mask voice bands.',
      'Could be Discord routing, Sonar game/chat mix, compressor, or auto gain.',
      'Test: record mic evidence, check Discord input/output, then test one fight with comms priority.'
    ],
    mic: [
      'Could be gain, clipping, room noise, mic placement, Discord suppression, or cable/interface noise.',
      'Not usually fixed by headset EQ.',
      'Test: record 12s CueForge audio evidence, lower gain if clipping, then ask a teammate to compare.'
    ],
    server: [
      'This sounds more like game/server/network timing than tuning.',
      'Audio can feel wrong when server state, animation, and sound events disagree.',
      'Test: record ping/loss, compare offline/training to live match, and post clip evidence.'
    ],
    game: [
      'If only one game is bad, do not overfit your whole EQ to it yet.',
      'Could be the game mix, patch, HRTF, occlusion, map geometry, or audio engine behavior.',
      'Test: create a game-specific profile and keep your global profile stable.'
    ]
  }[symptom] || [];

  return new EmbedBuilder()
    .setTitle('CueForge Audio Diagnosis')
    .setDescription('Use this before assuming every problem is an EQ problem.')
    .setColor(0x12c99a)
    .addFields(guidance.map((value, index) => ({ name: `Check ${index + 1}`, value })));
}

function buildSocialDraft(platform) {
  if (platform === 'x') {
    return `CueForge beta is open.\n\nFree local-first FPS audio testing for IEMs, headsets, mics, Equalizer APO, and real match feedback.\n\nNeed honest testers. If it makes your setup worse, that is useful too.\n\nApp: ${links.app}\nDiscord: ${links.discord}\n\n#CueForge #FPSAudio #GamingAudio #IEM #EqualizerAPO #BetaTesting`;
  }

  if (platform === 'reddit') {
    return `Looking for FPS audio testers using IEMs, headsets, mics, or Equalizer APO\n\nI opened CueForge beta for real player feedback. It is a free local-first app for testing mic input, tuning IEM/headset EQ, exporting Equalizer APO configs, and posting match check-ins or redacted bug reports.\n\nI am trying to separate tuning problems from game/server/audio-engine problems, so useful feedback includes game, map/mode, gear, what improved, what got worse, and whether it only happens in one game.\n\nApp: ${links.app}\nDiscord hub: ${links.discord}\nFeedback: ${links.feedback}`;
  }

  return `Daily Panda Lab update\n\nToday's focus: real tester feedback, not hype.\n\nRun CueForge, play one match, then tell us if the issue was tuning, game audio, server timing, mic chain, or Discord routing.\n\nApp: ${links.app}\nDiscord invite: ${links.discord}\nFeedback: ${links.feedback}`;
}

function pickPrompt() {
  const prompts = [
    'What game lied to your ears this week?',
    'Drop one clip where audio helped or completely sold you.',
    'What setting did you change that actually helped?',
    'What sounds worse after tuning: footsteps, comms, explosions, or fatigue?',
    'IEM users: what model are you testing and what game exposes it best?',
    'Mic check: does your Discord voice sound clean, boomy, clipped, or thin?'
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function pickWelcomeMessage(member) {
  const welcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  return welcome(member);
}

function buildRewardRulesEmbed() {
  return new EmbedBuilder()
    .setTitle('Panda Lab Rewards')
    .setDescription('Rewards are for real testing and community help. No auto-watchers, fake activity, spam joins, or reward farming.')
    .setColor(0xf6b13d)
    .addFields(
      { name: 'Earn points', value: '`/claim` after a real watch party, match test, clip, bug replay, setup post, or helping another tester.' },
      { name: 'Daily cap', value: `${dailyClaimLimit} self-claims per person per day. Mods can use /award for verified extra work.` },
      { name: 'Tiers', value: rewardTierText() },
      { name: 'Proof helps', value: 'Clip links, redacted reports, setup posts, and useful notes make rewards easier to trust.' }
    );
}

function buildWatchPartyEmbed(focus) {
  return new EmbedBuilder()
    .setTitle('Panda Lab Watch Party')
    .setDescription(`Focus: ${focus}. Watch, test, talk, then claim points only if you actually participated.`)
    .setColor(0x12c99a)
    .addFields(
      { name: 'How to join', value: 'Hop in the voice room, watch the clip/update/session, and write one useful note after.' },
      { name: 'Claim after', value: '`/claim activity:Joined watch party` with a short note or proof link.' },
      { name: 'Clean rule', value: 'No bots, no fake watch time, no reward farming. We want real testers, not inflated numbers.' }
    );
}

function buildQuestBoardEmbed() {
  return new EmbedBuilder()
    .setTitle('Panda Lab Quest Board')
    .setDescription('Pick one useful thing. Real testing beats noisy activity.')
    .setColor(0xf6b13d)
    .addFields(
      { name: '5-minute quest', value: 'Run Setup Gate and post your gear chain in #signal-setups.' },
      { name: 'One-match quest', value: 'Play one round, then post a before/after in #match-checkins.' },
      { name: 'Clip quest', value: 'Drop a clip where audio helped, failed, or confused you in #clip-evidence.' },
      { name: 'Mic quest', value: 'Record 12s mic evidence in CueForge and summarize voice/noise/clip risk.' },
      { name: 'Helper quest', value: 'Help one tester separate tuning problems from game/server/Discord/routing problems.' }
    );
}

function buildServerGuideEmbed() {
  return new EmbedBuilder()
    .setTitle('Start Here: CueForge Panda Lab')
    .setDescription('This is the home base for FPS audio testing. Bring your real setup, run the app, and tell us what actually happened.')
    .setColor(0x12c99a)
    .addFields(
      { name: 'First three moves', value: '1. Pick roles in #role-picker\n2. Run CueForge Setup Gate + Self Test\n3. Play one match and post a check-in' },
      { name: 'Where to post', value: '#match-checkins for before/after, #bug-replays for broken flows, #clip-evidence for proof, #signal-setups for gear.' },
      { name: 'How to help', value: 'Say whether the problem feels like tuning, game audio, server timing, Discord, mic gain, or Windows routing.' },
      { name: 'Privacy', value: 'Do not post passwords, phone numbers, DOB, recovery codes, raw device IDs, or private screenshots.' }
    );
}

function buildRolePickerEmbed() {
  return new EmbedBuilder()
    .setTitle('Pick Your Panda Lab Roles')
    .setDescription('Click what fits your setup. Click again to remove a role. Staff roles are not self-assignable.')
    .setColor(0x12c99a)
    .addFields(
      { name: 'Tester tags', value: 'IEMs, headsets, mics, EQ, clips, bugs, build testing, casual/sweat testing.' },
      { name: 'Game tags', value: 'Tarkov, Siege, COD / Warzone, Apex, CS2 / Valorant.' },
      { name: 'Staff', value: '`Chiefyy Forge Queen` and `Bamboo Mod` are assigned manually by Panda.' }
    );
}

function buildRoleRows() {
  const rows = [];
  for (let index = 0; index < selfAssignRoles.length; index += 5) {
    const row = new ActionRowBuilder();
    selfAssignRoles.slice(index, index + 5).forEach((role) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`cf-role:${role.name}`)
          .setLabel(role.label)
          .setStyle(role.style)
      );
    });
    rows.push(row);
  }
  return rows;
}

function buildModRoleEmbed() {
  return new EmbedBuilder()
    .setTitle('Private Staff Roles')
    .setDescription('Do not put these behind public buttons.')
    .setColor(0xf6b13d)
    .addFields(
      { name: 'Chiefyy Forge Queen', value: 'Full access / co-owner role. Assigned manually to Chiefyy.' },
      { name: 'Bamboo Mod', value: 'Normal moderator role: audit log, nicknames, kick/approve/reject, timeout, message/thread cleanup, voice moderation, event management.' },
      { name: 'Build Tester', value: 'Safe self-assign tag for trusted testers. No server-management permissions.' }
    );
}

async function replyRoleButton(interaction) {
  if (!interaction.customId?.startsWith('cf-role:')) return;
  if (!interaction.inGuild()) {
    return interaction.reply({ ephemeral: true, content: 'Roles only work inside the CueForge server.' });
  }

  const roleName = interaction.customId.slice('cf-role:'.length);
  const allowed = selfAssignRoles.find((role) => role.name === roleName);
  if (!allowed) {
    return interaction.reply({ ephemeral: true, content: 'That role is not self-assignable.' });
  }

  const role = interaction.guild.roles.cache.find((candidate) => candidate.name === roleName);
  if (!role) {
    return interaction.reply({ ephemeral: true, content: `I cannot find the ${roleName} role yet.` });
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(role.id);

  try {
    if (hasRole) {
      await member.roles.remove(role, 'CueForge self-assign role button');
      return interaction.reply({ ephemeral: true, content: `Removed ${roleName}.` });
    }

    await member.roles.add(role, 'CueForge self-assign role button');
    return interaction.reply({ ephemeral: true, content: `Added ${roleName}.` });
  } catch {
    return interaction.reply({
      ephemeral: true,
      content: `I found ${roleName}, but Discord blocked the role change. Move the bot role above tester roles and give it Manage Roles.`
    });
  }
}

async function replyClaim(interaction) {
  const activity = interaction.options.getString('activity');
  const proof = sanitizeText(interaction.options.getString('proof') || '', 180);
  const note = sanitizeText(interaction.options.getString('note') || '', 280);
  const state = await loadRewardState();
  const userId = interaction.user.id;
  const today = new Date().toISOString().slice(0, 10);
  const todaysClaims = state.claims.filter((claim) =>
    claim.userId === userId && claim.day === today && claim.source === 'self-claim'
  );

  if (todaysClaims.length >= dailyClaimLimit) {
    return interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setTitle('Daily claim cap reached')
          .setDescription('You hit today\'s self-claim cap. A mod can still use `/award` for verified extra work.')
          .setColor(0xff6f61)
      ]
    });
  }

  const points = rewardPoints[activity] || 4;
  const record = applyPoints(state, {
    user: interaction.user,
    points,
    reason: activityLabel(activity),
    proof,
    note,
    source: 'self-claim'
  });
  await saveRewardState(state);

  return interaction.reply({
    ephemeral: false,
    embeds: [
      new EmbedBuilder()
        .setTitle('Panda points claimed')
        .setDescription(`${interaction.user} earned ${points} points for ${activityLabel(activity)}.`)
        .setColor(0x12c99a)
        .addFields(
          { name: 'Total', value: `${record.points} points`, inline: true },
          { name: 'Tier', value: rewardTier(record.points), inline: true },
          { name: 'Proof', value: proof || 'No proof link added. Keep claims honest.' }
        )
    ]
  });
}

async function replyScore(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const state = await loadRewardState();
  const record = state.users[target.id] || emptyRewardUser(target);

  return interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setTitle('Panda Lab score')
        .setDescription(`${target} has ${record.points} points.`)
        .setColor(0xf6b13d)
        .addFields(
          { name: 'Tier', value: rewardTier(record.points), inline: true },
          { name: 'Claims', value: String(record.claims || 0), inline: true }
        )
    ]
  });
}

async function replyLeaderboard(interaction) {
  const state = await loadRewardState();
  const rows = Object.values(state.users)
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map((user, index) => `${index + 1}. ${user.name} - ${user.points} pts (${rewardTier(user.points)})`);

  return interaction.reply({
    ephemeral: false,
    embeds: [
      new EmbedBuilder()
        .setTitle('Panda Lab Leaderboard')
        .setDescription(rows.length ? rows.join('\n') : 'No rewards yet. Use `/claim` after real testing.')
        .setColor(0x12c99a)
    ]
  });
}

async function replyAward(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ ephemeral: true, content: 'Only mods can award verified extra points.' });
  }

  const target = interaction.options.getUser('user');
  const points = interaction.options.getInteger('points');
  const reason = sanitizeText(interaction.options.getString('reason'), 220);
  const state = await loadRewardState();
  const record = applyPoints(state, {
    user: target,
    points,
    reason,
    proof: 'mod verified',
    note: reason,
    source: 'mod-award'
  });
  await saveRewardState(state);

  return interaction.reply({
    ephemeral: false,
    embeds: [
      new EmbedBuilder()
        .setTitle('Verified reward awarded')
        .setDescription(`${target} earned ${points} verified points.`)
        .setColor(0xf6b13d)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'New total', value: `${record.points} points - ${rewardTier(record.points)}` }
        )
    ]
  });
}

function applyPoints(state, { user, points, reason, proof, note, source }) {
  const today = new Date().toISOString().slice(0, 10);
  const record = state.users[user.id] || emptyRewardUser(user);
  record.name = user.username || record.name;
  record.points += points;
  record.claims += 1;
  record.lastSeen = new Date().toISOString();
  state.users[user.id] = record;
  state.claims.push({
    userId: user.id,
    name: record.name,
    points,
    reason,
    proof,
    note,
    source,
    day: today,
    createdAt: new Date().toISOString()
  });
  state.claims = state.claims.slice(-1000);
  return record;
}

function emptyRewardUser(user) {
  return {
    id: user.id,
    name: user.username || 'tester',
    points: 0,
    claims: 0,
    lastSeen: null
  };
}

async function loadRewardState() {
  try {
    const text = await readFile(rewardStorePath, 'utf8');
    const parsed = JSON.parse(text);
    return {
      users: parsed.users || {},
      claims: Array.isArray(parsed.claims) ? parsed.claims : []
    };
  } catch {
    return { users: {}, claims: [] };
  }
}

async function saveRewardState(state) {
  await mkdir(path.dirname(rewardStorePath), { recursive: true });
  await writeFile(rewardStorePath, JSON.stringify(state, null, 2));
}

function activityLabel(activity) {
  return {
    'watch-party': 'joining a real watch party',
    'match-test': 'running a real match test',
    'clip-evidence': 'posting clip evidence',
    'bug-replay': 'filing a replayable bug',
    'setup-post': 'posting a setup chain',
    'helped-tester': 'helping another tester'
  }[activity] || 'helping the Panda Lab';
}

function rewardTier(points) {
  if (points >= 220) return 'Forge Legend';
  if (points >= 120) return 'Panda Captain';
  if (points >= 60) return 'Signal Hunter';
  if (points >= 25) return 'Lab Regular';
  return 'Fresh Ears';
}

function rewardTierText() {
  return '25 Lab Regular / 60 Signal Hunter / 120 Panda Captain / 220 Forge Legend';
}

function sanitizeText(text, limit) {
  return String(text || '')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function channelList() {
  const checkin = CHECKIN_CHANNEL_ID ? `<#${CHECKIN_CHANNEL_ID}>` : '#match-checkins';
  const bug = BUG_CHANNEL_ID ? `<#${BUG_CHANNEL_ID}>` : '#bug-replays';
  const start = START_CHANNEL_ID ? `<#${START_CHANNEL_ID}>` : '#start-here';
  return `${start} for the path, ${checkin} for match feedback, ${bug} for issues.`;
}

function formatBlock(text) {
  return `Copy this format:\n\n\`\`\`text\n${text}\n\`\`\``;
}

if (process.argv.includes('--register')) {
  await registerCommands();
  console.log('CueForge Panda Guide commands registered.');
} else {
  if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required.');
  await client.login(DISCORD_TOKEN);
}
