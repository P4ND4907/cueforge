const band = (subBass, bass, lowMids, presence, treble, air) => ({
  subBass,
  bass,
  lowMids,
  presence,
  treble,
  air
});

export const genreProfiles = [
  {
    id: 'competitive_fps',
    label: 'Competitive FPS',
    intent: 'cue_priority',
    description: 'Footsteps, reloads, direction, teammate comms.',
    games: ['valorant', 'counter-strike', 'cs2', 'siege', 'cod', 'call of duty', 'warzone', 'overwatch'],
    priorities: ['direction', 'footsteps', 'reloads', 'comms', 'fatigue control'],
    targetBands: [2000, 4000, 8000],
    caution: 'Use one spatial or enhancer layer at a time and prove changes in a real match.',
    eqBias: band(-1.5, -0.5, -1, 1.5, 0.5, 0),
    dynamics: {
      explosionTame: 0.55,
      transientClarity: 0.75,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'competitive_width_safe',
      crossfeed: 0.15,
      hrtf: 'off_by_default'
    }
  },
  {
    id: 'battle_royale',
    label: 'Battle Royale',
    intent: 'distance_and_rotation',
    description: 'Long-range cues, rotation reads, vehicles, vertical noise, and squad comms.',
    games: ['apex', 'fortnite', 'pubg', 'warzone', 'battle royale'],
    priorities: ['distance', 'vertical cues', 'vehicle reads', 'third-party awareness', 'comms'],
    targetBands: [125, 1000, 3000, 8000],
    caution: 'Do not over-narrow width; battle royale needs distance and space as much as footsteps.',
    eqBias: band(-0.75, -0.25, -0.75, 1.15, 0.35, 0.25),
    dynamics: {
      explosionTame: 0.6,
      transientClarity: 0.65,
      loudnessSmooth: 0.25,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'wide_but_center_safe',
      crossfeed: 0.18,
      hrtf: 'optional'
    }
  },
  {
    id: 'extraction_shooter',
    label: 'Extraction Shooter',
    intent: 'quiet_cue_confidence',
    description: 'Low-level movement, inventory sounds, surfaces, distance, and fatigue control.',
    games: ['tarkov', 'arena breakout', 'hunt showdown', 'gray zone', 'extraction'],
    priorities: ['quiet footsteps', 'surface reads', 'distance', 'reloads', 'low fatigue'],
    targetBands: [500, 2000, 4000, 8000],
    caution: 'Keep boosts conservative because long sessions and quiet maps punish harsh treble.',
    eqBias: band(-1.25, -0.65, -0.75, 1.3, 0.2, -0.1),
    dynamics: {
      explosionTame: 0.5,
      transientClarity: 0.7,
      fatigueGuard: 0.65,
      limiterCeilingDb: -1.2
    },
    spatial: {
      mode: 'position_first_stereo',
      crossfeed: 0.12,
      hrtf: 'off_by_default'
    }
  },
  {
    id: 'racing',
    label: 'Racing',
    intent: 'engine_and_contact_detail',
    description: 'Engine pitch, tire scrub, impact location, road texture, and fatigue.',
    games: ['forza', 'f1', 'assetto', 'iracing', 'gran turismo', 'racing'],
    priorities: ['engine pitch', 'tire detail', 'contact cues', 'road texture', 'comfort'],
    targetBands: [125, 500, 1000, 4000],
    caution: 'Avoid huge bass cuts; engine and tire cues need body.',
    eqBias: band(0.1, 0.35, 0.2, 0.4, -0.15, 0.1),
    dynamics: {
      engineBalance: 0.55,
      transientClarity: 0.35,
      loudnessSmooth: 0.45,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'front_stage_stable',
      crossfeed: 0.3,
      hrtf: 'optional'
    }
  },
  {
    id: 'horror_immersion',
    label: 'Horror / Immersion',
    intent: 'space_and_tension',
    description: 'Preserve ambience, distance, quiet details, and jump dynamics.',
    games: ['resident evil', 'silent hill', 'dead space', 'alan wake', 'horror'],
    priorities: ['ambience', 'distance', 'quiet detail', 'dynamic impact', 'space'],
    targetBands: [31, 250, 4000, 16000],
    caution: 'Do not flatten jump dynamics unless the player chooses comfort over immersion.',
    eqBias: band(0.5, 0, 0.5, 0.25, -0.25, 0.75),
    dynamics: {
      explosionTame: 0.2,
      transientClarity: 0.45,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'immersive_width',
      crossfeed: 0.35,
      hrtf: 'optional'
    }
  },
  {
    id: 'open_world_rpg',
    label: 'Open World / RPG',
    intent: 'balanced_world_detail',
    description: 'World ambience, music, dialogue, creature cues, and comfort.',
    games: ['elden ring', 'skyrim', 'starfield', 'witcher', 'cyberpunk', 'open world', 'rpg'],
    priorities: ['music balance', 'dialogue', 'world cues', 'comfort', 'immersion'],
    targetBands: [62, 250, 1000, 8000],
    caution: 'Keep the profile musical; over-competitive EQ can make big worlds feel thin.',
    eqBias: band(0.25, 0.25, 0, 0.35, 0, 0.35),
    dynamics: {
      dialogueLift: 0.35,
      loudnessSmooth: 0.35,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'natural_scene',
      crossfeed: 0.32,
      hrtf: 'optional'
    }
  },
  {
    id: 'mmo_raid',
    label: 'MMO / Raid',
    intent: 'raid_clarity',
    description: 'Callouts, boss mechanics, alerts, music, and long-session comfort.',
    games: ['wow', 'world of warcraft', 'final fantasy xiv', 'ffxiv', 'destiny raid', 'mmo', 'raid'],
    priorities: ['callouts', 'alerts', 'boss mechanics', 'music balance', 'fatigue control'],
    targetBands: [250, 1000, 2000, 4000],
    caution: 'Protect voice chat first; raid audio often stacks Discord, alerts, game, and music.',
    eqBias: band(-0.35, -0.2, -0.35, 0.8, 0.15, 0.1),
    dynamics: {
      dialogueLift: 0.55,
      alertClarity: 0.65,
      loudnessSmooth: 0.55,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'center_anchor',
      crossfeed: 0.28,
      hrtf: 'off_by_default'
    }
  },
  {
    id: 'fighting_game',
    label: 'Fighting Game',
    intent: 'timing_and_impact',
    description: 'Hit confirms, block sounds, meter cues, crowd/music control, and low latency.',
    games: ['street fighter', 'tekken', 'mortal kombat', 'guilty gear', 'fighting'],
    priorities: ['timing', 'hit confirms', 'block cues', 'impact', 'low latency'],
    targetBands: [125, 1000, 2000, 4000],
    caution: 'Avoid processing that adds latency or softens fast transient cues.',
    eqBias: band(-0.15, 0.1, -0.15, 0.9, 0.15, 0),
    dynamics: {
      transientClarity: 0.8,
      limiterCeilingDb: -1.0,
      latencyPriority: 0.9
    },
    spatial: {
      mode: 'tight_stereo',
      crossfeed: 0.12,
      hrtf: 'off'
    }
  },
  {
    id: 'rhythm_game',
    label: 'Rhythm Game',
    intent: 'timing_and_tone',
    description: 'Timing, percussion, bass pulse, and clean treble without delay.',
    games: ['osu', 'beat saber', 'guitar hero', 'rock band', 'rhythm'],
    priorities: ['timing', 'percussion', 'bass pulse', 'clarity', 'low latency'],
    targetBands: [62, 125, 1000, 4000, 8000],
    caution: 'Disable processing that adds delay; timing beats tonal polish here.',
    eqBias: band(0, 0.3, -0.1, 0.65, 0.25, 0.15),
    dynamics: {
      transientClarity: 0.85,
      loudnessSmooth: 0.2,
      latencyPriority: 0.95,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'latency_first_stereo',
      crossfeed: 0.05,
      hrtf: 'off'
    }
  },
  {
    id: 'story_dialogue',
    label: 'Story / Dialogue',
    intent: 'voice_clarity',
    description: 'Make dialogue clear without destroying music and ambience.',
    games: ['story', 'dialogue', 'narrative', 'single player', 'visual novel'],
    priorities: ['dialogue', 'center image', 'music balance', 'ambience', 'comfort'],
    targetBands: [250, 1000, 2000, 4000],
    caution: 'Do not over-cut bass or the soundtrack can lose weight.',
    eqBias: band(-0.5, -0.25, -0.5, 1.0, 0.25, 0.25),
    dynamics: {
      dialogueLift: 0.65,
      loudnessSmooth: 0.55,
      limiterCeilingDb: -1.0
    },
    spatial: {
      mode: 'center_anchor',
      crossfeed: 0.25,
      hrtf: 'off_by_default'
    }
  },
  {
    id: 'night_mode',
    label: 'Night Mode',
    intent: 'low_volume_detail',
    description: 'Keep detail at low volume while taming spikes.',
    games: ['night', 'quiet', 'late night', 'low volume'],
    priorities: ['low volume detail', 'spike control', 'dialogue', 'comfort', 'neighbor safe'],
    targetBands: [125, 1000, 2000, 4000],
    caution: 'Night mode is not a competitive proof profile; it trades impact for control.',
    eqBias: band(-1.0, -0.5, 0, 0.75, -0.25, 0.25),
    dynamics: {
      compression: 0.55,
      limiterCeilingDb: -3.0,
      explosionTame: 0.8
    },
    spatial: {
      mode: 'safe_stereo',
      crossfeed: 0.2,
      hrtf: 'off'
    }
  },
  {
    id: 'streaming_creator',
    label: 'Streaming / Creator',
    intent: 'broadcast_balance',
    description: 'Keep voice, game, alerts, music, and clips readable for viewers.',
    games: ['stream', 'creator', 'obs', 'discord + game', 'broadcast'],
    priorities: ['voice clarity', 'game balance', 'alerts', 'low clipping', 'viewer comfort'],
    targetBands: [125, 250, 1000, 2000, 4000],
    caution: 'Export a profile and verify OBS/Discord/game devices before going live.',
    eqBias: band(-0.5, -0.25, -0.35, 0.95, 0.15, 0.1),
    dynamics: {
      dialogueLift: 0.7,
      compression: 0.45,
      clippingGuard: 0.75,
      limiterCeilingDb: -1.5
    },
    spatial: {
      mode: 'broadcast_center_safe',
      crossfeed: 0.2,
      hrtf: 'off_by_default'
    }
  },
  {
    id: 'accessibility_hearing_support',
    label: 'Accessibility / Hearing Support',
    intent: 'personal_access',
    description: 'Use player feedback and hearing checks to make important cues easier to follow.',
    games: ['accessibility', 'hearing support', 'hearing', 'assist'],
    priorities: ['personal compensation', 'comfort', 'clear alerts', 'voice clarity', 'safe gain'],
    targetBands: [250, 1000, 2000, 4000, 8000],
    caution: 'Keep changes explainable and reversible; this is support, not medical calibration.',
    eqBias: band(-0.2, -0.1, 0, 0.65, 0.25, 0.2),
    dynamics: {
      dialogueLift: 0.55,
      alertClarity: 0.6,
      fatigueGuard: 0.8,
      limiterCeilingDb: -1.5
    },
    spatial: {
      mode: 'clarity_support',
      crossfeed: 0.25,
      hrtf: 'optional'
    }
  },
  {
    id: 'comfort_long_session',
    label: 'Comfort Long Session',
    intent: 'fatigue_control',
    description: 'Long nights, Discord, grinding, testing, and lower fatigue.',
    games: ['comfort', 'long session', 'grind', 'casual', 'media', 'music'],
    priorities: ['fatigue control', 'smooth treble', 'stable bass', 'voice comfort', 'safe volume'],
    targetBands: [62, 125, 250, 4000, 8000],
    caution: 'Comfort mode should not be judged as a max-footstep competitive profile.',
    eqBias: band(0.1, 0.25, 0, -0.1, -0.6, -0.25),
    dynamics: {
      fatigueGuard: 0.85,
      loudnessSmooth: 0.7,
      limiterCeilingDb: -1.8
    },
    spatial: {
      mode: 'relaxed_stereo',
      crossfeed: 0.35,
      hrtf: 'off_by_default'
    }
  }
];

const legacyProfileIds = {
  competitiveFps: 'competitive_fps',
  tacticalComms: 'streaming_creator',
  cinematicCasual: 'comfort_long_session'
};

export const genreProfilesById = Object.fromEntries(genreProfiles.map((profile) => [profile.id, profile]));

export function normalizeProfileId(id = '') {
  const key = String(id || '').trim();
  return legacyProfileIds[key] || key;
}

export function profileById(id = '') {
  return genreProfilesById[normalizeProfileId(id)] || null;
}

export function genreForGame(game = '') {
  const normalized = String(game).toLowerCase();
  if (!normalized) return profileById('competitive_fps');

  return genreProfiles.find((profile) => (
    profile.games.some((item) => normalized.includes(String(item).toLowerCase()))
  )) || profileById('competitive_fps');
}
