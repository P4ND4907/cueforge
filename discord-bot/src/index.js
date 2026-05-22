import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

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
    .setDescription('Get a quick engagement prompt for the Panda Lab.')
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
    content: `Welcome ${member}. Grab your bamboo, post your setup, and tell us what game audio keeps lying to you.`,
    embeds: [buildWelcomeEmbed()],
    components: [buildLinkRow()]
  }).catch(() => {});
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
