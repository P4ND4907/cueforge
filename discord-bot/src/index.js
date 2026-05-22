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
    .setDescription('Get the group test night format.')
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
    }
  }[interaction.commandName];

  if (!payload) return;
  await interaction.reply({ ...payload, ephemeral: true });
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
