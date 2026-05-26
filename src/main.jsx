import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AudioLines,
  BrainCircuit,
  Bug,
  ChevronRight,
  CheckCircle2,
  Copy,
  Download,
  Gamepad2,
  Gauge,
  Headphones,
  Mic,
  Play,
  Radio,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  Volume2,
  Waves
} from 'lucide-react';
import { buildApoConfigFromFilters, hardwareTargets, localSourceProfiles } from './audioData.js';
import {
  buildHearingApoOverlay,
  calculateCompensation,
  createEmptyHearingResults,
  hearingFrequencies,
  hearingScore,
  nextHearingLevel,
  normalizeHearingResults,
  updateThresholdEntry
} from './hearingModel.js';
import { buildAutoTuneEq } from './autoTune.js';
import { createAudioDnaFromState } from './audioDna.js';
import { buildExportPack, downloadTextFile } from './exportPack.js';
import { SOUND_MATCH_NEUTRAL_CHOICE, blindMatchRounds, createBlindMatchResult } from './blindMatch.js';
import { createMaskingTune, maskingScenarios } from './maskingLab.js';
import { buildIssueReport, redactDeep, validateIssueReport } from './reportPack.js';
import { computeSetupReadiness } from './setupReadiness.js';
import { buildTesterPacket, feedbackDefaults, scoreTrialFeedback, trialSteps } from './playerTrial.js';
import { buildBetaTesterPacket, createBetaCheckIn, createTesterId, summarizeBetaActivity } from './betaCheckIn.js';
import { buildAudioEvidencePacket, createAudioEvidenceSummary } from './audioEvidence.js';
import {
  buildCommunityDraft,
  buildCommunityFeedbackPacket,
  buildRedditSafeDraft,
  buildRollCallPrompt,
  buildSetupShareText,
  communitySources,
  createCommunityItem,
  feedbackTypes,
  summarizeCommunityFeedback
} from './communityHub.js';
import {
  buildCommunityMemoryMarkdown,
  buildCommunityPlan,
  buildRedditThreadJsonUrl,
  createThreadMemory,
  defaultCommunityWatchlist,
  parseRedditSnapshot,
  summarizeThreads,
  threadFromRedditJson
} from './socialMemory.js';
import {
  appendGameplaySnapshot,
  createGameplaySnapshot,
  gameplaySaveDefaults,
  normalizeGameplaySaveSettings,
  shouldSaveGameplaySnapshot
} from './gameplaySave.js';
import { analyzeAudioFrame, createEmptySignalAnalysis, signalBands } from './signalAnalyzer.js';
import {
  buildUiFeedbackRepairCheck,
  buildUiFeedbackRepairPacket,
  cleanupUiFeedbackNotes,
  cueforgeCodeStructure,
  createUiFeedbackNote,
  markUiFeedbackNotes,
  summarizeUiFeedback,
  UI_FEEDBACK_KEY,
  uiFeedbackTags
} from './uiFeedback.js';
import { computeUiNoteFocusScrollDelta, computeUiNotePopoverPosition } from './uiNotePosition.js';
import { evaluateMicCaptureProof, formatBridgeReportProof } from './hardwareProof.js';
import { buildReleaseProofState, buildReleaseUpdateDraft, summarizeReleaseQueue } from './releaseQueue.js';
import { buildPermissionRecovery, formatPermissionRecoverySteps } from './permissionRecovery.js';
import { buildPrivacyAuditText, runPrivacyAudit } from './privacyAudit.js';
import { buildIssuePatternMemory, buildIssuePatternMemoryText } from './issuePatternMemory.js';
import { buildDesktopBridgeFixPlan, buildDesktopBridgeFixText } from './desktopBridgePlan.js';
import {
  buildSetupIntelligence,
  buildSetupIntelligenceText,
  setupIntelligenceOptions
} from './setupIntelligence.js';
import {
  buildShortcutExportText,
  lockSensitiveShortcuts,
  mergeShortcutDefaults,
  saveShortcut,
  SHORTCUT_VAULT_KEY,
  summarizeShortcutVault
} from './shortcutVault.js';
import {
  buildAudioPolicySummary,
  canPlayBackgroundAudio,
  canPlayCinematicVideoAudio,
  isExpertMode,
  normalizeUserSettings,
  readUserSettingsFromStorage,
  USER_SETTINGS_KEY
} from './appSettings.js';
import {
  buildAppInviteText,
  buildAudioProfileShareText,
  createAudioProfileShare,
  parseAudioProfileShare
} from './profileShare.js';
import {
  applyDeviceAliases,
  detectActiveGameProfile,
  DEVICE_ALIAS_KEY,
  GAME_PROFILE_KEY,
  mergeGameProfiles,
  saveDeviceAlias,
  upsertGameProfile
} from './deviceProfiles.js';
import { buildCueForgeState } from './core/cueforgeState.js';
import { publishSetupAssessmentSnapshot } from './core/setupAssessmentSnapshot.js';
import { buildAutoDetectReport, summarizeAutoDetectReport } from './core/autoDetectReport.js';
import { summarizeReleasePack } from './core/exportSchema.js';
import { summarizeNativeEngineRoadmap } from './data/nativeEngineRoadmap.js';
import {
  calculateRequiredPreamp,
  clampEqToSafety,
  playerSafetyWarnings,
  safetyRules
} from './core/safetyRules.js';
import { buildScopeBoundarySummary } from './core/scopeGuard.js';
import { buildMicPlan } from './engines/micPlan.js';
import { honestSpatialModes, spatialTruthWarning } from './engines/spatialPlan.js';
import { SetupCommandCenter } from './ui/SetupCommandCenter.jsx';
import './styles.css';

const headsetProfiles = [
  { name: 'Generic IEM FPS', correction: '-2dB 35Hz, -1.5dB 120Hz, +2dB 4.2kHz', focus: 'IEM footsteps without harsh treble', score: 91 },
  { name: 'HyperX mic cleanup', correction: 'High-pass feel, lower boom, consonant clarity', focus: 'Discord voice quality', score: 86 },
  { name: 'Generic FPS Headset', correction: '+3dB 2.5kHz, -2dB 120Hz', focus: 'Footsteps and voice clarity', score: 82 },
  { name: 'SteelSeries / Sonar Style', correction: '+2dB 4kHz, -1dB 8kHz', focus: 'Competitive imaging', score: 88 },
  { name: 'SteelSeries Arctis Nova Pro Omni', correction: 'Verify GameHub/Sonar source mix before EQ', focus: 'OmniPlay routing and mic clarity', score: 90 },
  { name: 'Music + Media', correction: '+2dB 60Hz, +1dB 12kHz', focus: 'Warm cinematic balance', score: 74 }
];

const gameProfiles = [
  { game: 'Valorant / CS2', mode: 'Tactical FPS', changes: ['Use local Valorant overlay: -0.8dB at 150Hz', '+1.6dB at 3kHz', '+1.9dB at 4.7kHz'] },
  { game: 'Warzone / Apex', mode: 'Battle Royale', changes: ['Lift 180Hz impacts', 'Boost 3kHz cues', 'Reduce explosions'] },
  { game: 'Tarkov / Siege / COD', mode: 'Real Match FPS', changes: ['Start from Competitive FPS', 'Check verticality and room tone before raising 4kHz again', 'Compare training/offline and one live server before blaming gear'] },
  { game: 'Discord + Game', mode: 'Comms Focus', changes: ['Voice band priority', 'Noise gate light', 'Music duck -8dB'] }
];

const bands = [31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];
const baseEq = [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5];
const socialBrand = {
  lab: 'Panda Lab',
  owner: 'P4ND4907',
  handle: '@CueForge907',
  links: [
    ['X', 'https://x.com/CueForge907'],
    ['Reddit', 'https://www.reddit.com/user/P4ND4907/'],
    ['GitHub', 'https://github.com/P4ND4907/cueforge'],
    ['Discord', 'https://discord.gg/vyQwyJ49v']
  ]
};

const socialLinks = Object.fromEntries(socialBrand.links);
const latestReleaseUrl = 'https://github.com/P4ND4907/cueforge/releases/latest';

const publicRelease = {
  app: 'https://p4nd4907.github.io/cueforge/',
  notes: latestReleaseUrl,
  feedback: 'https://github.com/P4ND4907/cueforge/issues/1',
  desktopStatus: 'Desktop downloads are paused for public testers while the next proof gates finish. Use the web app and feedback loop for now.'
};

function publicAssetPath(path) {
  if (!path || /^(https?:|blob:|data:)/i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${cleanPath}`;
}

const hunterRewardTiers = [
  {
    tier: 'Scout',
    points: '1 proof point',
    claim: 'First clean check-in with game, setup, and a real before/after note.'
  },
  {
    tier: 'Tracker',
    points: '3 proof points',
    claim: 'Repeatable issue with steps, screenshot, Panda Note, or report replay.'
  },
  {
    tier: 'Forge Fixer',
    points: '5 proof points',
    claim: 'Verified retest after a fix proves the problem got better or stayed broken.'
  },
  {
    tier: 'Signal Lead',
    points: '8 proof points',
    claim: 'A hard find changes the roadmap, tuning logic, or release gate for the next build.'
  }
];

const pandaVideoAssets = {
  desktopWebm: {
    label: 'Desktop WebM hero',
    url: publicAssetPath('/media/panda-soundwalk-hero-desktop.webm?v=final-preview-0522'),
    meta: '1920x1080 / 15.9 sec final muted loop'
  },
  desktopMp4: {
    label: 'Desktop MP4 fallback',
    url: publicAssetPath('/media/panda-soundwalk-hero-desktop.mp4?v=final-preview-0522'),
    meta: '1920x1080 / H.264 final fallback'
  },
  mobile: {
    label: 'Mobile safe vertical',
    url: publicAssetPath('/media/panda-soundwalk-hero-mobile.mp4?v=final-preview-0522'),
    meta: '1080x1920 / final safe vertical crop'
  },
  poster: {
    label: 'Poster frame',
    url: publicAssetPath('/media/panda-soundwalk-poster.jpg?v=final-preview-0522'),
    meta: 'OpenArt frame / battle-scar close-up'
  },
  full: {
    label: 'Full cut with sound',
    url: publicAssetPath('/media/panda-soundwalk-full-cut.mp4?v=final-preview-0522'),
    meta: '24 seconds / mixed immersive audio'
  }
};

const pandaStoryAssets = {
  setupWebm: {
    label: 'Opening WebM',
    url: publicAssetPath('/media/panda-soundwalk-setup-chaos.webm?v=director-r11'),
    meta: '1920x1080 / calmer forest pressure loop'
  },
  setupMp4: {
    label: 'Opening MP4',
    url: publicAssetPath('/media/panda-soundwalk-setup-chaos.mp4?v=director-r11'),
    meta: '10.9 sec / quieter nature-first mix'
  },
  setupPoster: {
    label: 'Opening poster',
    url: publicAssetPath('/media/panda-soundwalk-setup-poster.jpg?v=director-r11'),
    meta: 'Matched acoustic-ear panic frame'
  },
  enhancedWebm: {
    label: 'Listening reveal WebM',
    url: publicAssetPath('/media/panda-soundwalk-enhanced-clean.webm?v=director-r11'),
    meta: '17.2 sec / sparse directional hearing loop'
  },
  enhancedMp4: {
    label: 'Listening reveal MP4',
    url: publicAssetPath('/media/panda-soundwalk-enhanced-clean.mp4?v=director-r11'),
    meta: '48fps / quiet forest with gentle directional pings'
  },
  enhancedMobile: {
    label: 'Mobile listening crop',
    url: publicAssetPath('/media/panda-soundwalk-enhanced-mobile.mp4?v=director-r11'),
    meta: '1080x1920 / matched-ear focused state'
  },
  storyFull: {
    label: 'Full soundwalk cut',
    url: publicAssetPath('/media/panda-soundwalk-story-full.mp4?v=director-r11'),
    meta: '14 sec / cleaned immersive audio arc'
  }
};

const motionPassFallback = {
  status: 'pending-review',
  revision: 'director-r11',
  updatedAt: 'local',
  summary: 'Cleaned the public page copy and added source-to-ear soundwave overlays synced to the quiet nature-first audio pass.',
  blurFix: 'Visible director labels are gone; the hero now stays on one polished soundwalk concept while the video refresh source proves the active revision.',
  audio: 'Sparse waves originate from forest cue points, ripple toward the ears, dissipate at contact, and trigger subtle ear-hit arcs only on cue moments.'
};

const MOTION_PASS_APPROVAL_KEY = 'cueforge-panda-motion-pass-approval';

const soundwaveCueMap = {
  panic: {
    duration: 10.94,
    cues: [
      { at: 1.1, source: [74, 76], ear: [62, 24], side: 'right', strength: 0.38 },
      { at: 3.55, source: [7, 40], ear: [42, 25], side: 'left', strength: 0.56 },
      { at: 6.85, source: [92, 46], ear: [62, 24], side: 'right', strength: 0.62 },
      { at: 9.05, source: [52, 18], ear: [52, 22], side: 'center', strength: 0.44 }
    ]
  },
  enhanced: {
    duration: 17.17,
    cues: [
      { at: 2.6, source: [8, 32], ear: [40, 24], side: 'left', strength: 0.48 },
      { at: 5.15, source: [92, 30], ear: [66, 24], side: 'right', strength: 0.6 },
      { at: 8.4, source: [50, 10], ear: [54, 22], side: 'center', strength: 0.42 },
      { at: 12.2, source: [86, 42], ear: [66, 24], side: 'right', strength: 0.5 },
      { at: 15.05, source: [14, 38], ear: [40, 24], side: 'left', strength: 0.42 }
    ]
  }
};

function readMotionPassApproval() {
  try {
    return JSON.parse(localStorage.getItem(MOTION_PASS_APPROVAL_KEY) || 'null');
  } catch {
    return null;
  }
}

function appendAssetRevision(url, revision) {
  if (!url || url.startsWith('blob:')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}motion=${encodeURIComponent(revision || 'live')}`;
}

function buildSoundwavePath(cue) {
  const [sx, sy] = cue.source;
  const [ex, ey] = cue.ear;
  const midX = (sx + ex) / 2;
  const midY = Math.min(sy, ey) - 10 - cue.strength * 8;
  return `M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`;
}

function SoundwaveOverlay({ stage, videoRef }) {
  const [activeCue, setActiveCue] = useState(null);

  useEffect(() => {
    let frameId = 0;
    const stagePlan = soundwaveCueMap[stage] || soundwaveCueMap.enhanced;

    const tick = () => {
      const video = videoRef.current;
      if (video && Number.isFinite(video.currentTime)) {
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : stagePlan.duration;
        const mirroredCues = stagePlan.cues.flatMap((cue) => [
          cue,
          { ...cue, at: Math.max(0, duration - cue.at), mirrored: true }
        ]);
        const now = video.currentTime % duration;
        const nextCue = mirroredCues
          .map((cue) => ({ cue, distance: Math.abs(now - cue.at) }))
          .filter(({ distance }) => distance < 0.9)
          .sort((a, b) => a.distance - b.distance)[0];

        if (nextCue) {
          setActiveCue({
            ...nextCue.cue,
            key: `${stage}-${nextCue.cue.at.toFixed(2)}-${nextCue.cue.mirrored ? 'r' : 'f'}-${Math.floor(now * 10)}`,
            phase: 1 - nextCue.distance / 0.9
          });
        } else {
          setActiveCue(null);
        }
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [stage, videoRef]);

  if (!activeCue) return <div className="soundwave-overlay" aria-hidden="true" />;

  const path = buildSoundwavePath(activeCue);
  const [sx, sy] = activeCue.source;
  const [ex, ey] = activeCue.ear;

  return (
    <div className={`soundwave-overlay ${activeCue.side}-cue`} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="soundwave-trace trace-glow" d={path} />
        <path className="soundwave-trace trace-core" d={path} />
      </svg>
      <span className="sound-source-ripple" style={{ left: `${sx}%`, top: `${sy}%` }} />
      <span className="sound-ear-contact" style={{ left: `${ex}%`, top: `${ey}%` }} />
      <span className={`sound-ear-twitch ${activeCue.side}`} style={{ left: `${ex}%`, top: `${ey}%` }} />
    </div>
  );
}

const pandaFlowShotQueue = [
  {
    id: 'shot-01',
    label: '01 / moonlit front reveal',
    file: 'flow-shot-01-front-reveal.mp4',
    duration: '6-8 sec',
    prompt:
      'Use the preferred style-board as the avatar reference and the latest OpenArt render as the dark glowing forest reference. Full-body moonlit front reveal of the same hyperreal stylized giant panda avatar in dense misty Sichuan bamboo at night after rain: compact powerful body, natural black-and-white wet fur, expressive focused face, elegant large bat-like acoustic ears, subtle healed cheek and shoulder scars, rough damp coat, controlled battle-worn presence. Keep head and ears fully in frame. A soft teal waveform glows behind and beside the panda, not through the fur or eyes. Dark premium nature-tech look, no text, no logo, no watermark.'
  },
  {
    id: 'shot-02',
    label: '02 / fast upright power walk',
    file: 'flow-shot-02-upright-power-walk.mp4',
    duration: '6-8 sec',
    prompt:
      'Low-angle tracking shot of the exact same panda avatar moving upright on two legs in a fast purposeful power-walk through dense wet bamboo, moss, ferns, and leaves in misty Sichuan China at night after rain. Make it feel like the first upright reference: full body visible, head and ears never cropped, strong two-leg rhythm, believable animal weight, stable shoulders, natural arm movement, no human costume feel. Keep the same face, same scars, same fur pattern, and same large acoustic bat-ear silhouette. No glowing feet, no amber foot rings, no magical sparks at paws. Faint teal 3D spatial-audio radar lines move through the forest at head/ear height and converge toward the panda ears. Premium cinematic wildlife, no mascot suit, no goofy biped motion, no text, no watermark.'
  },
  {
    id: 'shot-03',
    label: '03 / extended hearing lock',
    file: 'flow-shot-03-hearing.mp4',
    duration: '6-8 sec',
    prompt:
      'Extended close-up of the exact same hyperreal stylized panda avatar pausing in dense moonlit Sichuan bamboo. Same focused face, same healed cheek scar, same damp fur, same large elegant acoustic bat ears in every frame. No ear morphing: both ears keep the same shape. Make the ear response smart and directional: left-side bamboo creak sends faint 3D teal radar lines into the left ear, right-side water or leaf movement sends radar lines into the right ear, center predator-pressure pulse reaches both ears. When each radar line touches the ear, that ear subtly twitches and catches a tiny rim-light reaction. Forest insects and crickets go quiet when predator pressure gets close, then the panda locks onto the signal. The lines are faint and natural, never slicing through eye, fur, face, or ear. Premium, dark, intense, no horror, no text, no watermark.'
  },
  {
    id: 'shot-04',
    label: '04 / rear bamboo pulse',
    file: 'flow-shot-04-rear-bamboo-pulse.mp4',
    duration: '6-8 sec',
    prompt:
      'Cinematic rear and over-the-shoulder shot of the exact same panda avatar moving upright through a dense moonlit Sichuan bamboo forest at night after rain. Preserve the dark OpenArt mood: wet bamboo, blue-gray fog, faint teal spatial-audio glow, rain and mist. No glowing feet, no amber contact sparks, no ankle rings. The panda brushes one bamboo stalk while moving forward; faint 3D radar-like teal sound lines travel through the forest at head height and hit the ears, causing a subtle ear twitch. Surrounding insects go quiet when a distant predator moves nearby, then the focused directional audio returns. Keep paws, arms, ears, bamboo, and sound lines physically separated with no clipping, no phantom limbs, no duplicate panda, no head cropping, no text, no watermark.'
  }
];

const legacyUiCopyRewrites = [
  ['Discord Command Center', 'Community Signal Board'],
  ['Developer UI Notes', 'Panda Notes Inbox'],
  ['Copy/Paste Setup Kit', 'Redacted Setup Summary'],
  ['Mic Analyzer', 'Mic Problem Analyzer']
];

const driverLayers = [
  {
    name: 'Equalizer APO',
    role: 'System EQ engine',
    fit: 'Best first layer for CueForge exports and IEM/headset tuning.',
    action: 'Install from SourceForge, attach it to the real output device, then paste CueForge APO config text.',
    risk: 'Requires restart/reselecting playback device when Windows endpoints change.',
    url: 'https://sourceforge.net/projects/equalizerapo/'
  },
  {
    name: 'Peace UI',
    role: 'Equalizer APO interface',
    fit: 'Good for players who want visual preset management over raw config text.',
    action: 'Use after Equalizer APO is installed. Keep CueForge as the generator and Peace as the manual apply surface.',
    risk: 'Can hide the exact text config if too many presets are stacked.',
    url: 'https://sourceforge.net/projects/peace-equalizer-apo-extension/'
  },
  {
    name: 'SteelSeries Sonar',
    role: 'Game/chat virtual mixer',
    fit: 'Useful when players need separate game, chat, media, and mic channels.',
    action: 'Detect it, then guide users to set Game as default output and Chat as communication output.',
    risk: 'Virtual devices can break or route silently wrong after updates, so CueForge should verify routing.',
    url: 'https://steelseries.com/gg/sonar'
  },
  {
    name: 'FxSound / OEM enhancers',
    role: 'System enhancement layer',
    fit: 'Useful to detect because it can change the sound before CueForge tuning is judged.',
    action: 'Run one test with the enhancer on and one test with it off before blaming the EQ curve.',
    risk: 'Can double-boost bass, widen spatial cues, or make footsteps sharp if stacked with APO or game HRTF.',
    url: 'https://www.fxsound.com/'
  },
  {
    name: 'Spatial layers',
    role: 'Dolby, DTS, THX, or game HRTF',
    fit: 'Important for FPS because spatial layers can help direction or make it worse depending on the game.',
    action: 'Pick one spatial layer at a time. Do not stack game HRTF, Windows spatial, Sonar spatial, and THX together.',
    risk: 'Stacked spatial processing can smear verticality and front/back cues.',
    url: 'https://learn.microsoft.com/en-us/windows/win32/coreaudio/spatial-sound'
  },
  {
    name: 'Mic processors',
    role: 'Broadcast, Wave Link, G HUB, iCUE, or Voicemod',
    fit: 'Useful when teammates hear boom, clipping, noise suppression artifacts, or doubled monitoring.',
    action: 'Detect first, then test Discord input gain and CueForge mic analysis before changing filters.',
    risk: 'Can hide the real mic level or add processing delay if several mic tools are active.',
    url: 'https://learn.microsoft.com/en-us/windows/win32/coreaudio/wasapi'
  },
  {
    name: 'VB-CABLE / Voicemeeter',
    role: 'Virtual routing bridge',
    fit: 'Useful later for loopback tests, stream mixes, and before/after capture.',
    action: 'Detect only for now. Add guided routing once CueForge has a full desktop setup wizard.',
    risk: 'Bad routing can create silence, echo, or doubled monitoring.',
    url: 'https://vb-audio.com/Cable/'
  },
  {
    name: 'CueForge Native APO',
    role: 'Future signed driver layer',
    fit: 'Only worth doing after the app proves real demand from beta testers.',
    action: 'Design later as a signed Windows APO or packaged native helper with backups and undo.',
    risk: 'High maintenance, signing, Windows compatibility, and trust burden.',
    url: 'https://learn.microsoft.com/en-us/windows-hardware/drivers/audio/audio-processing-object-architecture'
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildApoConfig(eq, preamp = null) {
  const safeEq = clampEqToSafety(eq, bands.map(frequencyValue));
  const preampDb = preamp ?? calculateRequiredPreamp(safeEq);
  const lines = [`Preamp: ${preampDb.toFixed(1)} dB`];
  safeEq.forEach((gain, index) => {
    lines.push(`Filter ${index + 1}: ON PK Fc ${bands[index]} Hz Gain ${gain.toFixed(1)} dB Q 1.20`);
  });
  return lines.join('\n');
}

function analyzeSample(input) {
  const seed = input.trim().length || 7;
  const noise = clamp(28 + (seed % 31), 20, 72);
  const clarity = clamp(86 - noise / 2 + (seed % 9), 38, 96);
  const clipping = clamp((seed * 7) % 23, 0, 100);
  const warmth = clamp(52 + (seed % 27), 25, 92);
  return {
    noise,
    clarity,
    clipping,
    warmth,
    recommendation:
      noise > 48
        ? 'Enable light noise suppression and lower mic gain by 4-6%.'
        : 'Mic floor is usable. Keep suppression light to avoid robotic voice artifacts.'
  };
}

function rewriteLegacyUiCopy(text = '') {
  return legacyUiCopyRewrites.reduce(
    (current, [before, after]) => current.replaceAll(before, after),
    String(text || '')
  );
}

function frequencyValue(value) {
  if (typeof value === 'number') return value;
  const text = String(value).toLowerCase();
  if (text.endsWith('k')) return Number(text.replace('k', '')) * 1000;
  return Number(text) || 1000;
}

function buildEqFromSourceProfile(profile, fallbackEq = baseEq) {
  const next = [...fallbackEq];
  if (!profile?.filters?.length) return next;

  profile.filters.forEach((filter) => {
    const target = Number(filter.fc);
    if (!Number.isFinite(target)) return;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    bands.forEach((band, index) => {
      const distance = Math.abs(frequencyValue(band) - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    next[bestIndex] = clamp(Number(filter.gainDb) || 0, -6, 6);
  });

  return next;
}

const SIMPLE_NAV_ITEMS = [
  ['dashboard', Gauge, 'Command Center'],
  ['detect', Search, 'Auto Setup'],
  ['mic', Mic, 'Mic Check'],
  ['eq', SlidersHorizontal, 'Tune'],
  ['blindmatch', Radio, 'Sound Match'],
  ['trial', Gamepad2, 'Play Test'],
  ['reports', Bug, 'Fix Issue'],
  ['settings', Settings2, 'Settings']
];

const EXPERT_NAV_ITEMS = [
  ['hub', Radio, 'Community Hub'],
  ['dashboard', Gauge, 'Control'],
  ['selftest', TestTube2, 'Self Test'],
  ['dna', BrainCircuit, 'Audio DNA'],
  ['blindmatch', Radio, 'Blind Match'],
  ['masking', AudioLines, 'Masking Lab'],
  ['trial', Gamepad2, 'Player Trial'],
  ['beta', Activity, 'Beta Check-in'],
  ['notes', Bug, 'Panda Notes'],
  ['saves', Save, 'Gameplay Save'],
  ['reports', Bug, 'Report Lab'],
  ['calibration', Sparkles, 'Calibration'],
  ['mic', Mic, 'Mic Lab'],
  ['eq', SlidersHorizontal, 'EQ Studio'],
  ['games', Gamepad2, 'Game Profiles'],
  ['detect', Search, 'Auto Detect'],
  ['drivers', SlidersHorizontal, 'Driver Layer'],
  ['hearing', Headphones, 'Hearing Model'],
  ['inventory', BrainCircuit, 'System Info'],
  ['settings', Settings2, 'Settings']
];

const SIMPLE_NAV_IDS = new Set(SIMPLE_NAV_ITEMS.map(([id]) => id));
const SIMPLE_ALLOWED_IDS = new Set([
  ...SIMPLE_NAV_ITEMS.map(([id]) => id),
  'selftest',
  'dna',
  'masking',
  'games',
  'drivers',
  'hearing',
  'inventory'
]);

function App() {
  const [setupComplete, setSetupComplete] = useState(() => localStorage.getItem('cueforge-setup-complete') !== 'no');
  const [active, setActive] = useState('dashboard');
  const [eq, setEq] = useState(baseEq);
  const [sample, setSample] = useState('HyperX Cloud Alpha, Discord, Valorant, teammates say mic is a little boomy');
  const [analysis, setAnalysis] = useState(() => analyzeSample(sample));
  const [selectedGame, setSelectedGame] = useState(gameProfiles[0].game);
  const [selectedSourceProfile, setSelectedSourceProfile] = useState('iemFps');
  const [saved, setSaved] = useState(false);
  const [replayNotice, setReplayNotice] = useState('');
  const [uiNotes, setUiNotes] = useState(() => getSavedJson(UI_FEEDBACK_KEY) || []);
  const [shortcutVault, setShortcutVault] = useState(() => mergeShortcutDefaults(getSavedJson(SHORTCUT_VAULT_KEY), {
    release: publicRelease,
    brand: { discord: socialLinks.Discord }
  }));
  const [userSettings, setUserSettings] = useState(() => normalizeUserSettings(getSavedJson(USER_SETTINGS_KEY)));
  const [uiNoteDraft, setUiNoteDraft] = useState(null);
  const [uiNoteNotice, setUiNoteNotice] = useState(() => localStorage.getItem('cueforge-ui-note-notice-dismissed') !== 'yes');
  const [uiNoteStatus, setUiNoteStatus] = useState('Right-click any app area to leave a developer note.');
  const [shareStatus, setShareStatus] = useState('Share is ready. Copy the app invite or current audio profile when you want.');
  const [chainDevices, setChainDevices] = useState([]);
  const [chainBridgeReport, setChainBridgeReport] = useState(null);
  const [chainAutoDetectReport, setChainAutoDetectReport] = useState(null);
  const [soundPreferenceModel, setSoundPreferenceModel] = useState(() => getSavedJson('cueforge-preference-model'));
  const [desktopBridgeReady, setDesktopBridgeReady] = useState(false);
  const configRef = useRef(null);
  const apoConfig = useMemo(() => buildApoConfig(eq), [eq]);
  const sourceConfig = useMemo(
    () => buildApoConfigFromFilters(localSourceProfiles[selectedSourceProfile]),
    [selectedSourceProfile]
  );
  const expertMode = isExpertMode(userSettings);
  const navItems = expertMode ? EXPERT_NAV_ITEMS : SIMPLE_NAV_ITEMS;
  const activeTitle = active === 'dashboard'
    ? 'Setup Command Center'
    : !expertMode && active === 'blindmatch'
      ? 'Sound Match'
      : sectionTitle(active);
  const topbarCopy = expertMode
    ? 'Test your mic, tune your IEMs, generate game-ready EQ, and keep your setup dialed in without guessing.'
    : 'Start with auto setup, run one check, tune safely, then play. Expert tools stay out of the way until you need them.';
  const appInviteText = useMemo(() => buildAppInviteText({
    appUrl: publicRelease.app,
    discordUrl: socialLinks.Discord
  }), []);

  const latestHearingProfile = () => {
    try {
      const saved = localStorage.getItem('cueforge-hearing-results');
      if (!saved) return null;
      const results = JSON.parse(saved);
      const compensation = calculateCompensation(results);
      return {
        results,
        score: hearingScore(results),
        compensation,
        equalizerApoOverlay: buildHearingApoOverlay(compensation)
      };
    } catch {
      return null;
    }
  };

  const latestDnaProfile = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('cueforge-dna-history') || '[]');
      return saved[0] || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (window.cueforgeDesktop?.info) {
      window.cueforgeDesktop.info()
        .then((info) => setDesktopBridgeReady(Boolean(info)))
        .catch(() => setDesktopBridgeReady(Boolean(window.cueforgeDesktop?.isDesktop)));
    } else {
      setDesktopBridgeReady(Boolean(window.cueforgeDesktop?.isDesktop));
    }

    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => setChainDevices(devices.filter((device) => device.kind?.includes('audio'))))
        .catch(() => {});
    }

    getGeneratedBridgeReport()
      .then((report) => {
        if (report) setChainBridgeReport(report);
      })
      .catch(() => {});
  }, []);

  const cueforgeState = useMemo(() => buildCueForgeState({
    devices: chainDevices,
    bridgeReport: chainBridgeReport,
    autoDetectReport: chainAutoDetectReport,
    eq,
    game: selectedGame,
    selectedSourceProfile,
    desktopReady: desktopBridgeReady,
    hearing: latestHearingProfile(),
    preferenceModel: soundPreferenceModel,
    betaCheckins: getSavedJson('cueforge-beta-checkins') || [],
    apoConfig
  }), [chainDevices, chainBridgeReport, chainAutoDetectReport, eq, selectedGame, selectedSourceProfile, desktopBridgeReady, soundPreferenceModel, apoConfig]);

  useEffect(() => {
    if (!cueforgeState.setupAssessmentSnapshot) return;
    publishSetupAssessmentSnapshot(cueforgeState.setupAssessmentSnapshot);
  }, [cueforgeState]);

  const commandCenterContext = useMemo(() => ({
    lastTrial: getSavedJson('cueforge-last-player-trial'),
    lastReport: getSavedJson('cueforge-last-issue-report'),
    latestDna: latestDnaProfile(),
    betaCheckins: getSavedJson('cueforge-beta-checkins') || []
  }), [active, analysis, uiNotes.length, cueforgeState]);
  const shareProfilePayload = useMemo(() => createAudioProfileShare({
    eq,
    bands,
    selectedGame,
    selectedSourceProfile,
    sourceProfile: localSourceProfiles[selectedSourceProfile],
    appUrl: publicRelease.app,
    cueforgeState: cueforgeState.stateV2
  }), [eq, selectedGame, selectedSourceProfile, cueforgeState]);
  const shareProfileText = useMemo(() => buildAudioProfileShareText(shareProfilePayload), [shareProfilePayload]);

  const applyProfileBrain = () => {
    const nextEq = cueforgeState.profile?.recommendation?.eq;
    if (Array.isArray(nextEq) && nextEq.length === bands.length) {
      setEq(nextEq.map((gain) => clamp(Number(gain) || 0, -6, 6)));
      setSelectedSourceProfile(cueforgeState.profile.recommendation.sourceProfile || selectedSourceProfile);
      setSaved(false);
      setActive('eq');
      setShareStatus('Profile Engine v2 applied a safe starting curve. Review it before exporting.');
    } else {
      setShareStatus('Profile Engine needs setup data before it can apply a curve.');
      setActive('detect');
    }
  };

  const exportSeamlessReleasePack = () => {
    const pack = cueforgeState.releasePack;
    downloadTextFile('cueforge-v0.2.0-alpha.3-release-pack.json', JSON.stringify(pack, null, 2));
    downloadTextFile('cueforge-v0.2.0-alpha.3-summary.txt', summarizeReleasePack(pack));
    setShareStatus('v0.2.0-alpha.3 release pack exported locally.');
  };

  const setBand = (index, value) => {
    setEq((current) => current.map((gain, i) => (i === index ? Number(value) : gain)));
    setSaved(false);
  };

  const runAnalyzer = () => {
    setAnalysis(analyzeSample(sample));
    setEq((current) => current.map((gain, index) => clamp(gain + ((index % 3) - 1) * 0.3, -6, 6)));
  };

  const applyAutoTune = (nextEq) => {
    setEq(nextEq);
    setSaved(false);
    setActive('eq');
  };

  const applySetupIntelligenceProfile = ({ game, sourceProfile }) => {
    const safeSourceProfile = localSourceProfiles[sourceProfile] ? sourceProfile : 'competitiveFps';
    setSelectedGame(game || selectedGame);
    setSelectedSourceProfile(safeSourceProfile);
    setEq((current) => buildEqFromSourceProfile(localSourceProfiles[safeSourceProfile], current));
    setSaved(false);
    setActive('eq');
  };

  const autoSwitchDetectedGameProfile = ({ game, sourceProfile, matchedHint }) => {
    const safeSourceProfile = localSourceProfiles[sourceProfile] ? sourceProfile : 'competitiveFps';
    setSelectedGame(game || selectedGame);
    setSelectedSourceProfile(safeSourceProfile);
    setEq((current) => buildEqFromSourceProfile(localSourceProfiles[safeSourceProfile], current));
    setSaved(false);
    setShareStatus(`Detected ${game}. CueForge switched to ${localSourceProfiles[safeSourceProfile].name}; review before exporting. ${matchedHint ? `Match: ${matchedHint}.` : ''}`);
  };

  const applySharedAudioProfile = (profile) => {
    if (!Array.isArray(profile.eq) || profile.eq.length !== bands.length) {
      setShareStatus('That shared profile is missing the 10 CueForge EQ bands.');
      return;
    }
    setEq(profile.eq.map((gain) => clamp(Number(gain) || 0, -6, 6)));
    if (profile.game) setSelectedGame(profile.game);
    if (localSourceProfiles[profile.sourceProfileId]) setSelectedSourceProfile(profile.sourceProfileId);
    setSaved(false);
    setActive('eq');
    setShareStatus(`Imported ${profile.sourceProfileName || 'shared audio profile'} safely. Review EQ before exporting.`);
  };

  const copyShareText = async (text, label) => {
    try {
      await navigator.clipboard?.writeText(text);
      setShareStatus(`${label} copied.`);
    } catch {
      setShareStatus(`${label} is ready in the Share panel. Select the text manually if clipboard is blocked.`);
    }
  };

  const applySimpleAutoTune = () => {
    applyAutoTune(buildAutoTuneEq({
      preset: 'iem',
      trebleSensitivity: 4,
      bassPreference: 2,
      footstepFocus: 7
    }));
  };

  const updateUserSettings = (patch) => {
    setUserSettings((current) => {
      const next = normalizeUserSettings({ ...current, ...patch });
      safeSetJson(USER_SETTINGS_KEY, next);
      return next;
    });
  };

  const resetUserSettings = () => {
    const next = normalizeUserSettings();
    setUserSettings(next);
    safeSetJson(USER_SETTINGS_KEY, next);
  };

  const downloadConfig = () => {
    downloadTextFile('cueforge-equalizer-apo-config.txt', apoConfig);
    setSaved(true);
  };

  const exportSetupPack = () => {
    const calibration = {
      eq,
      equalizerApoConfig: apoConfig,
      note: 'Generated from the current EQ Studio curve.'
    };
    const pack = buildExportPack({
      apoConfig,
      calibration,
      hearing: latestHearingProfile(),
      dna: latestDnaProfile(),
      uiFeedbackNotes: uiNotes,
      shortcuts: shortcutVault,
      cueforgeState: cueforgeState.stateV2
    });

    Object.entries(pack.files).forEach(([filename, text], index) => {
      setTimeout(() => downloadTextFile(`cueforge-${filename}`, text), index * 160);
    });
  };

  const handleUiContextMenu = (event) => {
    if (!expertMode || !userSettings.uiNotesEnabled) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.ui-note-popover')) return;
    event.preventDefault();

    const rect = target.getBoundingClientRect();
    const position = computeUiNotePopoverPosition({
      clientX: event.clientX,
      clientY: event.clientY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
    setUiNoteDraft({
      tag: 'confusing',
      note: '',
      page: setupComplete ? sectionTitle(active) : 'Setup Journey',
      target: describeFeedbackTarget(target),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        xPercent: Math.round((event.clientX / Math.max(1, window.innerWidth)) * 100),
        yPercent: Math.round((event.clientY / Math.max(1, window.innerHeight)) * 100)
      },
      position,
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    });
  };

  const saveUiNote = () => {
    if (!uiNoteDraft?.note.trim()) {
      setUiNoteStatus('Add a quick note first, then save it.');
      return;
    }

    const nextNote = createUiFeedbackNote(uiNoteDraft);
    const next = [...uiNotes, nextNote].slice(-80);
    setUiNotes(next);
    safeSetJson(UI_FEEDBACK_KEY, next);
    setUiNoteDraft(null);
    setUiNoteStatus('Saved locally. It will attach to the next redacted report or export pack.');
  };

  const dismissUiNoteNotice = () => {
    localStorage.setItem('cueforge-ui-note-notice-dismissed', 'yes');
    setUiNoteNotice(false);
  };

  const feedbackLayer = (
    <>
      {expertMode && userSettings.uiNotesEnabled && uiNoteNotice && (
        <div className="tester-note-banner">
          <Bug size={18} />
          <span>Personal UI debugger is on: right-click any CueForge area to tag a note. Notes stay local and only ride with the redacted report or export pack you choose to send.</span>
          <button className="ghost" onClick={dismissUiNoteNotice}>Got it</button>
        </div>
      )}
      {expertMode && userSettings.uiNotesEnabled && uiNoteStatus && <p className="ui-note-status">{uiNoteStatus}</p>}
      {expertMode && userSettings.uiNotesEnabled && uiNoteDraft && (
        <UiNotePopover
          draft={uiNoteDraft}
          onChange={setUiNoteDraft}
          onCancel={() => setUiNoteDraft(null)}
          onSave={saveUiNote}
        />
      )}
    </>
  );

  const completeSetup = (profile) => {
    localStorage.setItem('cueforge-setup-complete', 'yes');
    safeSetJson('cueforge-setup-profile', profile);
    setSelectedGame(profile.gameFocus || selectedGame);
    setSetupComplete(true);
    setActive('dashboard');
  };

  const rerunSetup = () => {
    localStorage.setItem('cueforge-setup-complete', 'no');
    setSetupComplete(false);
    setActive('dashboard');
  };

  useEffect(() => {
    if (!expertMode && !SIMPLE_ALLOWED_IDS.has(active)) setActive('dashboard');
  }, [active, expertMode]);

  if (!setupComplete) {
    return (
      <div className="setup-journey-shell" onContextMenu={handleUiContextMenu}>
        <SetupJourney settings={userSettings} onComplete={completeSetup} onSkip={() => completeSetup({ skipped: true, completedAt: new Date().toISOString() })} />
        {feedbackLayer}
      </div>
    );
  }

  return (
    <div className={`app-shell ${expertMode ? 'expert-mode' : 'simple-mode'}`} onContextMenu={handleUiContextMenu}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Waves size={22} /></div>
          <div className="brand-copy">
            <strong>CueForge</strong>
            <span>{socialBrand.lab} / by {socialBrand.owner} / {socialBrand.handle}</span>
            <em className="mode-badge">{expertMode ? 'Expert Mode' : 'Simple Mode'}</em>
            <div className="brand-socials" aria-label="CueForge social links">
              {socialBrand.links.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>
              ))}
            </div>
          </div>
        </div>
        <nav>
          {navItems.map(([id, Icon, label]) => (
            <button
              className={active === id ? 'active' : ''}
              data-qa-nav={id}
              key={id}
              onClick={() => setActive(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ShieldCheck size={18} />
          <span>Safe tuning. Detects trusted audio layers and keeps native changes explicit.</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{activeTitle}</h1>
            <p>{topbarCopy}</p>
          </div>
          <div className="top-actions">
            {!expertMode ? (
              <>
                <button className="primary" onClick={() => setActive('detect')}><Search size={18} /> Auto setup</button>
                <button className="ghost" onClick={applySimpleAutoTune}><Sparkles size={18} /> Auto tune</button>
                <button className="ghost" onClick={() => copyShareText(appInviteText, 'App invite')}><Copy size={18} /> Share</button>
                <button className="ghost" onClick={() => setActive('reports')}><Bug size={18} /> Report issue</button>
                <button className="ghost" onClick={() => updateUserSettings({ interfaceMode: 'expert' })}><BrainCircuit size={18} /> Expert</button>
              </>
            ) : (
              <>
                <button className="ghost" onClick={() => updateUserSettings({ interfaceMode: 'simple' })}><Gauge size={18} /> Simple</button>
                <button className="ghost" onClick={() => copyShareText(shareProfileText, 'Audio profile')}><Copy size={18} /> Copy Profile</button>
                <a className="ghost" href={publicRelease.feedback} target="_blank" rel="noreferrer"><Bug size={18} /> Feedback</a>
                <button className="ghost" onClick={exportSetupPack}><Download size={18} /> Export Pack</button>
                <button className="primary" onClick={downloadConfig}><Download size={18} /> Export APO</button>
              </>
            )}
          </div>
        </header>
        {shareStatus && <p className="share-status">{shareStatus}</p>}
        {feedbackLayer}

        {active === 'hub' && <CommunityHubPage cueforgeState={cueforgeState.stateV2} />}

        {active === 'dashboard' && (expertMode ? (
          <section className="grid dashboard-grid">
            <Panel className="wide no-pad" title="Seamless Engine Foundation" icon={BrainCircuit}>
              <SetupCommandCenter
                state={cueforgeState}
                context={commandCenterContext}
                onOpen={setActive}
                onApplyProfile={applyProfileBrain}
                onExportPack={exportSeamlessReleasePack}
              />
            </Panel>
            <Panel className="wide" title="Live Intelligence" icon={Activity}>
              <div className="spectrum" aria-label="animated spectrum visualizer">
                {Array.from({ length: 38 }).map((_, i) => <span key={i} style={{ '--h': `${24 + ((i * 17) % 72)}%` }} />)}
              </div>
              <div className="metric-row">
                <Metric label="Mic clarity" value={`${analysis.clarity}%`} tone="teal" />
                <Metric label="Noise floor" value={`${analysis.noise}%`} tone="amber" />
                <Metric label="Clip risk" value={`${analysis.clipping}%`} tone="red" />
              </div>
            </Panel>
            <Panel title="Recommended Profile" icon={Sparkles}>
              <h2>Setup-aware starting point</h2>
              <p>Import or auto-detect the chain first, then tune from what is actually connected instead of guessing from a random preset.</p>
              <button className="ghost" onClick={() => setActive('eq')}>Tune EQ <ChevronRight size={16} /></button>
            </Panel>
            <Panel title="Why Test CueForge" icon={ShieldCheck}>
              <h2>Built by players, tested in real matches</h2>
              <p>CueForge is for Windows players using IEMs, headsets, USB mics, Discord, Equalizer APO, Peace, Sonar, and real-world audio chains that never behave perfectly.</p>
              <p>CueForge is not trying to out-corporate big audio suites. It is for players who want to see what is actually happening in their setup, then help shape the fix.</p>
              <ul className="clean-list">
                <li>Local-first: no hidden upload, no silent driver change, no mystery cloud tuning.</li>
                <li>Chain-aware: separates game audio, Discord, Windows routing, mic gain, and EQ instead of blaming one knob.</li>
                <li>Replayable: reports and Panda Notes make bugs reproducible instead of vague.</li>
                <li>Fast loop: tester issues feed the repair queue so real sessions turn into real updates.</li>
              </ul>
              <div className="live-actions">
                <a className="primary button-link" href={publicRelease.app} target="_blank" rel="noreferrer"><Play size={18} /> Open web app</a>
                <a className="ghost button-link" href={publicRelease.feedback} target="_blank" rel="noreferrer"><Bug size={18} /> Send feedback</a>
              </div>
              <p className="callout">{publicRelease.desktopStatus}</p>
            </Panel>
            <Panel title="Product Invention" icon={Radio}>
              <h2>Audio DNA</h2>
              <p>Learns your headset, games, and manual tweaks into a personal sound fingerprint for future automatic recommendations.</p>
            </Panel>
          </section>
        ) : (
          <SimpleHome
            analysis={analysis}
            selectedGame={selectedGame}
            selectedSourceProfile={selectedSourceProfile}
            appInviteText={appInviteText}
            shareProfileText={shareProfileText}
            shareProfilePayload={shareProfilePayload}
            cueforgeState={cueforgeState}
            commandCenterContext={commandCenterContext}
            onOpen={setActive}
            onAutoTune={applySimpleAutoTune}
            onExportSetup={exportSetupPack}
            onExportReleasePack={exportSeamlessReleasePack}
            onApplyProfileBrain={applyProfileBrain}
            onImportProfile={applySharedAudioProfile}
          />
        ))}

        {active === 'selftest' && <SelfTestRunner />}

        {active === 'dna' && <AudioDnaPage eq={eq} cueforgeState={cueforgeState.stateV2} />}

        {active === 'blindmatch' && (
          <BlindMatchPage
            baseEq={eq}
            onApply={applyAutoTune}
            onSavePreferenceModel={setSoundPreferenceModel}
          />
        )}

        {active === 'masking' && <MaskingLabPage eq={eq} onApply={applyAutoTune} />}

        {active === 'trial' && (
          <PlayerTrialPage
            eq={eq}
            selectedGame={selectedGame}
            selectedSourceProfile={selectedSourceProfile}
          />
        )}

        {active === 'beta' && <BetaCheckInPage />}

        {active === 'notes' && (
          <PandaNotesPage
            uiNotes={uiNotes}
            onOpen={setActive}
            onClearUiNotes={() => {
              setUiNotes([]);
              safeSetJson(UI_FEEDBACK_KEY, []);
              setUiNoteStatus('Panda Notes cleared from this browser.');
            }}
          />
        )}
        {active === 'saves' && (
          <GameplaySavePage
            eq={eq}
            selectedGame={selectedGame}
            selectedSourceProfile={selectedSourceProfile}
          />
        )}

        {active === 'reports' && (
          <ReportLabPage
            eq={eq}
            apoConfig={apoConfig}
            selectedGame={selectedGame}
            selectedSourceProfile={selectedSourceProfile}
            sample={sample}
            analysis={analysis}
            active={active}
            replayNotice={replayNotice}
            uiNotes={uiNotes}
            cueforgeState={cueforgeState.stateV2}
            onReplay={(state) => {
              setEq(state.eq);
              setSample(state.sample || sample);
              setAnalysis(state.analysis || analyzeSample(state.sample || sample));
              if (state.selectedGame) setSelectedGame(state.selectedGame);
              if (state.selectedSourceProfile) setSelectedSourceProfile(state.selectedSourceProfile);
              setReplayNotice('Report replayed into the app. EQ, selected game, source profile, and mic notes were restored.');
              setActive('eq');
            }}
          />
        )}

        {active === 'calibration' && <CalibrationWizard onApply={applyAutoTune} />}

        {active === 'mic' && (
          <section className="grid two">
            <LiveAudioLab />
            <Panel title="Mic Problem Analyzer" icon={Mic}>
              <p>Type what people heard in Discord or in-game. CueForge turns that plain note into a likely cause and a safe first tweak.</p>
              <label className="field">
                <span>What happened?</span>
                <textarea aria-label="What happened?" value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Example: teammates say my mic is boomy in Discord, but game audio sounds fine." />
              </label>
              <button className="primary" onClick={runAnalyzer}><Play size={18} /> Run analysis</button>
              <p className="callout">For live proof, use Start live mic feedback on the left. This box is for quick notes from teammates or testers.</p>
            </Panel>
            <Panel title="Result" icon={AudioLines}>
              <Metric label="Voice clarity" value={`${analysis.clarity}%`} tone="teal" />
              <Metric label="Room/noise pressure" value={`${analysis.noise}%`} tone="amber" />
              <Metric label="Clipping risk" value={`${analysis.clipping}%`} tone="red" />
              <p className="callout">{analysis.recommendation}</p>
              <div className="data-card">
                <strong>HyperX mic starting point</strong>
                <span>80-90% Windows input gain, Discord auto gain off, lower gain if clip risk is over 15%.</span>
              </div>
            </Panel>
            <Panel title="Evidence Recorder" icon={ShieldCheck}>
              <p>Need proof from a real session? The opt-in recorder lives in Beta Check-in so testers can capture a short local clip, export metadata, and keep raw audio under their control.</p>
              <div className="metric-row selftest-summary">
                <Metric label="Saved clips" value={String((getSavedJson('cueforge-audio-evidence') || []).length)} tone={(getSavedJson('cueforge-audio-evidence') || []).length ? 'teal' : 'amber'} />
                <Metric label="Upload" value="Manual" tone="teal" />
              </div>
              <button className="primary" onClick={() => setActive('beta')}><Mic size={18} /> Open evidence logger</button>
            </Panel>
          </section>
        )}

        {active === 'eq' && (expertMode ? (
          <section className="grid two">
            <Panel className="wide" title="10-Band EQ Studio" icon={SlidersHorizontal}>
              <div className="eq-board">
                {eq.map((gain, index) => (
                  <label className="eq-band" key={bands[index]}>
                    <input type="range" min="-6" max="6" step="0.5" value={gain} onChange={(e) => setBand(index, e.target.value)} />
                    <strong>{gain > 0 ? '+' : ''}{gain.toFixed(1)}</strong>
                    <span>{bands[index]}</span>
                  </label>
                ))}
              </div>
            </Panel>
            <Panel title="Equalizer APO Export" icon={Save}>
              <pre ref={configRef}>{apoConfig}</pre>
              <div className="live-actions">
                <button className="primary" onClick={downloadConfig}><Download size={18} /> Save config</button>
                <button className="ghost" onClick={() => navigator.clipboard?.writeText(apoConfig)}><Save size={18} /> Copy config</button>
              </div>
              {saved && <p className="success">Config generated locally.</p>}
            </Panel>
            <Panel title="Local Source Profiles" icon={Headphones}>
              <div className="source-tabs">
                {Object.entries(localSourceProfiles).map(([id, profile]) => (
                  <button className={selectedSourceProfile === id ? 'selected' : ''} key={id} onClick={() => setSelectedSourceProfile(id)}>
                    {profile.name}
                  </button>
                ))}
              </div>
              <p>{localSourceProfiles[selectedSourceProfile].description || 'Pulled from local AutoEQ-style profile data already present in this workspace.'}</p>
              <pre>{sourceConfig}</pre>
            </Panel>
          </section>
        ) : (
          <SimpleTunePage
            eq={eq}
            selectedSourceProfile={selectedSourceProfile}
            appInviteText={appInviteText}
            shareProfileText={shareProfileText}
            shareProfilePayload={shareProfilePayload}
            onAutoTune={applySimpleAutoTune}
            onSaveConfig={downloadConfig}
            onOpenExpert={() => updateUserSettings({ interfaceMode: 'expert' })}
            onOpenSoundMatch={() => setActive('blindmatch')}
            onImportProfile={applySharedAudioProfile}
          />
        ))}

        {active === 'games' && (
          <section className="grid two">
            <Panel title="Game-Aware Profiles" icon={Gamepad2}>
              <div className="stack">
                {gameProfiles.map((profile) => (
                  <button className={`profile ${selectedGame === profile.game ? 'selected' : ''}`} key={profile.game} onClick={() => setSelectedGame(profile.game)}>
                    <strong>{profile.game}</strong>
                    <span>{profile.mode}</span>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Profile Actions" icon={Volume2}>
              {gameProfiles.filter((p) => p.game === selectedGame).map((profile) => (
                <div key={profile.game}>
                  <h2>{profile.mode}</h2>
                  <ul className="clean-list">{profile.changes.map((change) => <li key={change}>{change}</li>)}</ul>
                </div>
              ))}
            </Panel>
          </section>
        )}

        {active === 'detect' && <AutoDetect
          onApplyProfile={applySetupIntelligenceProfile}
          onAutoSwitchProfile={autoSwitchDetectedGameProfile}
          onUpdateChain={({ devices, bridgeReport, autoDetectReport, desktopReady }) => {
            if (devices) setChainDevices(devices);
            if (bridgeReport) setChainBridgeReport(bridgeReport);
            if (autoDetectReport) setChainAutoDetectReport(autoDetectReport);
            if (typeof desktopReady === 'boolean') setDesktopBridgeReady(desktopReady);
          }}
        />}

        {active === 'drivers' && <DriverLayerPage apoConfig={apoConfig} />}

        {active === 'hearing' && (
          <section className="grid two">
            <PersonalHearingModel />
            <Panel title="Headset Profiles" icon={Headphones}>
              <div className="stack">
                {headsetProfiles.map((profile) => (
                  <div className="data-card" key={profile.name}>
                    <strong>{profile.name}</strong>
                    <span>{profile.focus}</span>
                    <small>{profile.correction} · Confidence {profile.score}%</small>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Your Test Hardware" icon={ShieldCheck}>
              <div className="stack">
                {hardwareTargets.map((target) => (
                  <div className="data-card" key={target.name}>
                    <strong>{target.name}</strong>
                    <span>{target.aim}</span>
                    <small>{target.setup}</small>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {active === 'inventory' && <Inventory
          onOpen={setActive}
          onRerunSetup={rerunSetup}
          uiNotes={uiNotes}
          shortcutVault={shortcutVault}
          onUpdateShortcuts={(next) => {
            setShortcutVault(next);
            safeSetJson(SHORTCUT_VAULT_KEY, next);
          }}
          onUpdateUiNotes={(next) => {
            setUiNotes(next);
            safeSetJson(UI_FEEDBACK_KEY, next);
          }}
          onClearUiNotes={() => {
            setUiNotes([]);
            safeSetJson(UI_FEEDBACK_KEY, []);
            setUiNoteStatus('Developer UI notes cleared from this browser.');
          }}
        />}

        {active === 'settings' && (
          <SettingsPage
            settings={userSettings}
            onUpdate={updateUserSettings}
            onReset={resetUserSettings}
            onRerunSetup={rerunSetup}
            onOpen={setActive}
            uiNoteCount={uiNotes.length}
            shortcutCount={shortcutVault.length}
          />
        )}
      </main>
    </div>
  );
}

function describeFeedbackTarget(target) {
  const panel = target.closest('.panel')?.querySelector('.panel-title span')?.textContent || '';
  const aria = target.getAttribute('aria-label') || target.getAttribute('title') || '';
  const text = target.textContent?.replace(/\s+/g, ' ').trim() || '';
  const label = aria || text || panel || target.tagName.toLowerCase();

  return {
    label: label.slice(0, 120),
    role: target.getAttribute('role') || '',
    tagName: target.tagName,
    panel
  };
}

function UiNotePopover({ draft, onChange, onCancel, onSave }) {
  const popoverRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const popover = popoverRef.current;
      const textarea = textareaRef.current;
      if (!popover || !textarea) return;

      try {
        textarea.focus({ preventScroll: true });
      } catch {
        textarea.focus();
      }

      const popoverRect = popover.getBoundingClientRect();
      const textareaRect = textarea.getBoundingClientRect();
      const actionsRect = popover.querySelector('.ui-note-actions')?.getBoundingClientRect();
      const scrollDelta = computeUiNoteFocusScrollDelta({
        popoverTop: popoverRect.top,
        popoverBottom: actionsRect?.top || popoverRect.bottom,
        fieldTop: textareaRect.top,
        fieldBottom: textareaRect.bottom
      });

      if (scrollDelta) popover.scrollTop += scrollDelta;
    });

    return () => cancelAnimationFrame(frame);
  }, [draft.position.x, draft.position.y, draft.position.maxHeight]);

  return (
    <div
      ref={popoverRef}
      className={`ui-note-popover note-${draft.position.verticalPlacement || 'below'} note-${draft.position.horizontalPlacement || 'center'}`}
      style={{
        left: `${draft.position.x}px`,
        top: `${draft.position.y}px`,
        width: `${draft.position.width || 340}px`,
        maxHeight: `${draft.position.maxHeight || 430}px`
      }}
      role="dialog"
      aria-label="Developer UI note"
    >
      <div className="ui-note-head">
        <strong>Panda note</strong>
        <button className="ghost" onClick={onCancel}>Close</button>
      </div>
      <p>Tag what felt off here. This stays local until it is included in a report/export you send.</p>
      <div className="data-card">
        <strong>{draft.target.panel || draft.page}</strong>
        <span>{draft.target.label}</span>
        <small>{draft.page} / {draft.viewport.xPercent}% x {draft.viewport.yPercent}%</small>
      </div>
      <small className="ui-note-boundary">
        {draft.position.verticalPlacement === 'above' ? 'Opened above the click to stay inside the window.' : 'Opened below the click to stay inside the window.'}
      </small>
      <label className="field">
        <span>Retrieval tag</span>
        <select value={draft.tag} onChange={(event) => onChange({ ...draft, tag: event.target.value })}>
          {uiFeedbackTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Note for developer</span>
        <textarea
          ref={textareaRef}
          value={draft.note}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          placeholder="What felt confusing, broken, too small, missing, or annoying?"
          autoFocus
        />
      </label>
      <div className="live-actions ui-note-actions">
        <button className="primary" onClick={onSave}>Save note</button>
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function createBrowserAudioContext() {
  const BrowserAudioContext = window.AudioContext || window.webkitAudioContext;
  if (!BrowserAudioContext) throw new Error('Web Audio is unavailable');
  return new BrowserAudioContext();
}

function pickEvidenceMimeType() {
  if (!window.MediaRecorder?.isTypeSupported) return '';
  return [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ].find((type) => window.MediaRecorder.isTypeSupported(type)) || '';
}

function evidenceFileExtension(mimeType = '') {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

function SetupJourney({ settings, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [micStatus, setMicStatus] = useState('not checked');
  const [scanStatus, setScanStatus] = useState('not scanned');
  const [deviceCount, setDeviceCount] = useState(0);
  const [bridgeFound, setBridgeFound] = useState(false);
  const [toneStatus, setToneStatus] = useState('ready');
  const [soundActive, setSoundActive] = useState(false);
  const soundRef = useRef(null);
  const [profile, setProfile] = useState(() => ({
    handle: '',
    gameFocus: gameProfiles[0].game,
    outputType: 'IEM / headphones',
    micType: 'USB or headset mic',
    tools: {
      equalizerApo: false,
      sonar: false,
      discord: true
    },
    footstepFocus: 7,
    commsFocus: 7,
    bassControl: 5,
    fatigueControl: 6
  }));

  const setupSteps = [
    ['Trail Gear', 'Name the chain before the forest starts listening.'],
    ['Bamboo Scan', 'Scan browser devices and optional local bridge data.'],
    ['Pond Tune', 'Choose the first match-ready tuning direction.'],
    ['Reflection', 'Save the profile and meet the tuned version.']
  ];
  const setupStage = setupSteps[step];
  const backgroundAudioAllowed = canPlayBackgroundAudio(settings);
  const profileStrength = Math.round((Number(profile.footstepFocus) + Number(profile.commsFocus) + Number(profile.bassControl) + Number(profile.fatigueControl)) / 4 * 10);
  const setupRecovery = useMemo(() => buildPermissionRecovery({
    feature: 'setup-mic',
    state: micStatus,
    desktopReady: Boolean(window.cueforgeDesktop?.isDesktop)
  }), [micStatus]);
  const setupSummary = useMemo(() => [
    `Game focus: ${profile.gameFocus}`,
    `Output: ${profile.outputType}`,
    `Mic: ${profile.micType}`,
    `Tools: ${Object.values(profile.tools).filter(Boolean).length || 0} selected`,
    `Permission: ${setupRecovery.status}`,
    `Devices: ${deviceCount || 'not scanned yet'}`,
    bridgeFound ? 'Windows bridge: loaded' : 'Windows bridge: optional'
  ], [profile.gameFocus, profile.outputType, profile.micType, profile.tools, setupRecovery.status, deviceCount, bridgeFound]);

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updateTool = (key, value) => setProfile((current) => ({
    ...current,
    tools: { ...current.tools, [key]: value }
  }));

  useEffect(() => {
    if (soundRef.current) pulseSetupStep(step);
  }, [step]);

  useEffect(() => () => stopSetupSoundscape({ immediate: true }), []);

  useEffect(() => {
    if (!backgroundAudioAllowed && soundRef.current) {
      stopSetupSoundscape({ immediate: true });
      setToneStatus('background audio off in Settings');
    }
  }, [backgroundAudioAllowed]);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus('granted');
    } catch {
      setMicStatus('blocked or skipped');
    }
  };

  const scanSetup = async () => {
    const devices = await getBrowserAudioDevices();
    const bridge = await getGeneratedBridgeReport();
    setDeviceCount(devices.length);
    setBridgeFound(Boolean(bridge));
    setScanStatus(`${devices.length} browser audio devices${bridge ? ' plus Windows bridge' : ''}`);
  };

  const playSetupPulse = async () => {
    try {
      const context = createBrowserAudioContext();
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.04);
      master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.2);
      master.connect(context.destination);

      [220, 440, 880, 1760].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = index % 2 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.18);
        oscillator.connect(master);
        oscillator.start(context.currentTime + index * 0.18);
        oscillator.stop(context.currentTime + 0.28 + index * 0.18);
      });

      setToneStatus('calibration pulse played');
      setTimeout(() => context.close?.(), 1500);
    } catch {
      setToneStatus('tone engine blocked');
    }
  };

  const startSetupSoundscape = async () => {
    if (!backgroundAudioAllowed) {
      setToneStatus('background audio is off in Settings');
      return;
    }

    if (soundRef.current) {
      stopSetupSoundscape();
      return;
    }

    try {
      const context = createBrowserAudioContext();
      await context.resume();
      const master = context.createGain();
      const filter = context.createBiquadFilter();
      const drift = context.createStereoPanner();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.7);
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.8;
      drift.pan.value = 0;
      filter.connect(drift).connect(master).connect(context.destination);

      const drones = [55, 82.5, 110].map((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 1 ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = index === 0 ? 0.42 : 0.22;
        oscillator.connect(gain).connect(filter);
        oscillator.start();
        return { oscillator, gain };
      });

      const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * 0.18;
      }
      const noise = context.createBufferSource();
      const noiseFilter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 520;
      noiseFilter.Q.value = 0.7;
      noiseGain.gain.value = 0.038;
      noise.connect(noiseFilter).connect(noiseGain).connect(filter);
      noise.start();

      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.045;
      lfoGain.gain.value = 0.42;
      lfo.connect(lfoGain).connect(drift.pan);
      lfo.start();

      soundRef.current = { context, master, filter, drift, drones, noise, lfo };
      setSoundActive(true);
      setToneStatus('bamboo soundwalk on - local, low, and motion-matched');
      pulseSetupStep(step);
    } catch {
      setToneStatus('audio tunnel could not start in this browser');
    }
  };

  const stopSetupSoundscape = ({ immediate = false } = {}) => {
    const sound = soundRef.current;
    if (!sound) return;
    const stopAt = immediate ? sound.context.currentTime : sound.context.currentTime + 0.22;
    try {
      sound.master.gain.cancelScheduledValues(sound.context.currentTime);
      sound.master.gain.setValueAtTime(sound.master.gain.value, sound.context.currentTime);
      sound.master.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      window.setTimeout(() => {
        sound.drones.forEach(({ oscillator }) => oscillator.stop?.());
        sound.noise.stop?.();
        sound.lfo.stop?.();
        sound.context.close?.();
      }, immediate ? 0 : 260);
    } catch {
      sound.context.close?.();
    }
    soundRef.current = null;
    setSoundActive(false);
    setToneStatus('bamboo soundwalk off');
  };

  const pulseSetupStep = (activeStep) => {
    const sound = soundRef.current;
    if (!sound) return;
    const context = sound.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    oscillator.type = 'sine';
    oscillator.frequency.value = 180 + activeStep * 90;
    pan.pan.value = (activeStep - 1.5) * 0.22;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.038, context.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    oscillator.connect(gain).connect(pan).connect(sound.filter);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.48);
    sound.filter.frequency.setTargetAtTime(900 + activeStep * 180, context.currentTime, 0.08);
  };

  const finish = () => {
    onComplete({
      ...profile,
      micStatus,
      scanStatus,
      deviceCount,
      bridgeFound,
      toneStatus,
      completedAt: new Date().toISOString()
    });
  };

  return (
    <section className="setup-journey">
      <SetupThreeScene step={step} />
      <div className="setup-journey-content">
        <div className="setup-copy">
          <div className="brand setup-brand">
            <div className="brand-mark"><Waves size={22} /></div>
            <div>
              <strong>CueForge</strong>
              <span>First-run setup</span>
            </div>
          </div>
          <div className="setup-kicker">
            <span>Bamboo soundwalk</span>
            <strong>{String(step + 1).padStart(2, '0')} / {String(setupSteps.length).padStart(2, '0')}</strong>
          </div>
          <h1>Walk the bamboo path before you tune.</h1>
          <p>The first run is a guided soundwalk: gear in, devices checked, calibration shaped, then the pond reflection reveals the tuned player CueForge is building around.</p>
          <div className="setup-audio-controls">
            <button className={backgroundAudioAllowed ? 'primary' : 'ghost'} onClick={startSetupSoundscape}><Volume2 size={18} /> {soundActive ? 'Stop soundwalk' : backgroundAudioAllowed ? 'Start soundwalk' : 'Background audio off'}</button>
            <span>{toneStatus}</span>
          </div>
          <div className="setup-meta-grid" aria-label="Setup safety and status">
            <div><span>Profile</span><strong>{profileStrength}%</strong></div>
            <div><span>Mic</span><strong>{micStatus}</strong></div>
            <div><span>Devices</span><strong>{deviceCount}</strong></div>
            <div><span>Native</span><strong>{bridgeFound ? 'bridge' : 'manual'}</strong></div>
          </div>
          <div className="setup-steps">
            {setupSteps.map(([label, detail], index) => (
              <button className={step === index ? 'selected' : index < step ? 'done' : ''} key={label} onClick={() => setStep(index)}>
                <strong>{index + 1}. {label}</strong>
                <span>{detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setup-panel">
          <div className="setup-panel-stage">
            <span>Stage {String(step + 1).padStart(2, '0')}</span>
            <strong>{setupStage[0]}</strong>
          </div>
          {step === 0 && (
            <>
              <div className="panel-title"><Headphones size={18} /><span>Gear Profile</span></div>
              <div className="calibration-grid">
                <label className="field">
                  <span>Tester name</span>
                  <input value={profile.handle} onChange={(event) => updateProfile('handle', event.target.value)} placeholder="optional" />
                </label>
                <label className="field">
                  <span>Main game focus</span>
                  <select value={profile.gameFocus} onChange={(event) => updateProfile('gameFocus', event.target.value)}>
                    {gameProfiles.map((item) => <option key={item.game}>{item.game}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Output chain</span>
                  <select value={profile.outputType} onChange={(event) => updateProfile('outputType', event.target.value)}>
                    <option>IEM / headphones</option>
                    <option>Gaming headset</option>
                    <option>DAC / amp output</option>
                    <option>Speakers for testing</option>
                  </select>
                </label>
                <label className="field">
                  <span>Mic chain</span>
                  <input value={profile.micType} onChange={(event) => updateProfile('micType', event.target.value)} />
                </label>
              </div>
              <div className="setup-toggle-row">
                {Object.entries({ equalizerApo: 'Equalizer APO', sonar: 'Sonar/mixer', discord: 'Discord comms' }).map(([key, label]) => (
                  <label key={key}>
                    <input type="checkbox" checked={profile.tools[key]} onChange={(event) => updateTool(key, event.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="panel-title"><Search size={18} /><span>Device Detection</span></div>
              <p>Mic permission unlocks real device names in the browser. The Windows bridge stays optional and explicit.</p>
              <div className="metric-row selftest-summary">
                <Metric label="Mic" value={micStatus} tone={micStatus === 'granted' ? 'teal' : 'amber'} />
                <Metric label="Devices" value={String(deviceCount)} tone={deviceCount ? 'teal' : 'amber'} />
                <Metric label="Bridge" value={bridgeFound ? 'loaded' : 'optional'} tone={bridgeFound ? 'teal' : 'amber'} />
              </div>
              <div className={`data-card permission-recovery recovery-${setupRecovery.level}`}>
                <strong>{setupRecovery.title}</strong>
                <span>{setupRecovery.detail}</span>
                <small>{formatPermissionRecoverySteps(setupRecovery)}</small>
              </div>
              <div className="live-actions">
                <button className="primary" onClick={requestMic}><Mic size={18} /> Grant mic access</button>
                <button className="ghost" onClick={scanSetup}><Search size={18} /> Scan devices</button>
              </div>
              <p className="callout">{scanStatus}</p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="panel-title"><SlidersHorizontal size={18} /><span>Calibration Direction</span></div>
              <p>Set the first target. CueForge can refine this later with Mic Lab, Hearing Model, Blind Match, and real match notes.</p>
              <div className="calibration-grid">
                <Slider label="Footstep focus" value={profile.footstepFocus} onChange={(value) => updateProfile('footstepFocus', value)} />
                <Slider label="Comms priority" value={profile.commsFocus} onChange={(value) => updateProfile('commsFocus', value)} />
                <Slider label="Bass control" value={profile.bassControl} onChange={(value) => updateProfile('bassControl', value)} />
                <Slider label="Fatigue control" value={profile.fatigueControl} onChange={(value) => updateProfile('fatigueControl', value)} />
              </div>
              <div className="live-actions">
                <button className="primary" onClick={playSetupPulse}><Play size={18} /> Play calibration pulse</button>
              </div>
              <p className="callout">{toneStatus}</p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="panel-title"><ShieldCheck size={18} /><span>Ready To Launch CueForge</span></div>
              <div className="setup-review">
                <div><strong>{profile.gameFocus}</strong><span>{profile.outputType}</span></div>
                <div><strong>{profile.micType}</strong><span>Mic: {micStatus}</span></div>
                <div><strong>{deviceCount} devices</strong><span>{bridgeFound ? 'Windows bridge loaded' : 'Browser scan only'}</span></div>
              </div>
              <div className="data-card setup-summary-card">
                <strong>Setup summary</strong>
                <span>{setupSummary.join(' / ')}</span>
                <small>{setupRecovery.primaryAction}</small>
              </div>
              <p className="callout">After this, CueForge opens the main app without a setup tab in the sidebar. Rerun the bamboo soundwalk later from System Info.</p>
            </>
          )}

          <div className="setup-nav-actions">
            <button className="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</button>
            {step < setupSteps.length - 1 ? (
              <button className="primary" onClick={() => setStep(step + 1)}>Continue</button>
            ) : (
              <button className="primary" onClick={finish}><CheckCircle2 size={18} /> Enter app</button>
            )}
            <button className="ghost" onClick={onSkip}>Skip for now</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SetupThreeScene({ step }) {
  const canvasRef = useRef(null);
  const stepRef = useRef(step);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    let renderer;
    let scene;
    let camera;
    let world;
    let panda;
    let reflection;
    let pond;
    let rippleGroup;
    let bambooGroup;
    let ferroGroup;
    let fireflies;
    let animationFrame = 0;
    let resizeObserver;
    let disposed = false;
    const pointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointer.y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    const start = async () => {
      const THREE = await import('three');
      if (disposed || !canvasRef.current) return;

      const matteGreen = new THREE.MeshStandardMaterial({ color: 0x214b2f, roughness: 0.82 });
      const bambooMaterial = new THREE.MeshStandardMaterial({ color: 0x2f9c5b, roughness: 0.62, metalness: 0.02 });
      const bambooRingMaterial = new THREE.MeshStandardMaterial({ color: 0x16391f, roughness: 0.7 });
      const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x5fbd66, roughness: 0.74, side: THREE.DoubleSide });
      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x1a261d, roughness: 0.88 });
      const whiteFur = new THREE.MeshStandardMaterial({ color: 0xf1eee3, roughness: 0.68 });
      const blackFur = new THREE.MeshStandardMaterial({ color: 0x070807, roughness: 0.48, metalness: 0.08 });
      const ferroMaterial = new THREE.MeshStandardMaterial({
        color: 0x050606,
        emissive: 0x06221d,
        metalness: 0.72,
        roughness: 0.2
      });
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x0c5e65,
        emissive: 0x021918,
        metalness: 0.14,
        roughness: 0.18,
        transparent: true,
        opacity: 0.62
      });
      const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0x8df7dd, transparent: true, opacity: 0.32 });
      const reflectionWhite = new THREE.MeshStandardMaterial({
        color: 0xbef8e4,
        emissive: 0x063a35,
        roughness: 0.28,
        transparent: true,
        opacity: 0.3
      });
      const reflectionBlack = new THREE.MeshStandardMaterial({
        color: 0x03100f,
        emissive: 0x021918,
        roughness: 0.22,
        transparent: true,
        opacity: 0.36
      });

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x06120d, 0.044);
      camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
      camera.position.set(0, 1.2, 8.4);

      scene.add(new THREE.HemisphereLight(0xbaf3e4, 0x102416, 1.15));
      const moon = new THREE.DirectionalLight(0xd8fff0, 1.8);
      moon.position.set(-2.4, 5.8, 5.2);
      scene.add(moon);
      const pondGlow = new THREE.PointLight(0x20c9a9, 2.2, 12);
      pondGlow.position.set(0, -0.3, -4.2);
      scene.add(pondGlow);

      world = new THREE.Group();
      scene.add(world);

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), matteGreen);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -1.34, -3.5);
      world.add(ground);

      const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 12), pathMaterial);
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, -1.325, 0.3);
      path.scale.x = 0.72;
      world.add(path);

      pond = new THREE.Mesh(new THREE.CircleGeometry(2.35, 96), waterMaterial);
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(0, -1.27, -4.2);
      world.add(pond);

      rippleGroup = new THREE.Group();
      [0.7, 1.15, 1.65, 2.05].forEach((radius, index) => {
        const ripple = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 8, 128), rippleMaterial.clone());
        ripple.rotation.x = Math.PI / 2;
        ripple.position.set(0, -1.245, -4.2);
        ripple.userData = { baseRadius: radius, offset: index * 0.7 };
        rippleGroup.add(ripple);
      });
      world.add(rippleGroup);

      bambooGroup = new THREE.Group();
      for (let index = 0; index < 42; index += 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const row = Math.floor(index / 2);
        const x = side * (2.0 + (row % 5) * 0.64 + Math.sin(row * 1.37) * 0.22);
        const z = 3.1 - row * 0.48 + Math.cos(row * 0.73) * 0.24;
        const height = 4.9 + (row % 6) * 0.32;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, height, 12), bambooMaterial);
        stalk.position.set(x, -1.3 + height / 2, z);
        stalk.rotation.z = side * (0.035 + Math.sin(row) * 0.018);
        stalk.userData = { seed: row * 0.37, side };
        bambooGroup.add(stalk);

        for (let node = 0; node < 5; node += 1) {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.026, 12), bambooRingMaterial);
          ring.position.set(x, -0.55 + node * (height / 6), z);
          ring.rotation.z = stalk.rotation.z;
          bambooGroup.add(ring);
        }

        for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 4), leafMaterial);
          leaf.position.set(
            x + side * (0.22 + leafIndex * 0.18),
            -1.3 + height * (0.72 + leafIndex * 0.06),
            z + Math.sin(leafIndex + row) * 0.22
          );
          leaf.rotation.set(0.8 + leafIndex * 0.18, 0, side * (1.2 + leafIndex * 0.35));
          leaf.userData = { seed: row + leafIndex * 0.8, side };
          bambooGroup.add(leaf);
        }
      }
      world.add(bambooGroup);

      const createPanda = ({ reflected = false } = {}) => {
        const group = new THREE.Group();
        const white = reflected ? reflectionWhite : whiteFur;
        const black = reflected ? reflectionBlack : blackFur;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), white);
        body.scale.set(0.85, 1.05, 0.72);
        body.position.y = -0.56;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20), white);
        head.position.y = -0.05;
        group.add(head);

        [['leftEar', -0.24], ['rightEar', 0.24]].forEach(([name, x]) => {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), black);
          ear.position.set(x, 0.22, -0.02);
          ear.userData = { name };
          group.add(ear);
        });

        [['leftEye', -0.12], ['rightEye', 0.12]].forEach(([name, x]) => {
          const patch = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 12), black);
          patch.scale.set(1.05, 0.68, 0.34);
          patch.position.set(x, -0.03, 0.27);
          patch.userData = { name };
          group.add(patch);
        });

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), black);
        nose.scale.set(1.15, 0.7, 0.52);
        nose.position.set(0, -0.11, 0.31);
        group.add(nose);

        [['leftArm', -0.36], ['rightArm', 0.36]].forEach(([name, x]) => {
          const limb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), black);
          limb.scale.set(0.58, 1.3, 0.55);
          limb.position.set(x, -0.5, 0.03);
          limb.userData = { name };
          group.add(limb);
        });

        if (reflected) {
          [['leftBatEar', -0.25], ['rightBatEar', 0.25]].forEach(([name, x]) => {
            const batEar = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 3), black);
            batEar.position.set(x, 0.48, 0.02);
            batEar.rotation.z = x < 0 ? 0.28 : -0.28;
            batEar.userData = { name };
            group.add(batEar);
          });
        }

        return group;
      };

      panda = createPanda();
      panda.position.set(0, -0.24, 1.05);
      panda.rotation.y = Math.PI;
      world.add(panda);

      reflection = createPanda({ reflected: true });
      reflection.position.set(0, -1.13, -4.12);
      reflection.scale.set(0.88, 0.12, 0.88);
      reflection.rotation.x = Math.PI;
      reflection.userData = { materials: [reflectionWhite, reflectionBlack] };
      world.add(reflection);

      ferroGroup = new THREE.Group();
      for (let index = 0; index < 74; index += 1) {
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(0.035 + (index % 5) * 0.009, 14, 10),
          ferroMaterial
        );
        drop.userData = {
          angle: index * 0.54,
          radius: 0.45 + (index % 9) * 0.055,
          lane: index % 3
        };
        ferroGroup.add(drop);
      }
      world.add(ferroGroup);

      const fireflyGeometry = new THREE.BufferGeometry();
      const fireflyPositions = new Float32Array(360 * 3);
      for (let index = 0; index < 360; index += 1) {
        const lane = index % 2 === 0 ? -1 : 1;
        fireflyPositions[index * 3] = lane * (1.4 + (index % 19) * 0.24);
        fireflyPositions[index * 3 + 1] = -0.1 + (index % 23) * 0.15;
        fireflyPositions[index * 3 + 2] = 3.6 - (index % 41) * 0.22;
      }
      fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
      fireflies = new THREE.Points(
        fireflyGeometry,
        new THREE.PointsMaterial({ color: 0xf6d46c, size: 0.032, transparent: true, opacity: 0.72 })
      );
      world.add(fireflies);

      const resize = () => {
        const rect = canvasRef.current.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvasRef.current);
      resize();
      window.addEventListener('pointermove', onPointerMove, { passive: true });

      const animate = () => {
        const activeStep = stepRef.current;
        const now = performance.now() * 0.001;
        const progress = activeStep / 3;
        const cameraTargetZ = 8.2 - progress * 2.15;
        const cameraTargetY = 1.28 + progress * 0.28;
        const lookTarget = new THREE.Vector3(0, -0.45 + progress * 0.18, -1.0 - progress * 2.25);
        camera.position.x += ((reducedMotion ? 0 : pointer.x * 0.36) - camera.position.x) * 0.035;
        camera.position.y += ((reducedMotion ? cameraTargetY : cameraTargetY + pointer.y * -0.18) - camera.position.y) * 0.035;
        camera.position.z += (cameraTargetZ - camera.position.z) * 0.035;
        camera.lookAt(lookTarget);

        panda.position.z += ((1.05 - progress * 3.55) - panda.position.z) * 0.04;
        panda.position.y = -0.24 + Math.sin(now * 4.6) * (reducedMotion ? 0.006 : 0.028);
        panda.rotation.y = Math.PI + Math.sin(now * 1.3) * 0.06;

        reflection.userData.materials.forEach((material) => {
          material.opacity += ((activeStep >= 2 ? 0.48 : 0.16) - material.opacity) * 0.04;
        });
        reflection.position.y = -1.13 + Math.sin(now * 1.4) * 0.012;
        reflection.rotation.z = Math.sin(now * 0.9) * 0.025;

        pond.rotation.z += reducedMotion ? 0.0002 : 0.0011;
        rippleGroup.children.forEach((ripple, index) => {
          const scale = 1 + Math.sin(now * 1.2 + ripple.userData.offset) * 0.055 + activeStep * 0.02;
          ripple.scale.setScalar(scale);
          ripple.material.opacity = 0.18 + Math.sin(now * 1.6 + index) * 0.08 + activeStep * 0.03;
        });

        bambooGroup.children.forEach((item) => {
          const seed = item.userData.seed || 0;
          const side = item.userData.side || 1;
          item.rotation.z += Math.sin(now * 0.85 + seed) * side * (reducedMotion ? 0.000005 : 0.000035);
        });

        ferroGroup.children.forEach((drop, index) => {
          const data = drop.userData;
          const audioPulse = 1 + Math.sin(now * 3.2 + index) * (reducedMotion ? 0.04 : 0.18);
          const orbit = data.angle + now * (0.8 + activeStep * 0.18);
          const laneZ = activeStep < 2 ? 0.5 - data.lane * 0.75 - progress * 2.1 : -4.05;
          const orbitRadius = data.radius + activeStep * 0.08;
          drop.position.set(
            Math.cos(orbit) * orbitRadius,
            -0.86 + Math.sin(orbit * 1.7) * 0.34,
            laneZ + Math.sin(orbit) * (activeStep < 2 ? 0.34 : 0.24)
          );
          drop.scale.setScalar(audioPulse);
        });
        ferroGroup.rotation.y += reducedMotion ? 0.0005 : 0.002 + activeStep * 0.0004;

        const positions = fireflies.geometry.attributes.position.array;
        for (let index = 0; index < positions.length; index += 3) {
          positions[index + 1] += Math.sin(now + index) * 0.0008;
          positions[index + 2] += reducedMotion ? 0.0006 : 0.0022;
          if (positions[index + 2] > 4.2) positions[index + 2] = -5.6;
        }
        fireflies.geometry.attributes.position.needsUpdate = true;
        fireflies.rotation.y = Math.sin(now * 0.28) * 0.05;

        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(animate);
      };

      animate();
    };

    start();

    return () => {
      disposed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      world?.traverse((item) => {
        item?.geometry?.dispose?.();
        if (Array.isArray(item?.material)) {
          item.material.forEach((material) => material.dispose?.());
        } else {
          item?.material?.dispose?.();
        }
      });
      renderer?.dispose?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="setup-3d-canvas" aria-label="CueForge bamboo setup scene" />;
}

function PersonalHearingModel() {
  const [ear, setEar] = useState('left');
  const [step, setStep] = useState(0);
  const [levelDb, setLevelDb] = useState(-30);
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem('cueforge-hearing-results');
      return saved ? normalizeHearingResults(JSON.parse(saved)) : createEmptyHearingResults();
    } catch {
      return createEmptyHearingResults();
    }
  });
  const [status, setStatus] = useState('Start quiet. Keep Windows volume low. Play the tone, then mark what it felt like.');

  const frequency = hearingFrequencies[step];
  const compensation = calculateCompensation(results);
  const score = hearingScore(results);
  const apoOverlay = buildHearingApoOverlay(compensation);
  const currentThreshold = normalizeHearingResults(results)[ear][frequency];
  const responseLabel = {
    not_heard: 'Not heard',
    barely_heard: 'Barely heard',
    clear: 'Clear',
    too_sharp: 'Too sharp'
  };

  const advanceStep = () => {
    if (step < hearingFrequencies.length - 1) {
      setStep(step + 1);
      return;
    }

    if (ear === 'left') {
      setEar('right');
      setStep(0);
    }
  };

  const playHearingTone = async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    panner.pan.value = ear === 'left' ? -1 : 1;
    const safeGain = clamp(Math.pow(10, levelDb / 20) * 0.32, 0.001, 0.18);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(safeGain, context.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.9);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.95);
    setStatus(`${ear === 'left' ? 'Left' : 'Right'} ear ${frequency}Hz tone played at ${levelDb} dB. Keep it comfortable.`);
  };

  const markTone = (response) => {
    const normalized = normalizeHearingResults(results);
    const updatedEntry = updateThresholdEntry(normalized[ear][frequency], response, levelDb);
    const next = {
      ...normalized,
      [ear]: {
        ...normalized[ear],
        [frequency]: updatedEntry
      }
    };
    const nextLevel = nextHearingLevel(response, levelDb);
    setResults(next);
    setLevelDb(nextLevel);
    safeSetJson('cueforge-hearing-results', next);

    if (response === 'clear' || response === 'too_sharp') {
      advanceStep();
    }
    setStatus(`${responseLabel[response]} saved. Next tone level is ${nextLevel} dB.`);
  };

  const reset = () => {
    const empty = createEmptyHearingResults();
    setResults(empty);
    localStorage.removeItem('cueforge-hearing-results');
    setEar('left');
    setStep(0);
    setLevelDb(-30);
    setStatus('Hearing model reset. Start with left ear at 125Hz and keep volume low.');
  };

  const downloadProfile = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      method: 'Manual pure-tone audibility check, not a medical test',
      score,
      results,
      compensation,
      equalizerApoOverlay: apoOverlay,
      safety: {
        ...safetyRules,
        highBandRule: '6k-12k boosts are clamped and may become cuts if harshness is reported.',
        preampRule: 'Negative preamp is added whenever any boost exists.'
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cueforge-personal-hearing-profile.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Panel className="wide" title="Personal Hearing Model" icon={Headphones}>
      <p>This is a guided IEM/headphone threshold check. Keep volume low, mark when each tone becomes audible, comfortable, or sharp, then CueForge builds a gentle overlay. It is not a medical hearing test.</p>
      <p className="callout">{playerSafetyWarnings[0]} Hearing boosts are capped at +{safetyRules.maxHearingBoostDb} dB, treble boosts are capped at +{safetyRules.maxTrebleBoostDb} dB, and any boost adds negative preamp.</p>
      <p className="callout">{playerSafetyWarnings[1]}</p>
      <div className="hearing-status">
        <Metric label="Progress" value={`${score.answered}/${score.total}`} tone={score.complete ? 'teal' : 'amber'} />
        <Metric label="Comfort mapped" value={`${score.percentComfortable}%`} tone="teal" />
        <Metric label="Confidence" value={`${score.confidence}%`} tone={score.confidence >= 70 ? 'teal' : 'amber'} />
      </div>
      <div className="hearing-controls">
        <div className="source-tabs">
          <button className={ear === 'left' ? 'selected' : ''} onClick={() => setEar('left')}>Left ear</button>
          <button className={ear === 'right' ? 'selected' : ''} onClick={() => setEar('right')}>Right ear</button>
        </div>
        <label className="field">
          <span>Test frequency</span>
          <select value={step} onChange={(event) => setStep(Number(event.target.value))}>
            {hearingFrequencies.map((item, index) => <option value={index} key={item}>{item} Hz</option>)}
          </select>
        </label>
        <label className="field">
          <span>Tone level: {levelDb} dB</span>
          <input type="range" min="-42" max="-6" value={levelDb} onChange={(event) => setLevelDb(Number(event.target.value))} />
        </label>
      </div>
      <div className="threshold-card">
        <strong>{ear === 'left' ? 'Left' : 'Right'} ear / {frequency} Hz</strong>
        <span>Audible {currentThreshold.audibleAtDb ?? '--'} dB</span>
        <span>Comfort {currentThreshold.comfortableAtDb ?? '--'} dB</span>
        <span>Sharp {currentThreshold.harshAtDb ?? '--'} dB</span>
      </div>
      <div className="live-actions">
        <button className="primary" onClick={playHearingTone}><Play size={18} /> Play {frequency}Hz</button>
        <button className="ghost" onClick={() => markTone('not_heard')}>Not heard</button>
        <button className="ghost" onClick={() => markTone('barely_heard')}>Barely heard</button>
        <button className="ghost" onClick={() => markTone('clear')}>Clear</button>
        <button className="ghost" onClick={() => markTone('too_sharp')}>Too sharp</button>
        <button className="ghost" onClick={reset}>Reset</button>
      </div>
      <p className="callout">{status}</p>
      <div className="hearing-curve">
        {compensation.map((point) => (
          <span
            key={point.frequency}
            title={`${point.frequency}Hz ${point.averageDb}dB`}
            style={{ height: `${clamp(20 + Math.abs(point.averageDb) * 18, 8, 100)}%` }}
          />
        ))}
      </div>
      <div className="grid two compact-grid">
        <div>
          <h2>Compensation Overlay</h2>
          <pre>{apoOverlay}</pre>
        </div>
        <div>
          <h2>Per-Frequency Model</h2>
          <ul className="clean-list">
            {compensation.map((point) => (
              <li key={point.frequency}>{point.frequency}Hz - L {point.leftDb.toFixed(1)}dB / R {point.rightDb.toFixed(1)}dB / cap +{point.maxBoostDb.toFixed(1)}dB</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="data-card replay-export-status">
        <strong>Replay-safe export status</strong>
        <span>{score.answered ? 'Ready to export threshold bands, confidence, safety caps, and APO overlay.' : 'Run at least one tone response before exporting a useful hearing profile.'}</span>
        <small>This is not medical data. Exports avoid raw device IDs and keep boosts clamped for comfort.</small>
      </div>
      <button className="primary" onClick={downloadProfile}><Download size={18} /> Export hearing profile</button>
    </Panel>
  );
}

function Panel({ title, icon: Icon, children, className = '' }) {
  return (
    <article className={`panel ${className}`}>
      <div className="panel-title"><Icon size={18} /><span>{title}</span></div>
      {children}
    </article>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HunterRewardsPanel({ className = '' }) {
  return (
    <Panel className={className} title="Hunter Rewards" icon={ShieldCheck}>
      <p>Alpha and beta rewards are proof-based. A reward tier is claimed with a proof code, useful report, replay, or verified retest; spam, fake activity, and private data earn zero points.</p>
      <div className="metric-row selftest-summary">
        <Metric label="Reward mode" value="Proof" tone="teal" />
        <Metric label="Spam points" value="0" tone="red" />
        <Metric label="Claim needs" value="Proof code" tone="amber" />
      </div>
      <div className="module-list">
        {hunterRewardTiers.map((reward) => (
          <div className="module-row" key={reward.tier}>
            <CheckCircle2 size={17} />
            <div>
              <strong>{reward.tier}</strong>
              <span>{reward.claim}</span>
            </div>
            <em>{reward.points}</em>
          </div>
        ))}
      </div>
      <p className="callout">Best finds are the gritty ones: hard repro steps, setup weirdness, audio evidence, and a retest after the fix.</p>
    </Panel>
  );
}

function ShareProfilePanel({
  className = '',
  appInviteText,
  shareProfileText,
  shareProfilePayload,
  onImportProfile
}) {
  const [status, setStatus] = useState('Copy the app invite or your current audio profile. Nothing uploads.');
  const [importText, setImportText] = useState('');

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard?.writeText(text);
      setStatus(`${label} copied.`);
    } catch {
      setStatus(`${label} is ready below. Select and copy manually if the browser blocks clipboard.`);
    }
  };

  const downloadProfile = () => {
    downloadTextFile('cueforge-shared-audio-profile.json', JSON.stringify(shareProfilePayload, null, 2));
    setStatus('Audio profile downloaded as JSON.');
  };

  const importProfile = () => {
    try {
      const profile = parseAudioProfileShare(importText);
      onImportProfile?.(profile);
      setStatus(`Imported ${profile.sourceProfileName || 'shared CueForge profile'}. Review before exporting.`);
      setImportText('');
    } catch (error) {
      setStatus(error.message || 'Could not read that shared profile.');
    }
  };

  return (
    <Panel className={className} title="Share CueForge" icon={Copy}>
      <p>Send friends the app or your current sound profile. Shared profiles are plain JSON, local, and safe to review before applying.</p>
      <div className="live-actions">
        <button className="primary" onClick={() => copyText(appInviteText, 'App invite')}><Copy size={18} /> Copy invite</button>
        <button className="ghost" onClick={() => copyText(shareProfileText, 'Audio profile')}><Copy size={18} /> Copy profile</button>
        <button className="ghost" onClick={downloadProfile}><Download size={18} /> Download profile</button>
      </div>
      <div className="data-card">
        <strong>{shareProfilePayload.sourceProfileName}</strong>
        <span>{shareProfilePayload.game || 'No game selected'} / {shareProfilePayload.eq.length} EQ bands</span>
        <small>{shareProfilePayload.note}</small>
      </div>
      <label className="field">
        <span>Paste a friend profile</span>
        <textarea aria-label="Paste a friend profile" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste CueForge audio profile JSON here." />
      </label>
      <div className="live-actions">
        <button className="ghost" onClick={importProfile}><SlidersHorizontal size={18} /> Import profile</button>
      </div>
      <p className="callout">{status}</p>
    </Panel>
  );
}

function SimpleHome({
  analysis,
  selectedGame,
  selectedSourceProfile,
  appInviteText,
  shareProfileText,
  shareProfilePayload,
  cueforgeState,
  commandCenterContext,
  onOpen,
  onAutoTune,
  onExportSetup,
  onExportReleasePack,
  onApplyProfileBrain,
  onImportProfile
}) {
  const sourceName = localSourceProfiles[selectedSourceProfile]?.name || 'FPS starter profile';
  const micStatus = analysis.clipping > 15
    ? 'Lower mic gain first'
    : analysis.noise > 48
      ? 'Clean up room noise'
      : 'Mic looks usable';
  const nextMove = analysis.clipping > 15
    ? 'Run Mic Check before playing.'
    : 'Run Auto Setup, then use Auto Tune.';

  return (
    <section className="grid simple-home">
      <SetupCommandCenter
        state={cueforgeState}
        context={commandCenterContext}
        compact
        onOpen={onOpen}
        onApplyProfile={onApplyProfileBrain}
        onExportPack={onExportReleasePack}
      />

      <Panel className="wide simple-start-panel" title="Start Here" icon={Gauge}>
        <div className="simple-hero">
          <div>
            <h2>One clean path. No lab clutter.</h2>
            <p>CueForge can handle the messy audio chain in the background. You only need to walk through setup, mic check, tune, and one real match.</p>
          </div>
          <div className="simple-next">
            <span>Next best move</span>
            <strong>{nextMove}</strong>
          </div>
        </div>
        <div className="simple-step-grid">
          <button className="simple-step" onClick={() => onOpen('detect')}>
            <Search size={22} />
            <strong>1. Auto setup</strong>
            <span>Detect or import your gear and audio chain.</span>
          </button>
          <button className="simple-step" onClick={() => onOpen('mic')}>
            <Mic size={22} />
            <strong>2. Mic check</strong>
            <span>Make sure Discord and teammates can hear you clearly.</span>
          </button>
          <button className="simple-step" onClick={onAutoTune}>
            <Sparkles size={22} />
            <strong>3. Auto tune</strong>
            <span>Apply a safe FPS starting curve without touching drivers.</span>
          </button>
          <button className="simple-step" onClick={() => onOpen('trial')}>
            <Gamepad2 size={22} />
            <strong>4. Play test</strong>
            <span>Run one real match and score what changed.</span>
          </button>
        </div>
      </Panel>

      <Panel title="What CueForge Knows" icon={ShieldCheck}>
        <div className="simple-status-list">
          <div>
            <span>Game focus</span>
            <strong>{selectedGame}</strong>
          </div>
          <div>
            <span>Sound target</span>
            <strong>{sourceName}</strong>
          </div>
          <div>
            <span>Mic status</span>
            <strong>{micStatus}</strong>
          </div>
        </div>
        <p className="callout">Simple Mode hides raw graphs, research panels, and developer tools. Expert Mode brings them back when you want the full bench.</p>
      </Panel>

      <ShareProfilePanel
        appInviteText={appInviteText}
        shareProfileText={shareProfileText}
        shareProfilePayload={shareProfilePayload}
        onImportProfile={onImportProfile}
      />

      <Panel title="When Something Feels Wrong" icon={Bug}>
        <h2>Tell CueForge what happened.</h2>
        <p>No perfect wording needed. Report the issue, import it later, and replay the exact state instead of guessing.</p>
        <div className="live-actions">
          <button className="primary" onClick={() => onOpen('reports')}><Bug size={18} /> Report issue</button>
          <button className="ghost" onClick={onExportSetup}><Download size={18} /> Export setup</button>
        </div>
      </Panel>
    </section>
  );
}

function SimpleTunePage({
  eq,
  selectedSourceProfile,
  appInviteText,
  shareProfileText,
  shareProfilePayload,
  onAutoTune,
  onSaveConfig,
  onOpenExpert,
  onOpenSoundMatch,
  onImportProfile
}) {
  const sourceName = localSourceProfiles[selectedSourceProfile]?.name || 'FPS starter profile';
  const lowControl = Math.round(72 - Math.max(0, eq[0] + eq[1] + eq[2]) * 3);
  const cueFocus = Math.round(70 + Math.max(0, eq[6] + eq[7]) * 5);
  const comfort = Math.round(78 - Math.max(0, eq[8] + eq[9]) * 4);

  return (
    <section className="grid simple-home">
      <Panel className="wide simple-start-panel" title="Simple Tune" icon={Sparkles}>
        <div className="simple-hero">
          <div>
            <h2>Safe tune first. Sliders only if you ask.</h2>
            <p>CueForge keeps the complicated EQ math behind the scenes. Start with an automatic FPS curve, save it, then judge it in one match.</p>
          </div>
          <div className="simple-next">
            <span>Current target</span>
            <strong>{sourceName}</strong>
          </div>
        </div>
        <div className="simple-step-grid">
          <button className="simple-step" onClick={onAutoTune}>
            <Sparkles size={22} />
            <strong>Auto tune now</strong>
            <span>Build a safer competitive curve from the current setup target.</span>
          </button>
          <button className="simple-step" onClick={onSaveConfig}>
            <Download size={22} />
            <strong>Save APO config</strong>
            <span>Export text you can review before pasting into Equalizer APO or Peace.</span>
          </button>
          <button className="simple-step" onClick={onOpenExpert}>
            <SlidersHorizontal size={22} />
            <strong>Open expert EQ</strong>
            <span>Show the 10-band sliders and raw APO text when you want manual control.</span>
          </button>
          <button className="simple-step" onClick={onOpenSoundMatch}>
            <Radio size={22} />
            <strong>This-or-that test</strong>
            <span>Play hidden sound rounds and let your ears pick the curve.</span>
          </button>
        </div>
      </Panel>

      <Panel title="Plain Results" icon={ShieldCheck}>
        <div className="metric-row">
          <Metric label="Bass control" value={`${clamp(lowControl, 0, 100)}%`} tone="teal" />
          <Metric label="Cue focus" value={`${clamp(cueFocus, 0, 100)}%`} tone="teal" />
          <Metric label="Comfort" value={`${clamp(comfort, 0, 100)}%`} tone="amber" />
        </div>
        <p className="callout">Play one match before changing more. If footsteps, comms, or fatigue get worse, use Fix Issue instead of guessing.</p>
      </Panel>

      <Panel title="No Silent Changes" icon={ShieldCheck}>
        <p>CueForge does not rewrite drivers or Windows routing in Simple Mode. It generates readable settings and keeps apply steps explicit.</p>
      </Panel>

      <Panel title="Spatial Honesty" icon={Headphones}>
        <p>{spatialTruthWarning}</p>
        <div className="data-card">
          <strong>Default mode</strong>
          <span>Safe Stereo for competitive clarity. No fake surround, no magic wall reads.</span>
        </div>
      </Panel>

      <ShareProfilePanel
        className="wide"
        appInviteText={appInviteText}
        shareProfileText={shareProfileText}
        shareProfilePayload={shareProfilePayload}
        onImportProfile={onImportProfile}
      />
    </section>
  );
}

function PlayerTrialPage({ eq, selectedGame, selectedSourceProfile }) {
  const [stepDone, setStepDone] = useState(() => Object.fromEntries(trialSteps.map((step) => [step.id, false])));
  const [feedback, setFeedback] = useState(feedbackDefaults);
  const [status, setStatus] = useState('Run the steps in order, then export the tester packet.');
  const completed = Object.values(stepDone).filter(Boolean).length;
  const score = scoreTrialFeedback(feedback);

  const setFeedbackValue = (key, value) => {
    setFeedback((current) => ({ ...current, [key]: Number(value) }));
  };

  const exportTrial = () => {
    const issueReport = getSavedJson('cueforge-last-issue-report');
    const selfTests = getSavedJson('cueforge-self-test-results') || [];
    const readiness = computeSetupReadiness({
      audioApi: Boolean(window.AudioContext && navigator.mediaDevices?.enumerateDevices),
      micPermission: 'unknown',
      deviceCount: issueReport?.diagnostics?.browserDevices?.length || 0,
      bridgeLoaded: Boolean(issueReport?.diagnostics?.bridgeReport),
      apoFound: Boolean(issueReport?.diagnostics?.bridgeReport?.tools?.equalizerApo?.installed),
      selfTests,
      reportReady: Boolean(issueReport),
      hearingAnswered: issueReport?.reproducibleState?.hearing?.score?.answered || 0
    });
    const packet = buildTesterPacket({
      feedback,
      readiness,
      issueReport,
      eq,
      game: selectedGame,
      sourceProfile: selectedSourceProfile
    });
    safeSetJson('cueforge-last-player-trial', packet);
    downloadTextFile('cueforge-player-trial.json', JSON.stringify(packet, null, 2));
    setStatus(`Tester packet exported. Result: ${packet.feedback.status}, ${packet.feedback.score}/100.`);
  };

  return (
    <section className="grid two">
      <Panel title="Guided Match Script" icon={Gamepad2}>
        <p>Use the same script for every player so feedback is comparable.</p>
        <div className="trial-steps">
          {trialSteps.map((step, index) => (
            <label className={`trial-step ${stepDone[step.id] ? 'done' : ''}`} key={step.id}>
              <input
                type="checkbox"
                checked={stepDone[step.id]}
                onChange={(event) => setStepDone((current) => ({ ...current, [step.id]: event.target.checked }))}
              />
              <div>
                <strong>{index + 1}. {step.title}</strong>
                <span>{step.detail}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="Steps done" value={`${completed}/${trialSteps.length}`} tone={completed === trialSteps.length ? 'teal' : 'amber'} />
          <Metric label="Feedback score" value={`${score.score}`} tone={score.status === 'needs-tuning' ? 'red' : 'teal'} />
          <Metric label="Status" value={score.status === 'release-candidate' ? 'RC' : score.status === 'testable' ? 'Test' : 'Tune'} tone={score.status === 'needs-tuning' ? 'amber' : 'teal'} />
        </div>
      </Panel>
      <Panel title="Post-Match Feedback" icon={Radio}>
        <div className="calibration-grid">
          <TrialSlider label="Footsteps" value={feedback.footsteps} onChange={(value) => setFeedbackValue('footsteps', value)} />
          <TrialSlider label="Direction" value={feedback.direction} onChange={(value) => setFeedbackValue('direction', value)} />
          <TrialSlider label="Comms" value={feedback.comms} onChange={(value) => setFeedbackValue('comms', value)} />
          <TrialSlider label="Mic" value={feedback.mic} onChange={(value) => setFeedbackValue('mic', value)} />
          <TrialSlider label="Comfort" value={feedback.fatigue} onChange={(value) => setFeedbackValue('fatigue', value)} />
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea aria-label="Notes" value={feedback.notes} onChange={(event) => setFeedback((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        <div className="live-actions">
          <button className="primary" onClick={exportTrial}><Download size={18} /> Export tester packet</button>
        </div>
        <p className="callout">{status}</p>
      </Panel>
      <Panel className="wide" title="Next Fixes" icon={Sparkles}>
        <ul className="clean-list">
          {score.issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      </Panel>
    </section>
  );
}

function TrialSlider({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}: {value}/10</span>
      <input type="range" min="1" max="10" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function GameplaySavePage({ eq, selectedGame, selectedSourceProfile }) {
  const [settings, setSettings] = useState(() => normalizeGameplaySaveSettings(getSavedJson('cueforge-gameplay-save-settings') || gameplaySaveDefaults));
  const [snapshots, setSnapshots] = useState(() => getSavedJson('cueforge-gameplay-snapshots') || []);
  const [lastSavedAt, setLastSavedAt] = useState(0);
  const [status, setStatus] = useState('Gameplay save is ready.');
  const summary = summarizeBetaActivity(getSavedJson('cueforge-beta-checkins') || []);

  const persistSettings = (next) => {
    const normalized = normalizeGameplaySaveSettings(next);
    setSettings(normalized);
    safeSetJson('cueforge-gameplay-save-settings', normalized);
    localStorage.setItem('cueforge-gameplay-performance-mode', normalized.performanceMode ? 'on' : 'off');
    setStatus('Gameplay save settings updated.');
  };

  const saveSnapshot = (source = 'manual') => {
    const snapshot = createGameplaySnapshot({
      eq,
      selectedGame,
      selectedSourceProfile,
      betaSummary: summary
    });
    const next = appendGameplaySnapshot(snapshots, { ...snapshot, source }, settings.maxSnapshots);
    setSnapshots(next);
    safeSetJson('cueforge-gameplay-snapshots', next);
    setLastSavedAt(Date.now());
    setStatus(`${source === 'auto' ? 'Auto-saved' : 'Saved'} gameplay settings at ${new Date(snapshot.savedAt).toLocaleTimeString()}.`);
  };

  useEffect(() => {
    if (!settings.enabled) return undefined;
    const interval = setInterval(() => {
      setLastSavedAt((current) => {
        if (!shouldSaveGameplaySnapshot({ lastSavedAt: current, intervalSeconds: settings.intervalSeconds })) return current;
        const snapshot = createGameplaySnapshot({
          eq,
          selectedGame,
          selectedSourceProfile,
          betaSummary: summary
        });
        setSnapshots((currentSnapshots) => {
          const next = appendGameplaySnapshot(currentSnapshots, { ...snapshot, source: 'auto' }, settings.maxSnapshots);
          safeSetJson('cueforge-gameplay-snapshots', next);
          return next;
        });
        setStatus(`Auto-saved gameplay settings at ${new Date(snapshot.savedAt).toLocaleTimeString()}.`);
        return Date.now();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [eq, selectedGame, selectedSourceProfile, settings, summary.totalCheckIns, summary.uniqueDays]);

  const clearSnapshots = () => {
    setSnapshots([]);
    safeSetJson('cueforge-gameplay-snapshots', []);
    setStatus('Gameplay save history cleared.');
  };

  const exportSnapshots = () => {
    downloadTextFile('cueforge-gameplay-save.json', JSON.stringify({
      schema: 'cueforge.gameplay-save-pack.v1',
      exportedAt: new Date().toISOString(),
      settings,
      snapshots
    }, null, 2));
    setStatus(`Gameplay save pack exported with ${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'}.`);
  };

  return (
    <section className="grid two">
      <Panel title="Gameplay Save" icon={Save}>
        <p>Save useful tuning state during play without hammering storage or running analytics. CueForge writes a tiny local snapshot on a throttle.</p>
        <div className="calibration-grid">
          <label className="field">
            <span>Auto-save</span>
            <select value={settings.enabled ? 'on' : 'off'} onChange={(event) => persistSettings({ ...settings, enabled: event.target.value === 'on' })}>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
          <label className="field">
            <span>Performance mode</span>
            <select value={settings.performanceMode ? 'on' : 'off'} onChange={(event) => persistSettings({ ...settings, performanceMode: event.target.value === 'on' })}>
              <option value="on">On - lighter live meters</option>
              <option value="off">Off - full live meters</option>
            </select>
          </label>
          <label className="field">
            <span>Auto-save interval: {settings.intervalSeconds}s</span>
            <input type="range" min="10" max="300" step="10" value={settings.intervalSeconds} onChange={(event) => persistSettings({ ...settings, intervalSeconds: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>Max snapshots: {settings.maxSnapshots}</span>
            <input type="range" min="3" max="30" value={settings.maxSnapshots} onChange={(event) => persistSettings({ ...settings, maxSnapshots: Number(event.target.value) })} />
          </label>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={() => saveSnapshot('manual')}><Save size={18} /> Save now</button>
          <button className="ghost" onClick={exportSnapshots} disabled={snapshots.length === 0}><Download size={18} /> Export saves</button>
          <button className="ghost" onClick={clearSnapshots}>Clear saves</button>
        </div>
        <p className="callout">{status}</p>
      </Panel>
      <Panel title="Performance Guard" icon={Gauge}>
        <div className="metric-row selftest-summary">
          <Metric label="Snapshots" value={String(snapshots.length)} tone={snapshots.length ? 'teal' : 'amber'} />
          <Metric label="Writes" value={`${settings.intervalSeconds}s`} tone="teal" />
          <Metric label="Meter mode" value={settings.performanceMode ? 'Light' : 'Full'} tone={settings.performanceMode ? 'teal' : 'amber'} />
        </div>
        <ul className="clean-list">
          <li>Saves only small JSON snapshots: EQ, selected game, source profile, and beta summary.</li>
          <li>Auto-save checks every 5 seconds but writes only after your selected interval.</li>
          <li>History is capped, so RAM and local storage stay bounded.</li>
          <li>Performance mode reduces live mic meter update frequency while keeping clip/noise readings usable.</li>
        </ul>
      </Panel>
      <Panel className="wide" title="Recent Saves" icon={Download}>
        <div className="stack">
          {snapshots.length === 0 && <div className="data-card"><strong>No gameplay saves yet</strong><span>Click Save now or leave auto-save on while testing.</span></div>}
          {snapshots.slice(-6).reverse().map((snapshot) => (
            <div className="data-card" key={`${snapshot.savedAt}-${snapshot.source}`}>
              <strong>{new Date(snapshot.savedAt).toLocaleString()} - {snapshot.source}</strong>
              <span>{snapshot.selectedGame || 'No game'} / {snapshot.selectedSourceProfile || 'No source profile'}</span>
              <small>{snapshot.eq.length} EQ bands saved.</small>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function BetaCheckInPage() {
  const [testerId, setTesterId] = useState(() => {
    const saved = localStorage.getItem('cueforge-beta-tester-id');
    if (saved) return saved;
    const next = createTesterId();
    localStorage.setItem('cueforge-beta-tester-id', next);
    return next;
  });
  const [handle, setHandle] = useState(() => localStorage.getItem('cueforge-beta-handle') || 'P4ND4907');
  const [game, setGame] = useState(() => localStorage.getItem('cueforge-beta-game') || 'Tarkov / Siege / COD');
  const [gear, setGear] = useState(() => localStorage.getItem('cueforge-beta-gear') || 'IEM/headset + HyperX-style mic');
  const [notes, setNotes] = useState('');
  const [checkIns, setCheckIns] = useState(() => getSavedJson('cueforge-beta-checkins') || []);
  const [evidence, setEvidence] = useState(() => getSavedJson('cueforge-audio-evidence') || []);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('Record one before-match or after-match check-in to create a local proof trail.');
  const [audioStatus, setAudioStatus] = useState('Audio evidence is off. Record only when a tester explicitly starts it.');
  const [latestClip, setLatestClip] = useState(null);
  const evidenceRef = useRef(null);
  const latestClipRef = useRef(null);
  const summary = summarizeBetaActivity(checkIns);

  useEffect(() => () => {
    const active = evidenceRef.current;
    if (active?.timeout) clearTimeout(active.timeout);
    if (active?.raf) cancelAnimationFrame(active.raf);
    if (active) active.cancelled = true;
    if (active?.recorder?.state && active.recorder.state !== 'inactive') {
      active.recorder.stop();
    }
    active?.stream?.getTracks?.().forEach((track) => track.stop());
    active?.context?.close?.();
    if (latestClipRef.current?.url) URL.revokeObjectURL(latestClipRef.current.url);
  }, []);

  const saveProfileFields = () => {
    localStorage.setItem('cueforge-beta-handle', handle);
    localStorage.setItem('cueforge-beta-game', game);
    localStorage.setItem('cueforge-beta-gear', gear);
  };

  const checkIn = () => {
    saveProfileFields();
    const nextCheckIn = createBetaCheckIn({
      testerId,
      handle,
      game,
      gear,
      source: window.cueforgeDesktop?.isDesktop ? 'desktop-shell' : 'web'
    });
    const next = [...checkIns, nextCheckIn].slice(-40);
    setCheckIns(next);
    safeSetJson('cueforge-beta-checkins', next);
    setStatus(`Check-in recorded for ${nextCheckIn.game || 'the current game'}. Proof code ${nextCheckIn.proof} is ready for export.`);
  };

  const resetTesterId = () => {
    const next = createTesterId();
    setTesterId(next);
    localStorage.setItem('cueforge-beta-tester-id', next);
    setCheckIns([]);
    safeSetJson('cueforge-beta-checkins', []);
    setStatus('Tester ID reset and local beta check-ins cleared for this browser.');
  };

  const exportPacket = () => {
    const packet = buildBetaTesterPacket({ testerId, checkIns, notes, evidence });
    downloadTextFile('cueforge-beta-tester-packet.json', JSON.stringify(packet, null, 2));
    setStatus(`Beta packet exported with ${packet.summary.totalCheckIns} check-in${packet.summary.totalCheckIns === 1 ? '' : 's'} and ${packet.audioEvidence.length} evidence item${packet.audioEvidence.length === 1 ? '' : 's'}.`);
  };

  const startAudioEvidence = async () => {
    if (recording) {
      stopAudioEvidence();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setAudioStatus('This browser cannot record local audio evidence.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const context = createBrowserAudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const mimeType = pickEvidenceMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      const startedAt = performance.now();
      const stats = {
        durationMs: 0,
        frames: 0,
        rmsTotal: 0,
        peak: 0,
        lowBandTotal: 0,
        voiceBandTotal: 0,
        highBandTotal: 0,
        recordedAt: new Date()
      };
      const time = new Uint8Array(analyser.fftSize);
      const freq = new Uint8Array(analyser.frequencyBinCount);

      const stopAll = () => {
        if (recorder.state !== 'inactive') recorder.stop();
      };

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const activeSession = evidenceRef.current;
        stream.getTracks().forEach((track) => track.stop());
        context.close?.();
        if (activeSession?.raf) cancelAnimationFrame(activeSession.raf);
        if (activeSession?.timeout) clearTimeout(activeSession.timeout);
        evidenceRef.current = null;

        if (activeSession?.cancelled) return;

        if (!chunks.length) {
          setRecording(false);
          setAudioStatus('Recorder stopped, but no audio chunk was produced. Try again after refreshing mic permission.');
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        if (latestClipRef.current?.url) URL.revokeObjectURL(latestClipRef.current.url);
        const completedStats = { ...stats, durationMs: performance.now() - startedAt };
        const summaryItem = createAudioEvidenceSummary(completedStats);
        setEvidence((current) => {
          const nextEvidence = [...current, summaryItem].slice(-20);
          safeSetJson('cueforge-audio-evidence', nextEvidence);
          return nextEvidence;
        });
        const clip = {
          url,
          blob,
          recordedAt: summaryItem.recordedAt,
          mimeType: blob.type || recorder.mimeType || 'audio/webm'
        };
        latestClipRef.current = clip;
        setLatestClip(clip);
        setRecording(false);
        setAudioStatus(`${Math.round(summaryItem.durationMs / 1000)}s evidence saved locally. ${summaryItem.recommendation}`);
      };

      const tick = () => {
        analyser.getByteTimeDomainData(time);
        analyser.getByteFrequencyData(freq);
        let sum = 0;
        let peak = 0;
        for (const value of time) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
          peak = Math.max(peak, Math.abs(centered));
        }
        stats.frames += 1;
        stats.rmsTotal += Math.sqrt(sum / time.length);
        stats.peak = Math.max(stats.peak, peak);
        stats.lowBandTotal += avg(freq, 2, 12);
        stats.voiceBandTotal += avg(freq, 18, 85);
        stats.highBandTotal += avg(freq, 95, 190);
        stats.signalAnalysis = analyzeAudioFrame({
          timeDomain: time,
          frequencyData: freq,
          sampleRate: context.sampleRate || 48000
        });
        evidenceRef.current.raf = requestAnimationFrame(tick);
      };

      evidenceRef.current = {
        recorder,
        stream,
        context,
        raf: null,
        timeout: window.setTimeout(stopAll, 12000)
      };
      recorder.start(1000);
      setRecording(true);
      setAudioStatus('Recording 12s local mic evidence. Speak naturally, then play one loud callout.');
      tick();
    } catch {
      const active = evidenceRef.current;
      active?.stream?.getTracks?.().forEach((track) => track.stop());
      active?.context?.close?.();
      evidenceRef.current = null;
      setRecording(false);
      setAudioStatus('Mic permission was blocked, so audio evidence could not start.');
    }
  };

  const stopAudioEvidence = () => {
    const active = evidenceRef.current;
    if (!active) return;
    if (active.timeout) clearTimeout(active.timeout);
    if (active.recorder?.state !== 'inactive') active.recorder.stop();
  };

  const exportEvidencePacket = () => {
    const packet = buildAudioEvidencePacket({ testerId, handle, game, gear, evidence });
    downloadTextFile('cueforge-audio-evidence.json', JSON.stringify(packet, null, 2));
  };

  const clearAudioEvidence = () => {
    if (latestClipRef.current?.url) URL.revokeObjectURL(latestClipRef.current.url);
    latestClipRef.current = null;
    setLatestClip(null);
    setEvidence([]);
    safeSetJson('cueforge-audio-evidence', []);
    setAudioStatus('Local audio evidence cleared from this browser.');
  };

  const downloadLatestClip = () => {
    if (!latestClip) return;
    const link = document.createElement('a');
    link.href = latestClip.url;
    link.download = `cueforge-audio-evidence-${latestClip.recordedAt.replace(/[:.]/g, '-')}.${evidenceFileExtension(latestClip.mimeType)}`;
    link.click();
  };

  return (
    <section className="grid two">
      <Panel title="Real Tester Check-in" icon={Activity}>
        <p>Use this before or after a real play session. It creates a local proof packet testers can attach to GitHub without sending passwords, phone numbers, DOB, raw device IDs, or hidden telemetry.</p>
        <div className="data-card">
          <strong>Anonymous tester ID</strong>
          <span>{testerId}</span>
          <small>Stored locally in this browser. Reset only if you want to start over.</small>
        </div>
        <div className="calibration-grid">
          <label className="field">
            <span>Tester handle</span>
            <input aria-label="Tester handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
          </label>
          <label className="field">
            <span>Game tested</span>
            <input aria-label="Game tested" value={game} onChange={(event) => setGame(event.target.value)} />
          </label>
          <label className="field wide-field">
            <span>Gear chain</span>
            <input aria-label="Gear chain" value={gear} onChange={(event) => setGear(event.target.value)} />
          </label>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={checkIn}><CheckCircle2 size={18} /> Record check-in</button>
          <button className="ghost" onClick={exportPacket} disabled={checkIns.length === 0}><Download size={18} /> Export beta packet</button>
          <button className="ghost" onClick={resetTesterId}><RotateCcw size={18} /> Reset ID</button>
        </div>
        <p className="callout">{status}</p>
      </Panel>
      <Panel title="Active Tester Proof" icon={ShieldCheck}>
        <div className="metric-row selftest-summary">
          <Metric label="Check-ins" value={String(summary.totalCheckIns)} tone={summary.totalCheckIns ? 'teal' : 'amber'} />
          <Metric label="Active days" value={String(summary.uniqueDays)} tone={summary.uniqueDays > 1 ? 'teal' : 'amber'} />
          <Metric label="Source" value={window.cueforgeDesktop?.isDesktop ? 'Desktop' : 'Web'} tone="teal" />
        </div>
        <label className="field">
          <span>Tester notes for export</span>
          <textarea aria-label="Tester notes for export" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="stack">
          {checkIns.length === 0 && (
            <div className="data-card">
              <strong>No check-ins yet</strong>
              <span>Record one after a real test session.</span>
            </div>
          )}
          {checkIns.slice(-5).reverse().map((item) => (
            <div className="data-card" key={`${item.checkedAt}-${item.proof}`}>
              <strong>{new Date(item.checkedAt).toLocaleString()}</strong>
              <span>{item.game || 'Game not specified'} - {item.gear || 'Gear not specified'}</span>
              <small>{item.proof}</small>
            </div>
          ))}
        </div>
      </Panel>
      <HunterRewardsPanel />
      <Panel title="Audio Evidence Logger" icon={Mic}>
        <p>Opt-in local mic clips for before/after proof. CueForge records a short clip only when you press the button, analyzes signal stats, and stores capped metadata locally.</p>
        <div className="live-actions">
          <button className="primary" onClick={startAudioEvidence}>{recording ? 'Stop evidence clip' : 'Record 12s mic evidence'}</button>
          <button className="ghost" onClick={downloadLatestClip} disabled={!latestClip}><Download size={18} /> Download latest clip</button>
          <button className="ghost" onClick={exportEvidencePacket} disabled={evidence.length === 0}><Download size={18} /> Export evidence JSON</button>
          <button className="ghost" onClick={clearAudioEvidence} disabled={evidence.length === 0 && !latestClip}><RotateCcw size={18} /> Clear local evidence</button>
        </div>
        <p className="callout">{audioStatus}</p>
        <div className="stack">
          {evidence.length === 0 && <div className="data-card"><strong>No audio evidence yet</strong><span>Record one before tuning and one after a real match for useful comparison.</span></div>}
          {evidence.slice(-4).reverse().map((item) => (
            <div className="data-card" key={item.recordedAt}>
              <strong>{new Date(item.recordedAt).toLocaleString()} - {Math.round(item.durationMs / 1000)}s</strong>
              <span>Voice {item.voicePresence}% / noise {item.noise}% / clip {item.clipRisk}%</span>
              <small>{item.signalAnalysis ? `Analyzer: ${item.signalAnalysis.probableCause} / FPS ${item.signalAnalysis.fpsClarity}% / comms ${item.signalAnalysis.commsReadiness}%` : item.suggestedTweak}</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="wide" title="How This Keeps It Real" icon={Bug}>
        <ul className="clean-list">
          <li>Each tester gets one local anonymous ID.</li>
          <li>Every check-in gets a date-based proof code, game, gear chain, and source.</li>
          <li>Audio evidence is opt-in, local, and capped. Metadata exports do not include raw audio unless the tester downloads and attaches the clip themselves.</li>
          <li>Beta packets can be attached to GitHub issues so fake one-line feedback is easier to spot.</li>
          <li>No background tracking, no analytics beacon, and no private recovery data.</li>
        </ul>
      </Panel>
    </section>
  );
}

function CommunityHubPage({ cueforgeState = null }) {
  const appUrl = publicRelease.app;
  const discordUrl = socialLinks.Discord;
  const [items, setItems] = useState(() => getSavedJson('cueforge-community-feedback') || []);
  const [source, setSource] = useState('Discord');
  const [platform, setPlatform] = useState('Discord');
  const [redditMode, setRedditMode] = useState('comment');
  const [handle, setHandle] = useState('');
  const [game, setGame] = useState('Tarkov / Siege / COD');
  const [gear, setGear] = useState('IEM/headset + mic');
  const [choice, setChoice] = useState('this');
  const [type, setType] = useState('Footsteps');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('Discord is the main hub. Use this page to keep updates clean and useful.');
  const [approvalQueue, setApprovalQueue] = useState(() => getSavedJson('cueforge-social-approval-queue') || []);
  const [threads, setThreads] = useState(() => getSavedJson('cueforge-community-threads') || []);
  const [threadCommunity, setThreadCommunity] = useState('r/buildapc');
  const [threadTitle, setThreadTitle] = useState('');
  const [threadUrl, setThreadUrl] = useState('');
  const [threadSnapshot, setThreadSnapshot] = useState('');
  const summary = summarizeCommunityFeedback(items);
  const communityPlan = buildCommunityPlan(defaultCommunityWatchlist);
  const threadSummary = summarizeThreads(threads);
  const memoryMarkdown = buildCommunityMemoryMarkdown({ communities: defaultCommunityWatchlist, threads });
  const rollCall = buildRollCallPrompt({ focus: type, game, summary });
  const socialDraft = platform === 'Reddit'
    ? buildRedditSafeDraft({ mode: redditMode, summary, appUrl, discordUrl })
    : buildCommunityDraft({ platform, summary, appUrl, discordUrl });

  const addFeedback = () => {
    const item = createCommunityItem({ source, handle, game, gear, choice, type, note });
    const next = [...items, item].slice(-120);
    setItems(next);
    safeSetJson('cueforge-community-feedback', next);
    setNote('');
    setStatus('Feedback added locally. Summary and drafts updated.');
  };

  const clearFeedback = () => {
    setItems([]);
    safeSetJson('cueforge-community-feedback', []);
    setStatus('Community signal cleared from this browser.');
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard?.writeText(text);
      setStatus(`${label} copied. Review it before posting.`);
    } catch {
      setStatus(`${label} is ready. Select the text and copy it manually if clipboard is blocked.`);
    }
  };

  const stageApprovalDraft = () => {
    const destination = platform === 'Reddit' ? `Reddit: ${redditMode}` : platform;
    const draft = {
      schema: 'cueforge.social-approval.v1',
      id: `post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      platform,
      destination,
      status: 'needs approval',
      body: socialDraft
    };
    const next = [draft, ...approvalQueue].slice(0, 30);
    setApprovalQueue(next);
    safeSetJson('cueforge-social-approval-queue', next);
    setStatus(`${destination} reply queued. Copy it, make it sound like the thread you read, then mark replied after the real account action.`);
  };

  const updateApprovalDraft = (id, nextStatus) => {
    const next = approvalQueue.map((draft) => draft.id === id
      ? {
          ...draft,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        }
      : draft);
    setApprovalQueue(next);
    safeSetJson('cueforge-social-approval-queue', next);
    setStatus(`Draft marked ${nextStatus}.`);
  };

  const clearPostedDrafts = () => {
    const next = approvalQueue.filter((draft) => !['posted', 'replied'].includes(draft.status));
    setApprovalQueue(next);
    safeSetJson('cueforge-social-approval-queue', next);
    setStatus('Completed replies cleared from the local queue.');
  };

  const saveThreadMemory = (overrides = {}) => {
    const parsed = parseRedditSnapshot(threadSnapshot, threadUrl);
    const thread = createThreadMemory({
      community: threadCommunity || parsed.community,
      title: threadTitle || parsed.title,
      url: threadUrl,
      snapshot: threadSnapshot,
      ...overrides
    });
    const next = [thread, ...threads.filter((item) => item.id !== thread.id)].slice(0, 40);
    setThreads(next);
    safeSetJson('cueforge-community-threads', next);
    setThreadTitle('');
    setThreadSnapshot('');
    setStatus(`Saved ${thread.community} thread memory. Next reply draft is ready.`);
  };

  const pullPublicThread = async () => {
    const jsonUrl = buildRedditThreadJsonUrl(threadUrl);
    if (!jsonUrl) {
      setStatus('Paste a full Reddit thread URL first. Public pull only works for /r/.../comments/... links.');
      return;
    }

    try {
      const response = await fetch(jsonUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const thread = threadFromRedditJson(payload, threadUrl);
      if (!thread) throw new Error('No thread payload found');
      const next = [thread, ...threads.filter((item) => item.id !== thread.id)].slice(0, 40);
      setThreads(next);
      safeSetJson('cueforge-community-threads', next);
      setThreadCommunity(thread.community);
      setThreadTitle(thread.title);
      setThreadSnapshot(thread.snapshot);
      setStatus(`Pulled public Reddit thread data for ${thread.community}. Review before replying.`);
    } catch {
      setStatus('Public pull was blocked or unavailable. Paste the visible Reddit thread text into Snapshot, then save memory.');
    }
  };

  const updateThreadStatus = (id, nextStatus) => {
    const next = threads.map((thread) => thread.id === id
      ? { ...thread, status: nextStatus, updatedAt: new Date().toISOString() }
      : thread);
    setThreads(next);
    safeSetJson('cueforge-community-threads', next);
    setStatus(`Thread marked ${nextStatus}.`);
  };

  const removeThread = (id) => {
    const next = threads.filter((thread) => thread.id !== id);
    setThreads(next);
    safeSetJson('cueforge-community-threads', next);
    setStatus('Thread removed from local memory.');
  };

  const exportFeedback = () => {
    const packet = buildCommunityFeedbackPacket({
      summary,
      items,
      approvalQueue,
      threadSummary,
      threads,
      cueforgeState
    });
    downloadTextFile('cueforge-community-feedback.json', JSON.stringify(packet, null, 2));
  };

  const exportMemoryMarkdown = () => {
    downloadTextFile('cueforge-community-memory.md', memoryMarkdown);
  };

  return (
    <section className="grid two">
      <Panel className="wide" title="Community Signal Board" icon={Radio}>
        <p>Log real tester replies here first. Start with Discord, then add useful X, Reddit, or squad feedback to the same signal board.</p>
        <div className="data-card quick-path">
          <strong>Fast path</strong>
          <span>1. Save the thread. 2. Draft a useful reply. 3. Comment only when the thread deserves it.</span>
          <small>No hidden tracking, no private account data, no link drops, and no spam posting.</small>
        </div>
        <div className="community-hero">
          <Metric label="Signals" value={String(summary.total)} tone={summary.total ? 'teal' : 'amber'} />
          <Metric label="Top issue" value={summary.topIssue} tone="teal" />
          <Metric label="Status" value={summary.status.replace('-', ' ')} tone={summary.status === 'strong-signal' ? 'teal' : 'amber'} />
        </div>
        <p className="callout">{summary.recommendation}</p>
        <div className="source-tabs">
          {communitySources.map((name) => (
            <button className={source === name ? 'selected' : ''} key={name} onClick={() => setSource(name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="calibration-grid">
          <label className="field">
            <span>Handle or tester name</span>
            <input aria-label="Handle or tester name" value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="optional" />
          </label>
          <label className="field">
            <span>Game / mode</span>
            <input aria-label="Game / mode" value={game} onChange={(event) => setGame(event.target.value)} />
          </label>
          <label className="field">
            <span>Gear chain</span>
            <input aria-label="Gear chain" value={gear} onChange={(event) => setGear(event.target.value)} />
          </label>
          <label className="field">
            <span>Issue type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              {feedbackTypes.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="choice-row">
          <button className={choice === 'this' ? 'primary' : 'ghost'} onClick={() => setChoice('this')}>This felt better</button>
          <button className={choice === 'that' ? 'primary' : 'ghost'} onClick={() => setChoice('that')}>That felt better</button>
        </div>
        <label className="field">
          <span>What did they actually say?</span>
          <textarea aria-label="What did they actually say?" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Paste or type the useful part. Emails and phone numbers are redacted on save." />
        </label>
        <div className="live-actions">
          <button className="primary" onClick={addFeedback}><CheckCircle2 size={18} /> Add feedback</button>
          <button className="ghost" onClick={exportFeedback} disabled={items.length === 0}><Download size={18} /> Export signal</button>
          <button className="ghost" onClick={clearFeedback} disabled={items.length === 0}><RotateCcw size={18} /> Clear local signal</button>
        </div>
        <p className="callout">{status}</p>
      </Panel>

      <HunterRewardsPanel className="wide" />

      <Panel className="wide" title="High-Engagement Watchlist" icon={Search}>
        <p>Use these as a watch queue, not a blast list. Priority means read/comment when a thread is active and the rules fit.</p>
        <div className="community-watch-grid">
          {communityPlan.map((community) => (
            <div className={`data-card watch-card watch-${community.status}`} key={community.name}>
              <strong>{community.name}</strong>
              <span>{community.lane}</span>
              <div className="watch-meta">
                <b>{community.score}</b>
                <small>{community.status}</small>
              </div>
              <small>{community.audience}</small>
              <small>{community.nextMove}</small>
              <a href={community.url} target="_blank" rel="noreferrer">Open community</a>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="wide" title="Thread Memory" icon={ShieldCheck}>
        <p>Save active discussions before replying. CueForge will keep a local thread memory, draft the next useful reply, and export a GitHub-ready log.</p>
        <div className="metric-row">
          <Metric label="Saved threads" value={String(threadSummary.total)} tone={threadSummary.total ? 'teal' : 'amber'} />
          <Metric label="Priority" value={String(threadSummary.priority)} tone={threadSummary.priority ? 'teal' : 'amber'} />
          <Metric label="Mode" value={threadSummary.status.replace('-', ' ')} tone="teal" />
        </div>
        <div className="calibration-grid">
          <label className="field">
            <span>Community</span>
            <input aria-label="Community" value={threadCommunity} onChange={(event) => setThreadCommunity(event.target.value)} placeholder="r/buildapc" />
          </label>
          <label className="field">
            <span>Thread title</span>
            <input aria-label="Thread title" value={threadTitle} onChange={(event) => setThreadTitle(event.target.value)} placeholder="Useful thread title" />
          </label>
          <label className="field">
            <span>Thread URL</span>
            <input aria-label="Thread URL" value={threadUrl} onChange={(event) => setThreadUrl(event.target.value)} placeholder="https://www.reddit.com/r/.../comments/..." />
          </label>
          <label className="field">
            <span>Conversation snapshot</span>
            <textarea aria-label="Conversation snapshot" value={threadSnapshot} onChange={(event) => setThreadSnapshot(event.target.value)} placeholder="Paste the public thread text, votes/comments, and the part we should answer." />
          </label>
        </div>
        <div className="live-actions">
          <button className="ghost" onClick={pullPublicThread}>Pull public data</button>
          <button className="primary" onClick={() => saveThreadMemory()}><Save size={18} /> Save thread</button>
          <button className="ghost" onClick={() => copyText(memoryMarkdown, 'GitHub memory markdown')}>Copy GitHub memory</button>
          <button className="ghost" onClick={exportMemoryMarkdown}><Download size={18} /> Export memory</button>
        </div>
        <div className="stack thread-list">
          {threads.length === 0 && (
            <div className="data-card">
              <strong>No saved threads yet</strong>
              <span>Start with one active, relevant discussion. Save it before commenting so follow-ups are not lost.</span>
            </div>
          )}
          {threads.slice(0, 6).map((thread) => (
            <div className="data-card thread-card" key={thread.id}>
              <div className="thread-card-head">
                <strong>{thread.community} - {thread.title}</strong>
                <span>{thread.engagementScore} score / {thread.status}</span>
              </div>
              <small>{thread.comments ?? 'unknown'} comments / {thread.votes ?? 'unknown'} votes / {thread.tags.join(', ') || 'untagged'}</small>
              <pre>{thread.nextReply}</pre>
              <div className="live-actions compact-actions">
                <button className="ghost" onClick={() => copyText(thread.nextReply, 'Next reply')}>Copy reply</button>
                <button className="ghost" onClick={() => updateThreadStatus(thread.id, 'commented')}>Commented</button>
                <button className="ghost" onClick={() => updateThreadStatus(thread.id, 'needs-followup')}>Follow up</button>
                <button className="ghost" onClick={() => updateThreadStatus(thread.id, 'filtered')}>Filtered</button>
                <button className="ghost" onClick={() => removeThread(thread.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Roll Call Copy" icon={Activity}>
        <pre>{rollCall}</pre>
        <button className="primary" onClick={() => copyText(rollCall, 'Roll call')}>Copy roll call</button>
      </Panel>

      <Panel title="Reply Draft" icon={Bug}>
        <div className="source-tabs">
          {['Discord', 'X', 'Reddit'].map((name) => (
            <button className={platform === name ? 'selected' : ''} key={name} onClick={() => setPlatform(name)}>
              {name}
            </button>
          ))}
        </div>
        {platform === 'Reddit' && (
          <div className="source-tabs compact-tabs">
            {[
              ['comment', 'Helpful reply'],
              ['modmail', 'Modmail ask']
            ].map(([id, label]) => (
              <button className={redditMode === id ? 'selected' : ''} key={id} onClick={() => setRedditMode(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <pre>{socialDraft}</pre>
        <div className="live-actions">
          <button className="primary" onClick={() => copyText(socialDraft, `${platform} reply draft`)}>Copy reply</button>
          <button className="ghost" onClick={stageApprovalDraft}><Save size={18} /> Queue reply</button>
        </div>
      </Panel>

      <Panel title="Reply Queue" icon={ShieldCheck}>
        <p>Owned-account outreach is comment-first now. Queue a reply here, copy it into the thread you already read, then mark what happened.</p>
        <div className="stack">
          {approvalQueue.length === 0 && (
            <div className="data-card">
              <strong>No queued replies</strong>
              <span>Save a thread memory first, then queue one useful reply.</span>
            </div>
          )}
          {approvalQueue.slice(0, 5).map((draft) => (
            <div className="data-card" key={draft.id}>
              <strong>{draft.destination} - {draft.status}</strong>
              <span>{new Date(draft.createdAt).toLocaleString()}</span>
              <small>{draft.body.slice(0, 180)}{draft.body.length > 180 ? '...' : ''}</small>
              <div className="live-actions compact-actions">
                <button className="ghost" onClick={() => copyText(draft.body, `${draft.destination} staged draft`)}>Copy</button>
                <button className="ghost" onClick={() => updateApprovalDraft(draft.id, 'approved')}>Approved</button>
                <button className="primary" onClick={() => updateApprovalDraft(draft.id, 'replied')}>Replied</button>
              </div>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={clearPostedDrafts} disabled={!approvalQueue.some((draft) => ['posted', 'replied'].includes(draft.status))}>Clear completed</button>
      </Panel>

      <Panel className="wide" title="Latest Signal" icon={ShieldCheck}>
        <div className="stack">
          {items.length === 0 && (
            <div className="data-card">
              <strong>No community signal yet</strong>
              <span>Start with one Discord roll call, then log the replies here.</span>
            </div>
          )}
          {items.slice(-8).reverse().map((item) => (
            <div className="data-card" key={`${item.receivedAt}-${item.source}-${item.note}`}>
              <strong>{item.source} - {item.type} - {item.choice}</strong>
              <span>{item.game || 'No game'} / {item.gear || 'No gear'}</span>
              <small>{item.note || 'No note attached.'}</small>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

async function getMicPermissionState() {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const permission = await navigator.permissions.query({ name: 'microphone' });
    return permission.state;
  } catch {
    return 'unknown';
  }
}

function sectionTitle(id) {
  return {
    hub: 'Community Hub',
    mic: 'Mic Lab',
    selftest: 'Auto Self Test',
    dna: 'Audio DNA',
    blindmatch: 'Blind Match',
    masking: 'Tactical Masking Lab',
    trial: 'Player Trial',
    beta: 'Beta Check-in',
    notes: 'Panda Notes',
    saves: 'Gameplay Save',
    reports: 'Report Lab',
    calibration: 'Auto Calibration',
    eq: 'EQ Studio',
    games: 'Game Profiles',
    detect: 'Auto Detect',
    drivers: 'Driver Layer',
    hearing: 'Personal Hearing Model',
    inventory: 'System Info',
    settings: 'Settings'
  }[id];
}

function SettingsToggle({ label, detail, checked, onChange }) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </label>
  );
}

function SettingsPage({ settings, onUpdate, onReset, onRerunSetup, onOpen, uiNoteCount = 0, shortcutCount = 0 }) {
  const normalized = normalizeUserSettings(settings);
  const audioSummary = buildAudioPolicySummary(normalized);
  const backgroundAllowed = canPlayBackgroundAudio(normalized);
  const cinematicAllowed = canPlayCinematicVideoAudio(normalized);
  const desktopReady = Boolean(window.cueforgeDesktop?.isDesktop);

  return (
    <section className="grid two settings-page">
      <Panel className="wide" title="App Behavior" icon={Settings2}>
        <div className="settings-hero">
          <div>
            <h2>Start quiet. Turn sound on only when you mean it.</h2>
            <p>{audioSummary}</p>
          </div>
          <div className="metric-row selftest-summary">
            <Metric label="Quiet" value={normalized.quietMode ? 'On' : 'Off'} tone={normalized.quietMode ? 'teal' : 'amber'} />
            <Metric label="Background" value={backgroundAllowed ? 'On' : 'Off'} tone={backgroundAllowed ? 'amber' : 'teal'} />
            <Metric label="Video audio" value={cinematicAllowed ? 'On' : 'Off'} tone={cinematicAllowed ? 'amber' : 'teal'} />
            <Metric label="Notes" value={normalized.uiNotesEnabled ? 'On' : 'Off'} tone={normalized.uiNotesEnabled ? 'teal' : 'amber'} />
            <Metric label="Mode" value={normalized.interfaceMode === 'expert' ? 'Expert' : 'Simple'} tone={normalized.interfaceMode === 'expert' ? 'amber' : 'teal'} />
          </div>
        </div>
      </Panel>

      <Panel title="Player Mode" icon={Gauge}>
        <p>Simple Mode is the default player path. Expert Mode brings back the full lab, raw proof, system info, and developer repair tools.</p>
        <div className="mode-choice">
          <button
            className={normalized.interfaceMode === 'simple' ? 'selected' : ''}
            onClick={() => onUpdate({ interfaceMode: 'simple' })}
          >
            <Gauge size={18} />
            <strong>Simple</strong>
            <span>Guided setup, mic check, tune, play test, report.</span>
          </button>
          <button
            className={normalized.interfaceMode === 'expert' ? 'selected' : ''}
            onClick={() => onUpdate({ interfaceMode: 'expert' })}
          >
            <BrainCircuit size={18} />
            <strong>Expert</strong>
            <span>All labs, raw data, repair inbox, exports, and system proof.</span>
          </button>
        </div>
      </Panel>

      <Panel title="Audio Controls" icon={Volume2}>
        <div className="settings-stack">
          <SettingsToggle
            label="Quiet mode"
            detail="Blocks background soundwalks and cinematic video audio. Mic feedback and headphone checks still require a click."
            checked={normalized.quietMode}
            onChange={(value) => onUpdate({ quietMode: value })}
          />
          <SettingsToggle
            label="Allow background soundwalk"
            detail="Lets the first-run bamboo setup bed play after you press Start soundwalk."
            checked={normalized.backgroundAudio}
            onChange={(value) => onUpdate({ backgroundAudio: value })}
          />
          <SettingsToggle
            label="Allow cinematic video audio"
            detail="Lets the private panda video test page play sound after a direct user action."
            checked={normalized.cinematicVideoAudio}
            onChange={(value) => onUpdate({ cinematicVideoAudio: value })}
          />
        </div>
        <p className="callout">Quiet mode wins over the other audio toggles. That keeps CueForge from adding extra sound while Discord, games, music, or desktop audio are already running.</p>
      </Panel>

      <Panel title="Tester Workflow" icon={Bug}>
        <div className="settings-stack">
          <SettingsToggle
            label="Panda Notes"
            detail="Right-click any app area to tag local developer notes for reports and repair packets."
            checked={normalized.uiNotesEnabled}
            onChange={(value) => onUpdate({ uiNotesEnabled: value })}
          />
          <SettingsToggle
            label="Desktop bridge hints"
            detail="Show native setup guidance when the browser cannot scan Windows audio devices."
            checked={normalized.desktopBridgeHints}
            onChange={(value) => onUpdate({ desktopBridgeHints: value })}
          />
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="Panda Notes" value={String(uiNoteCount)} tone={uiNoteCount ? 'amber' : 'teal'} />
          <Metric label="Shortcuts" value={String(shortcutCount)} tone={shortcutCount ? 'teal' : 'amber'} />
          <Metric label="Desktop" value={desktopReady ? 'Ready' : 'Browser'} tone={desktopReady ? 'teal' : 'amber'} />
        </div>
      </Panel>

      <Panel title="Setup And Recovery" icon={ShieldCheck}>
        <p>Use these when the app feels noisy, stuck, or needs to start over for a new tester.</p>
        <div className="live-actions">
          <button className="primary" onClick={onRerunSetup}><RotateCcw size={18} /> Rerun setup</button>
          <button className="ghost" onClick={() => onOpen('selftest')}><TestTube2 size={18} /> Open Self Test</button>
          <button className="ghost" onClick={() => onOpen('inventory')}><BrainCircuit size={18} /> Open System Info</button>
          <button className="ghost" onClick={onReset}><RotateCcw size={18} /> Reset settings</button>
        </div>
        <div className="data-card">
          <strong>Safe default</strong>
          <span>After reset, CueForge returns to quiet mode with background audio off, cinematic audio off, and developer notes on.</span>
        </div>
      </Panel>
    </section>
  );
}

function MaskingLabPage({ eq, onApply }) {
  const [scenarioId, setScenarioId] = useState(maskingScenarios[0].id);
  const tune = createMaskingTune(eq, scenarioId);
  const maskingConfidence = clamp(Math.round((tune.after + Math.max(0, tune.improvement)) / 2), 0, 100);

  const playScenario = async () => {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.0001;
    master.connect(context.destination);

    const freqs = tune.scenario.id === 'footsteps-under-explosion'
      ? [70, 120, 2400, 4200]
      : tune.scenario.id === 'voice-over-game'
        ? [250, 500, 1000, 2400]
        : [2800, 4800, 8000];

    freqs.forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = index < 2 ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = 0.16 / (index + 1);
      osc.connect(gain).connect(master);
      osc.start(context.currentTime + index * 0.1);
      osc.stop(context.currentTime + 1.05);
    });

    master.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.1);
    setTimeout(() => context.close(), 1300);
  };

  return (
    <section className="grid two">
      <Panel title="Tactical Masking Lab" icon={AudioLines}>
        <p>Stress-test your EQ against the thing that matters in-game: important cues getting buried by explosions, game beds, comms, or IEM sharpness.</p>
        <label className="field">
          <span>Scenario</span>
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
            {maskingScenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
          </select>
        </label>
        <div className="metric-row selftest-summary">
          <Metric label="Before" value={`${tune.before}`} tone="amber" />
          <Metric label="After" value={`${tune.after}`} tone="teal" />
          <Metric label="Delta" value={`+${Math.max(0, tune.improvement)}`} tone="teal" />
          <Metric label="Confidence" value={`${maskingConfidence}%`} tone="teal" />
        </div>
        <div className="data-card">
          <strong>Analyzer signal evidence</strong>
          <span>Masking confidence comes from the selected scenario, current EQ shape, target cue bands, and problem bands. Treat it as local decision support until a real clip or match report confirms it.</span>
          <small>Evidence: {tune.scenario.targetBands.map((index) => bands[index]).join(', ')} target signal vs {tune.scenario.problemBands.map((index) => bands[index]).join(', ')} masker pressure.</small>
        </div>
        <div className="data-card replay-export-status">
          <strong>Replay-safe export status</strong>
          <span>Ready when exported. The masking tune stores scenario, score, EQ delta, and target bands so the fix can be replayed without raw audio.</span>
          <small>No device IDs, paths, emails, phones, or raw mic/game clips are included.</small>
        </div>
        <p className="callout">{tune.summary}</p>
        <div className="live-actions">
          <button className="ghost" onClick={playScenario}><Play size={18} /> Play stress sample</button>
          <button className="primary" onClick={() => onApply(tune.eq)}><CheckCircle2 size={18} /> Apply anti-masking EQ</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-masking-eq.json', JSON.stringify(tune, null, 2))}><Download size={18} /> Export masking tune</button>
        </div>
      </Panel>
      <Panel title="Anti-Masking Curve" icon={SlidersHorizontal}>
        <div className="eq-preview">
          {tune.eq.map((gain, index) => <span key={bands[index]} style={{ height: `${45 + gain * 8}%` }} title={`${bands[index]} ${gain}dB`} />)}
        </div>
        <ul className="clean-list">
          <li>Masker: {tune.scenario.masker}</li>
          <li>Targets bands: {tune.scenario.targetBands.map((index) => bands[index]).join(', ')}</li>
          <li>Problem bands: {tune.scenario.problemBands.map((index) => bands[index]).join(', ')}</li>
        </ul>
      </Panel>
    </section>
  );
}

function BlindMatchPage({ baseEq, onApply, onSavePreferenceModel }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const [savedResult, setSavedResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cueforge-blind-match') || 'null');
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState('Play This and That, then pick what actually feels better. No charts first.');

  const round = blindMatchRounds[roundIndex];
  const result = createBlindMatchResult(choices, baseEq);
  const complete = result.completedRounds >= result.requiredRounds;
  const applyReady = Boolean(result.applyReadiness?.ready);
  const repeatClean = result.repeatChecks.filter((check) => check.consistent === true).length;
  const sampleLabel = (sampleKey) => {
    if (sampleKey === SOUND_MATCH_NEUTRAL_CHOICE) return round.neutralLabel;
    return sampleKey === 'a' ? `A: ${round.labelA}` : `B: ${round.labelB}`;
  };

  const playSample = async (sampleKey) => {
    const sample = round[sampleKey];
    const Context = window.AudioContext || window.webkitAudioContext;
    const context = new Context();
    const master = context.createGain();
    const panner = context.createStereoPanner();
    master.gain.value = 0.0001;
    panner.pan.value = sampleKey === 'a' ? -0.18 : 0.18;
    master.connect(panner).connect(context.destination);

    sample.frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = (0.13 * (sample.loudnessGain || 0.86)) / Math.sqrt(index + 1);
      oscillator.connect(gain).connect(master);
      oscillator.start(context.currentTime + index * 0.08);
      oscillator.stop(context.currentTime + 0.85 + index * 0.08);
    });

    master.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.05);
    setTimeout(() => context.close(), 1200);
    setStatus(`Played ${sampleLabel(sampleKey)}. Pick based on comfort and detail, not loudness.`);
  };

  const choose = (sampleKey) => {
    const next = { ...choices, [round.id]: sampleKey };
    const live = createBlindMatchResult(next, baseEq);
    setChoices(next);
    safeSetJson('cueforge-preference-model-draft', live.preferenceModel);
    onSavePreferenceModel?.(live.preferenceModel);
    if (roundIndex < blindMatchRounds.length - 1) {
      setRoundIndex(roundIndex + 1);
    }
    setStatus(sampleKey === SOUND_MATCH_NEUTRAL_CHOICE
      ? `Marked ${round.label} as too close. That protects the curve from fake certainty.`
      : `Locked ${round.label}: ${sampleLabel(sampleKey)} felt better.`);
  };

  const reset = () => {
    setChoices({});
    setRoundIndex(0);
    localStorage.removeItem('cueforge-preference-model-draft');
    onSavePreferenceModel?.(savedResult?.preferenceModel || null);
    setStatus('Reset. Start the this-or-that rounds again.');
  };

  const save = () => {
    const next = createBlindMatchResult(choices, baseEq);
    safeSetJson('cueforge-blind-match', next);
    safeSetJson('cueforge-preference-model', next.preferenceModel);
    onSavePreferenceModel?.(next.preferenceModel);
    setSavedResult(next);
    setStatus(next.applyReadiness.ready
      ? 'Sound Match profile saved into the Profile Engine.'
      : 'Sound Match saved as preview evidence. Repeat consistency is needed before direct apply.');
  };

  const exportResult = () => {
    const payload = createBlindMatchResult(choices, baseEq);
    downloadTextFile('cueforge-sound-match.json', JSON.stringify(payload, null, 2));
  };

  return (
    <section className="grid two">
      <Panel title="Sound Match" icon={Radio}>
        <p>This is the eye test for your ears. Compare hidden sound pairs, pick what actually works, or mark them too close. CueForge learns a personal curve only when your choices repeat cleanly.</p>
        <div className="dna-hero">
          <strong>{round.label}</strong>
          <span>Round {roundIndex + 1} of {result.requiredRounds}</span>
        </div>
        <p className="callout">{round.prompt}</p>
        <div className="blind-actions">
          <button className="ghost" onClick={() => playSample('a')}><Play size={18} /> Play A</button>
          <button className="ghost" onClick={() => playSample('b')}><Play size={18} /> Play B</button>
          <button className="primary" onClick={() => choose('a')}>A: {round.labelA}</button>
          <button className="primary" onClick={() => choose('b')}>B: {round.labelB}</button>
          <button className="ghost" onClick={() => choose(SOUND_MATCH_NEUTRAL_CHOICE)}>{round.neutralLabel}</button>
        </div>
        <p>{status}</p>
        <div className="live-actions">
          <button className="ghost" onClick={reset}>Reset rounds</button>
          <button className="ghost" onClick={save} disabled={!complete}><Save size={18} /> Save Sound Match</button>
          <button className="ghost" onClick={exportResult} disabled={!complete}><Download size={18} /> Export Sound Match</button>
          <button
            className="primary"
            onClick={() => {
              safeSetJson('cueforge-preference-model', result.preferenceModel);
              onSavePreferenceModel?.(result.preferenceModel);
              onApply(result.eq);
            }}
            disabled={!applyReady}
          >
            <CheckCircle2 size={18} /> Apply learned EQ
          </button>
        </div>
      </Panel>
      <Panel title="Learned Curve" icon={SlidersHorizontal}>
        <Metric label="Confidence" value={`${result.confidence}%`} tone={applyReady ? 'teal' : 'amber'} />
        <Metric label="Consistency" value={`${repeatClean}/${result.repeatChecks.length || 2}`} tone={applyReady ? 'teal' : 'amber'} />
        <Metric label="Preference" value={`${Math.round((result.preferenceModel?.confidence || 0) * 100)}%`} tone={complete ? 'teal' : 'amber'} />
        <p>{result.summary}</p>
        <div className="data-card">
          <strong>{result.preferenceSummary}</strong>
          <span>The simple choices are saved as hidden weights so the profile engine can tune EQ, dynamics, and spatial behavior together.</span>
          <small>Footsteps {result.preferenceModel.footstepPriority || 0} / Comms {result.preferenceModel.voiceClarity || 0} / Bass {result.preferenceModel.bassImpact || 0} / Masking {result.preferenceModel.maskingControl || 0} / Comfort {result.preferenceModel.comfortPriority || 0}</small>
        </div>
        <div className="data-card">
          <strong>{result.applyReadiness.status === 'ready' ? 'Ready for controlled apply' : 'Preview evidence only'}</strong>
          <span>{result.applyReadiness.reason}</span>
          <small>{result.whyChips.join(' / ')}</small>
        </div>
        <div className="data-card replay-export-status">
          <strong>Replay-safe export status</strong>
          <span>{complete ? 'Ready to export choices, repeat checks, preference weights, confidence, and learned EQ.' : 'Complete the standard 9-round flow before the replay-safe export unlocks.'}</span>
          <small>No raw audio is stored. The export is enough to replay the decision path.</small>
        </div>
        <div className="eq-preview">
          {result.eq.map((gain, index) => <span key={bands[index]} style={{ height: `${45 + gain * 8}%` }} title={`${bands[index]} ${gain}dB`} />)}
        </div>
        <ul className="clean-list">
          {result.picked.length === 0 && <li>No choices yet.</li>}
          {result.picked.map((pick) => <li key={pick}>{pick}</li>)}
        </ul>
      </Panel>
      <Panel className="wide" title="Saved Sound Match" icon={Save}>
        {!savedResult && <div className="data-card"><strong>No saved Sound Match yet</strong><span>Complete all rounds and save the result.</span></div>}
        {savedResult && (
          <div className="data-card">
            <strong>{savedResult.signature}</strong>
            <span>{savedResult.confidence}% confidence from {savedResult.completedRounds} rounds.</span>
            <small>{savedResult.preferenceSummary || savedResult.summary}</small>
          </div>
        )}
      </Panel>
    </section>
  );
}

function ReportLabPage({
  eq,
  apoConfig,
  selectedGame,
  selectedSourceProfile,
  sample,
  analysis,
  active,
  replayNotice,
  uiNotes = [],
  cueforgeState = null,
  onReplay
}) {
  const [notes, setNotes] = useState('Describe what happened, what game was running, and what you expected to hear.');
  const [status, setStatus] = useState('Ready to create a redacted report.');
  const [lastReport, setLastReport] = useState(null);
  const [imported, setImported] = useState(null);
  const fileInputRef = useRef(null);

  const collectReport = async () => {
    setStatus('Building redacted report...');
    try {
      const report = buildIssueReport({
        eq,
        apoConfig,
        selectedGame,
        selectedSourceProfile,
        currentPage: active,
        sample,
        analysis,
        hearing: getSavedJson('cueforge-hearing-results'),
        dna: getSavedJson('cueforge-dna-history')?.[0] || null,
        bridgeReport: null,
        browserDevices: [],
        selfTestResults: getSavedJson('cueforge-self-test-results') || [],
        uiFeedbackNotes: uiNotes,
        notes,
        cueforgeState
      });
      setLastReport(report);
      safeSetJson('cueforge-last-issue-report', report);
      setStatus(`Redacted report ready: ${report.diagnostics.browserDevices.length} browser audio devices, ${report.diagnostics.selfTestResults.length} self-test rows, ${report.diagnostics.uiFeedbackNotes.length} UI notes.`);
    } catch {
      const report = buildIssueReport({
        eq,
        apoConfig,
        selectedGame,
        selectedSourceProfile,
        currentPage: active,
        sample,
        analysis,
        hearing: null,
        dna: null,
        bridgeReport: null,
        browserDevices: [],
        selfTestResults: [],
        uiFeedbackNotes: uiNotes,
        notes,
        cueforgeState
      });
      setLastReport(report);
      safeSetJson('cueforge-last-issue-report', report);
      setStatus('Redacted report ready with fallback diagnostics.');
    }
  };

  const downloadReport = () => {
    const report = lastReport || getSavedJson('cueforge-last-issue-report');
    if (!report) {
      setStatus('Create a report first.');
      return;
    }
    downloadTextFile('cueforge-redacted-issue-report.json', JSON.stringify(report, null, 2));
    setStatus(`Report downloaded. Replay package includes ${report.reproducibleState.eq.length} EQ bands and ${report.diagnostics.uiFeedbackNotes?.length || 0} UI note${report.diagnostics.uiFeedbackNotes?.length === 1 ? '' : 's'}.`);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const validation = validateIssueReport(parsed);
      if (!validation.ok) throw new Error(validation.reason);
      setImported(parsed);
      setStatus(`${validation.reason} Imported ${parsed.app?.selectedGame || 'saved setup'} for replay review.`);
    } catch (error) {
      setStatus(error.message || 'Could not import that report.');
    } finally {
      event.target.value = '';
    }
  };

  const replayImported = () => {
    if (!imported) {
      setStatus('Import a report first.');
      return;
    }
    setStatus(`Replaying imported report for ${imported.app?.selectedGame || 'the saved setup'}.`);
    onReplay(imported.reproducibleState);
  };

  const savedReport = getSavedJson('cueforge-last-issue-report');
  const report = lastReport || (validateIssueReport(savedReport).ok ? savedReport : null);

  const replaySavedReport = () => {
    if (!report) {
      setStatus('Create or import a report first.');
      return;
    }
    setStatus(`Replaying saved report for ${report.app?.selectedGame || 'the current setup'}.`);
    onReplay(report.reproducibleState);
  };

  return (
    <section className="grid two">
      <Panel title="Redacted Player Report" icon={Bug}>
        <p>Create a bug report that keeps the useful setup data and removes local identifiers before it leaves the machine.</p>
        <label className="field">
          <span>Issue notes</span>
          <textarea aria-label="Issue notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="live-actions">
          <button className="primary" onClick={collectReport}><Bug size={18} /> Create redacted report</button>
          <button className="ghost" onClick={downloadReport}><Download size={18} /> Download report</button>
          <button className="ghost" onClick={replaySavedReport} disabled={!report}>
            <RotateCcw size={18} /> Replay last report
          </button>
        </div>
        <p className="callout">{status}</p>
        {replayNotice && <p className="success">{replayNotice}</p>}
      </Panel>
      <Panel title="Recover And Reproduce" icon={RotateCcw}>
        <p>Import a player report to restore the EQ, game profile, source target, mic notes, and analyzer state that caused the issue.</p>
        <input ref={fileInputRef} className="file-input" type="file" accept="application/json,.json" aria-label="Import player report" onChange={handleImport} />
        <div className="live-actions">
          <button className="ghost" onClick={() => fileInputRef.current?.click()}><Download size={18} /> Import report</button>
          <button className="primary" onClick={replayImported} disabled={!imported}><RotateCcw size={18} /> Replay in app</button>
        </div>
        {imported ? (
          <div className="data-card">
            <strong>{imported.app.selectedGame || 'Imported setup'}</strong>
            <span>{imported.reproducibleState.eq.map((gain) => `${gain > 0 ? '+' : ''}${gain}`).join(' / ')}</span>
            <small>{new Date(imported.generatedAt).toLocaleString()}</small>
          </div>
        ) : (
          <div className="data-card">
            <strong>No report imported</strong>
            <span>Use a redacted issue report from another tester or from your last session.</span>
          </div>
        )}
      </Panel>
      <Panel className="wide" title="Report Preview" icon={ShieldCheck}>
        {!report && (
          <div className="report-preview">
            <div className="data-card replay-export-status">
              <strong>Replay-safe export status</strong>
              <span>Waiting for a redacted report. Nothing leaves the machine until the player creates and shares one.</span>
              <small>Create a report to preview replay data, redaction, and restore status.</small>
            </div>
            <div className="data-card"><strong>No report yet</strong><span>Create a report to preview the redacted payload.</span></div>
          </div>
        )}
        {report && (
          <div className="report-preview">
            <div className="metric-row selftest-summary">
              <Metric label="EQ bands" value={String(report.reproducibleState.eq.length)} tone="teal" />
              <Metric label="Devices" value={String(report.diagnostics.browserDevices.length)} tone="amber" />
              <Metric label="Self tests" value={String(report.diagnostics.selfTestResults.length)} tone="teal" />
              <Metric label="UI notes" value={String(report.diagnostics.uiFeedbackNotes?.length || 0)} tone={report.diagnostics.uiFeedbackNotes?.length ? 'teal' : 'amber'} />
            </div>
            <div className="data-card replay-export-status">
              <strong>Replay-safe export status</strong>
              <span>Ready. The report can restore EQ, game, source profile, mic notes, analyzer state, and UI notes without exposing raw identifiers.</span>
              <small>Use Replay last report or import this JSON to reproduce the issue.</small>
            </div>
            <pre>{JSON.stringify(report, null, 2)}</pre>
          </div>
        )}
      </Panel>
    </section>
  );
}

async function getBrowserAudioDevices() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await withTimeout(navigator.mediaDevices.enumerateDevices(), 1800, []);
    return devices.filter((device) => device.kind.includes('audio')).map((device) => ({
      kind: device.kind,
      label: device.label,
      deviceId: device.deviceId,
      groupId: device.groupId,
      source: 'browser'
    }));
  } catch {
    return [];
  }
}

async function getGeneratedBridgeReport() {
  if (window.cueforgeDesktop?.readBridgeReport) {
    try {
      const report = await window.cueforgeDesktop.readBridgeReport();
      if (report) return report;
    } catch {
      // Fall through to the web-served bridge report.
    }
  }

  if (window.location.protocol === 'file:') return null;

  try {
    const response = await withTimeout(fetch(publicAssetPath('/tools/cueforge-audio-setup-report.json'), { cache: 'no-store' }), 1800, null);
    if (!response) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function runDesktopBridgeScanIfAvailable() {
  if (!window.cueforgeDesktop?.scanAudioSetup) {
    return { ok: false, unavailable: true, error: 'Desktop Windows scan is only available in the CueForge desktop app.' };
  }

  try {
    return await window.cueforgeDesktop.scanAudioSetup();
  } catch (error) {
    return { ok: false, error: error?.message || 'Desktop Windows scan failed.' };
  }
}

async function captureMicProof({ durationMs = 850 } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return evaluateMicCaptureProof({ streamStarted: false });
  }

  let stream;
  let context;
  try {
    stream = await withTimeout(
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      }),
      5000,
      null
    );
    if (!stream) {
      return evaluateMicCaptureProof({ streamStarted: false });
    }
    context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const frame = new Uint8Array(analyser.fftSize);
    const startedAt = performance.now();
    let sumSquares = 0;
    let sampleCount = 0;
    let peak = 0;
    let frameCount = 0;

    while (performance.now() - startedAt < durationMs) {
      analyser.getByteTimeDomainData(frame);
      for (const value of frame) {
        const centered = (value - 128) / 128;
        sumSquares += centered * centered;
        peak = Math.max(peak, Math.abs(centered));
        sampleCount += 1;
      }
      frameCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 58));
    }

    const track = stream.getAudioTracks()[0];
    return evaluateMicCaptureProof({
      streamStarted: true,
      rms: sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0,
      peak,
      sampleRate: context.sampleRate,
      frameCount,
      captureMs: performance.now() - startedAt,
      deviceLabel: track?.label || ''
    });
  } catch {
    return evaluateMicCaptureProof({ streamStarted: false });
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    if (context?.state !== 'closed') {
      context?.close?.();
    }
  }
}

function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
}

function getSavedJson(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function safeSetJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function AudioDnaPage({ eq, cueforgeState = null }) {
  const [gameFocus, setGameFocus] = useState('Valorant / CS2');
  const [micProfile, setMicProfile] = useState('hyperx');
  const [bridgeLoaded, setBridgeLoaded] = useState(false);
  const [apoFound, setApoFound] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cueforge-dna-history') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    getGeneratedBridgeReport()
      .then((report) => {
        if (!report) return;
        setBridgeLoaded(true);
        setApoFound(Boolean(report.tools?.equalizerApo?.installed));
      })
      .catch(() => {});
  }, []);

  const hearingState = (() => {
    try {
      const saved = localStorage.getItem('cueforge-hearing-results');
      if (!saved) return { complete: false, answered: 0, total: hearingFrequencies.length * 2 };
      return hearingScore(JSON.parse(saved));
    } catch {
      return { complete: false, answered: 0, total: hearingFrequencies.length * 2 };
    }
  })();

  const dna = createAudioDnaFromState(cueforgeState, {
    eq,
    hearingScore: hearingState,
    micProfile,
    gameFocus,
    deviceStatus: {
      bridgeLoaded: bridgeLoaded || Boolean(cueforgeState?.chain?.activeCompanions?.length),
      apoFound: apoFound || Boolean(cueforgeState?.chain?.apoDetected)
    }
  });

  const saveDna = () => {
    const next = [{ ...dna, savedAt: new Date().toISOString() }, ...history].slice(0, 6);
    setHistory(next);
    safeSetJson('cueforge-dna-history', next);
  };

  const exportDna = () => {
    const blob = new Blob([JSON.stringify(dna, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cueforge-audio-dna.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="grid two">
      <Panel title="Personal Audio DNA" icon={BrainCircuit}>
        <p>Your Audio DNA is a saved fingerprint of EQ shape, hearing-model progress, device confidence, mic chain, and game focus.</p>
        <div className="dna-hero">
          <strong>{dna.id}</strong>
          <span>{dna.confidence}% setup confidence</span>
        </div>
        <div className="calibration-grid">
          <label className="field">
            <span>Game focus</span>
            <select value={gameFocus} onChange={(event) => setGameFocus(event.target.value)}>
              <option>Valorant / CS2</option>
              <option>Warzone / Apex</option>
              <option>Music / Media</option>
              <option>Discord Comms</option>
            </select>
          </label>
          <label className="field">
            <span>Mic chain</span>
            <select value={micProfile} onChange={(event) => setMicProfile(event.target.value)}>
              <option value="hyperx">HyperX boom mic</option>
              <option value="generic">Generic microphone</option>
            </select>
          </label>
        </div>
        <div className="dna-traits">
          {dna.traits.map((trait) => <span key={trait}>{trait}</span>)}
        </div>
        <div className="live-actions">
          <button className="primary" onClick={saveDna}><Save size={18} /> Save DNA</button>
          <button className="ghost" onClick={exportDna}><Download size={18} /> Export DNA</button>
        </div>
      </Panel>
      <Panel title="Recommendations" icon={Sparkles}>
        <ul className="clean-list">
          {dna.recommendations.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="dna-stats">
          <Metric label="Cue lift" value={`${dna.snapshot.cueLift}dB`} tone="teal" />
          <Metric label="Low weight" value={`${dna.snapshot.lowWeight}dB`} tone="amber" />
          <Metric label="Hearing test" value={`${hearingState.answered || 0}/${hearingState.total || 12}`} tone={hearingState.complete ? 'teal' : 'amber'} />
          <Metric label="APO" value={apoFound ? 'Found' : 'Needed'} tone={apoFound ? 'teal' : 'amber'} />
        </div>
      </Panel>
      <Panel className="wide" title="Saved DNA History" icon={Save}>
        <div className="stack">
          {history.length === 0 && <div className="data-card"><strong>No saved DNA yet</strong><span>Save a fingerprint after you like a calibration.</span></div>}
          {history.map((item) => (
            <div className="data-card" key={item.savedAt}>
              <strong>{item.id}</strong>
              <span>{item.confidence}% confidence - {new Date(item.savedAt).toLocaleString()}</span>
              <small>{item.recommendations[0]}</small>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function SelfTestRunner() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [latestBridgeReport, setLatestBridgeReport] = useState(null);

  useEffect(() => {
    if (!window.cueforgeDesktop?.info) return;
    window.cueforgeDesktop.info()
      .then(setDesktopInfo)
      .catch(() => setDesktopInfo(null));
  }, []);

  const desktopBridgePlan = useMemo(() => buildDesktopBridgeFixPlan({
    desktopAvailable: Boolean(window.cueforgeDesktop?.isDesktop),
    desktopInfo,
    bridgeReport: latestBridgeReport
  }), [desktopInfo, latestBridgeReport]);
  const desktopBridgeText = useMemo(() => buildDesktopBridgeFixText(desktopBridgePlan), [desktopBridgePlan]);

  const addResult = (name, status, detail) => {
    setResults((current) => [...current, { name, status, detail }]);
  };

  const runSelfTest = async () => {
    setRunning(true);
    setResults([]);
    const runLog = [];
    const record = (name, status, detail) => {
      const result = { name, status, detail };
      runLog.push(result);
      addResult(name, status, detail);
    };

    const audioApi = Boolean(window.AudioContext && navigator.mediaDevices?.enumerateDevices);
    record('Browser audio APIs', audioApi ? 'pass' : 'fail', audioApi ? 'AudioContext and mediaDevices are available.' : 'Browser audio APIs are missing.');

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter((device) => device.kind.includes('audio'));
      record('Device enumeration', audioDevices.length > 0 ? 'pass' : 'warn', `${audioDevices.length} audio device entries returned.`);
    } catch {
      record('Device enumeration', 'fail', 'Browser blocked device enumeration.');
    }

    const desktopAvailable = Boolean(window.cueforgeDesktop?.isDesktop);
    record(
      'Desktop bridge availability',
      desktopAvailable ? 'pass' : 'warn',
      desktopAvailable
        ? `Desktop shell active. Native scan path: ${desktopInfo?.scriptPath || 'ready'}.`
        : 'Browser mode cannot run a native Windows scan. Use the desktop build for one-click device/tool detection.'
    );

    let bridgeReport = await getGeneratedBridgeReport();
    setLatestBridgeReport(bridgeReport);
    if (!bridgeReport && desktopAvailable) {
      const scanResult = await runDesktopBridgeScanIfAvailable();
      if (scanResult?.ok) {
        bridgeReport = scanResult.report;
        setLatestBridgeReport(bridgeReport);
        record('Desktop Windows scan', 'pass', `Native scan completed and saved to ${scanResult.reportPath}.`);
      } else {
        record('Desktop Windows scan', 'warn', scanResult?.error || 'Native scan did not return a report.');
      }
    }

    if (bridgeReport) {
      record('Windows bridge report', 'pass', formatBridgeReportProof(bridgeReport));
    } else {
      record(
        'Windows bridge report',
        desktopAvailable ? 'fail' : 'warn',
        desktopAvailable
          ? 'Desktop bridge is available, but no Windows setup report could be loaded.'
          : 'No generated report found. Open the desktop build or run tools/Scan-AudioSetup.ps1, then load the report.'
      );
    }

    let generatedExportPack = null;
    let generatedSetupSummary = '';

    try {
      const eq = buildAutoTuneEq({ preset: 'iem', trebleSensitivity: 4, bassPreference: 2, footstepFocus: 8 });
      const apo = buildApoConfig(eq);
      record('Autotune generation', eq.length === 10 && apo.includes('Filter 10') ? 'pass' : 'fail', `Generated ${eq.length} EQ bands and APO config.`);
      const pack = buildExportPack({
        apoConfig: apo,
        calibration: { eq, equalizerApoConfig: apo },
        hearing: null,
        dna: null
      });
      generatedExportPack = pack;
      generatedSetupSummary = buildSetupShareText({ devices: [], bridgeReport });
      const exportOk = pack.files['README.txt'].includes('CueForge Setup Pack') && pack.files['equalizer-apo-config.txt'].includes('Filter 10');
      record('Export payloads', exportOk ? 'pass' : 'fail', exportOk ? 'APO config and setup pack files are generated.' : 'Export pack did not include expected files.');
    } catch {
      record('Autotune generation', 'fail', 'Autotune generator threw an error.');
    }

    try {
      const privacyAudit = runPrivacyAudit([
        { name: 'export pack', payload: generatedExportPack },
        { name: 'setup summary', payload: generatedSetupSummary },
        { name: 'self-test results', payload: redactDeep(runLog) }
      ]);
      safeSetJson('cueforge-last-privacy-audit', privacyAudit);
      if (privacyAudit.status === 'pass') {
        localStorage.setItem('cueforge-privacy-audit-passed', 'yes');
      } else {
        localStorage.removeItem('cueforge-privacy-audit-passed');
      }
      record(
        'Privacy export audit',
        privacyAudit.status === 'pass' ? 'pass' : 'fail',
        privacyAudit.status === 'pass'
          ? 'No raw paths, IDs, phones, emails, tokens, passwords, or recovery codes found in generated exports.'
          : `${privacyAudit.leakCount} possible leak${privacyAudit.leakCount === 1 ? '' : 's'} found. Open System Info > Privacy Audit before release.`
      );
    } catch {
      localStorage.removeItem('cueforge-privacy-audit-passed');
      record('Privacy export audit', 'fail', 'Privacy audit could not run.');
    }

    try {
      const choices = {
        footstep_vs_comfort: 'a',
        bass_vs_comms: 'b',
        wide_vs_center: 'b',
        detail_vs_fatigue: 'b',
        direction_vs_body: 'a',
        masking_cut_vs_cue_boost: 'a',
        voice_separation_vs_game_body: 'a',
        repeat_footstep_vs_comfort: 'b',
        repeat_bass_vs_comms: 'a'
      };
      const match = createBlindMatchResult(choices, [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5]);
      record('Sound Match learning', match.eq.length === 10 && match.completedRounds === blindMatchRounds.length && match.applyReadiness.ready ? 'pass' : 'fail', `${match.completedRounds} rounds produce a learned EQ curve with ${match.contradictions} repeat contradictions.`);
    } catch {
      record('Sound Match learning', 'fail', 'Sound Match failed to generate a learned curve.');
    }

    try {
      const tune = createMaskingTune([-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5], 'footsteps-under-explosion');
      record('Tactical masking tune', tune.eq.length === 10 && tune.after >= tune.before ? 'pass' : 'fail', tune.summary);
    } catch {
      record('Tactical masking tune', 'fail', 'Masking tune failed.');
    }

    try {
      const model = createEmptyHearingResults();
      model.left[250] = true;
      model.right[250] = false;
      const score = hearingScore(model);
      const overlay = buildHearingApoOverlay(calculateCompensation(model));
      record('Hearing model', score.answered === 2 && overlay.includes('Preamp') ? 'pass' : 'fail', `Score ${score.answered}/${score.total}; overlay generated.`);
    } catch {
      record('Hearing model', 'fail', 'Hearing model failed.');
    }

    try {
      localStorage.setItem('cueforge-self-test', 'ok');
      const ok = localStorage.getItem('cueforge-self-test') === 'ok';
      localStorage.removeItem('cueforge-self-test');
      record('Local profile storage', ok ? 'pass' : 'fail', ok ? 'Browser local storage works.' : 'Local storage did not persist.');
    } catch {
      record('Local profile storage', 'fail', 'Local storage is blocked.');
    }

    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 440;
      gain.gain.value = 0.0001;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.05);
      setTimeout(() => context.close(), 80);
      record('Headphone tone engine', 'pass', 'Silent safety tone graph created successfully.');
    } catch {
      record('Headphone tone engine', 'warn', 'Tone engine needs a user gesture or browser audio permission.');
    }

    const micProof = await captureMicProof();
    record('Mic capture proof', micProof.status, micProof.detail);

    safeSetJson('cueforge-self-test-results', runLog);
    setRunning(false);
  };

  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="grid two">
      <Panel title="Auto Self Test" icon={TestTube2}>
        <p>Runs the setup checks automatically: browser audio APIs, device enumeration, Windows bridge report, autotune, privacy export audit, hearing model, storage, tone engine, and mic permission.</p>
        <div className="data-card">
          <strong>How this becomes useful</strong>
          <span>Every check is a signal with evidence. Pass, warning, and fail results build confidence for the next setup decision, and the saved self-test log can be replayed inside a redacted report.</span>
        </div>
        <div className="desktop-bridge selftest-bridge-card">
          <strong>{desktopBridgePlan.title}</strong>
          <span>{desktopBridgePlan.summary}</span>
          {desktopInfo && <small>{desktopInfo.reportPath}</small>}
          {!desktopInfo && <small>Developer fix: run `npm run desktop`, then open Auto Detect and click Run Windows scan.</small>}
          <div className="live-actions">
            <button className="ghost" onClick={() => navigator.clipboard?.writeText(desktopBridgeText)}><Copy size={18} /> Copy desktop fix plan</button>
          </div>
        </div>
        <button className="primary" onClick={runSelfTest} disabled={running}>
          <TestTube2 size={18} /> {running ? 'Running...' : 'Run full auto test'}
        </button>
        <div className="metric-row selftest-summary">
          <Metric label="Pass" value={String(counts.pass || 0)} tone="teal" />
          <Metric label="Warnings" value={String(counts.warn || 0)} tone="amber" />
          <Metric label="Fail" value={String(counts.fail || 0)} tone="red" />
        </div>
      </Panel>
      <Panel title="Results" icon={ShieldCheck}>
        <div className="stack">
          {results.length === 0 && <div className="data-card"><strong>No run yet</strong><span>Click Run full auto test.</span></div>}
          {results.map((result) => (
            <div className={`data-card test-${result.status}`} key={result.name}>
              <strong>{result.status.toUpperCase()} - {result.name}</strong>
              <span>{result.detail}</span>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function CalibrationWizard({ onApply }) {
  const [preset, setPreset] = useState('iem');
  const [game, setGame] = useState('valorant');
  const [trebleSensitivity, setTrebleSensitivity] = useState(4);
  const [bassPreference, setBassPreference] = useState(2);
  const [footstepFocus, setFootstepFocus] = useState(8);
  const [micBoom, setMicBoom] = useState(5);
  const [stage, setStage] = useState('ready');
  const [generated, setGenerated] = useState(null);

  const runCalibration = () => {
    const nextEq = buildAutoTuneEq({ preset, trebleSensitivity, bassPreference, footstepFocus });
    const micAdvice = micBoom > 6
      ? 'Reduce HyperX input gain, add light high-pass behavior, and keep noise suppression moderate.'
      : 'HyperX mic target is clean enough. Keep processing light to avoid artifacts.';
    const notes = [
      preset === 'iem' ? 'Using Generic IEM FPS as the base curve.' : 'Using a broader headset-safe base curve.',
      game === 'valorant' ? 'Prioritizing 3kHz and 4.7kHz cues for tactical FPS.' : 'Keeping a more balanced game/media curve.',
      trebleSensitivity > 6 ? 'Treble sensitivity is high, so 8kHz and 16kHz are reduced.' : 'Treble reduction is mild.',
      micAdvice
    ];
    setGenerated({
      eq: nextEq,
      apo: buildApoConfig(nextEq),
      notes,
      micAdvice
    });
    setStage('generated');
  };

  const downloadCalibration = () => {
    if (!generated) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      preset,
      game,
      controls: { trebleSensitivity, bassPreference, footstepFocus, micBoom },
      eq: generated.eq,
      equalizerApoConfig: generated.apo,
      notes: generated.notes
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cueforge-auto-calibration.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="grid two">
      <Panel title="Autotune Wizard" icon={Sparkles}>
        <p>Build a practical calibration from your IEM/headset target, game focus, hearing comfort, and HyperX mic behavior. This does not silently change Windows; it creates an apply/export profile.</p>
        <p className="callout">{playerSafetyWarnings[1]} Exported APO configs include safe preamp headroom before any boost.</p>
        <div className="calibration-grid">
          <label className="field">
            <span>Output target</span>
            <select value={preset} onChange={(event) => setPreset(event.target.value)}>
              <option value="iem">Generic IEM FPS</option>
              <option value="hyperx">HyperX headset style</option>
              <option value="balanced">Balanced media</option>
            </select>
          </label>
          <label className="field">
            <span>Game/use case</span>
            <select value={game} onChange={(event) => setGame(event.target.value)}>
              <option value="valorant">Valorant / CS2 footsteps</option>
              <option value="battle">Warzone / Apex chaos control</option>
              <option value="media">Music / media balance</option>
            </select>
          </label>
          <Slider label="Footstep focus" value={footstepFocus} onChange={setFootstepFocus} />
          <Slider label="Bass preference" value={bassPreference} onChange={setBassPreference} />
          <Slider label="Treble sensitivity" value={trebleSensitivity} onChange={setTrebleSensitivity} />
          <Slider label="HyperX boom/noise" value={micBoom} onChange={setMicBoom} />
        </div>
        <div className="live-actions">
          <button className="primary" onClick={runCalibration}><Sparkles size={18} /> Generate autotune</button>
          {generated && <button className="ghost" onClick={() => onApply(generated.eq)}><CheckCircle2 size={18} /> Apply to EQ Studio</button>}
          {generated && <button className="ghost" onClick={downloadCalibration}><Download size={18} /> Export calibration</button>}
        </div>
        <p className="callout">{stage === 'generated' ? 'Autotune profile generated. Apply it to EQ Studio or export it for setup.' : 'Choose your targets, then generate autotune.'}</p>
      </Panel>
      <Panel title="Generated Calibration" icon={SlidersHorizontal}>
        {!generated && (
          <div className="data-card">
            <strong>No calibration generated yet</strong>
            <span>The output will show recommended EQ, APO config, and troubleshooting notes.</span>
          </div>
        )}
        {generated && (
          <>
            <div className="eq-preview">
              {generated.eq.map((gain, index) => (
                <span key={bands[index]} style={{ height: `${45 + gain * 8}%` }} title={`${bands[index]} ${gain}dB`} />
              ))}
            </div>
            <ul className="clean-list">
              {generated.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
            <pre>{generated.apo}</pre>
          </>
        )}
      </Panel>
    </section>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}: {value}/10</span>
      <input type="range" min="0" max="10" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function LiveAudioLab() {
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(0);
  const [noise, setNoise] = useState(0);
  const [clipRisk, setClipRisk] = useState(0);
  const [voicePresence, setVoicePresence] = useState(0);
  const [signalAnalysis, setSignalAnalysis] = useState(() => createEmptySignalAnalysis());
  const [toneStatus, setToneStatus] = useState('Headphone checks are ready.');
  const audioRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    return () => stopMic();
  }, []);

  const stopMic = () => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioRef.current?.stream?.getTracks().forEach((track) => track.stop());
    audioRef.current?.context?.close?.();
    audioRef.current = null;
    setSignalAnalysis(createEmptySignalAnalysis());
  };

  const startMic = async () => {
    if (running) {
      stopMic();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const time = new Uint8Array(analyser.fftSize);
      const freq = new Uint8Array(analyser.frequencyBinCount);
      audioRef.current = { context, stream, analyser, time, freq };
      setRunning(true);
      const performanceMode = localStorage.getItem('cueforge-gameplay-performance-mode') === 'on';
      let frame = 0;

      const tick = () => {
        frame += 1;
        if (performanceMode && frame % 3 !== 0) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        analyser.getByteTimeDomainData(time);
        analyser.getByteFrequencyData(freq);

        let sum = 0;
        let peak = 0;
        for (const value of time) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
          peak = Math.max(peak, Math.abs(centered));
        }

        const rms = Math.sqrt(sum / time.length);
        const lowBand = avg(freq, 2, 12);
        const voiceBand = avg(freq, 18, 85);
        const highBand = avg(freq, 95, 190);
        const nextAnalysis = analyzeAudioFrame({
          timeDomain: time,
          frequencyData: freq,
          sampleRate: context.sampleRate || 48000
        });

        setLevel(nextAnalysis.level || clamp(Math.round(rms * 220), 0, 100));
        setNoise(nextAnalysis.noiseRisk || clamp(Math.round((lowBand + highBand * 0.45) / 2.2), 0, 100));
        setVoicePresence(nextAnalysis.voicePresence || clamp(Math.round(voiceBand / 2.1), 0, 100));
        setClipRisk(nextAnalysis.clipRisk || clamp(Math.round(Math.max(0, peak - 0.72) * 360), 0, 100));
        setSignalAnalysis(nextAnalysis);
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setToneStatus('Mic permission was blocked, so live mic feedback cannot start yet.');
    }
  };

  const playTone = async (frequency, panValue = 0, duration = 0.9) => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    panner.pan.value = panValue;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
    setToneStatus(`${panValue < 0 ? 'Left' : panValue > 0 ? 'Right' : 'Center'} ${frequency}Hz tone playing.`);
  };

  const playSweep = async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(80, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(12000, context.currentTime + 4);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 4);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 4.05);
    setToneStatus('80Hz to 12kHz sweep playing. Listen for dips, rattles, harsh peaks, or channel imbalance.');
  };

  const verdict =
    signalAnalysis.recommendation || (
      clipRisk > 20
        ? 'Lower mic gain: clipping risk is high.'
        : noise > 55
          ? 'Room or cable noise is high. Try mic gain down and noise suppression light.'
          : voicePresence > 35 && level > 12
            ? 'Voice signal looks healthy for Discord testing.'
            : 'Speak normally into the mic to populate live readings.'
    );
  const micPlan = useMemo(() => buildMicPlan({
    graph: { summary: { inputs: running || level > 0 || noise > 0 || clipRisk > 0 || voicePresence > 0 ? 1 : 0 } },
    metrics: {
      level,
      noiseFloor: noise,
      clipRisk,
      voicePresence
    }
  }), [running, level, noise, clipRisk, voicePresence]);
  const micRecommendation = micPlan.recommendation;

  return (
    <Panel className="wide" title="Live Mic + IEM Test Bench" icon={Activity}>
      <p className="callout">Keep your volume low during headphone checks. Test tones only play after you click a button.</p>
      <div className="live-actions">
        <button className="primary" onClick={startMic}>{running ? 'Stop mic feedback' : 'Start live mic feedback'}</button>
        <button className="ghost" onClick={() => playTone(440, -1)}>Left</button>
        <button className="ghost" onClick={() => playTone(440, 1)}>Right</button>
        <button className="ghost" onClick={() => playTone(1000, 0)}>Center</button>
        <button className="ghost" onClick={playSweep}>Sweep</button>
      </div>
      <div className="meter-grid">
        <LiveMeter label="Mic level" value={level} />
        <LiveMeter label="Voice presence" value={voicePresence} />
        <LiveMeter label="Noise estimate" value={noise} />
        <LiveMeter label="Clip risk" value={clipRisk} danger />
      </div>
      <div className="metric-row analyzer-summary">
        <Metric label="FPS clarity" value={`${signalAnalysis.fpsClarity}%`} tone={signalAnalysis.fpsClarity > 62 ? 'teal' : 'amber'} />
        <Metric label="Comms ready" value={`${signalAnalysis.commsReadiness}%`} tone={signalAnalysis.commsReadiness > 62 ? 'teal' : 'amber'} />
        <Metric label="Confidence" value={`${signalAnalysis.tuningConfidence}%`} tone={signalAnalysis.tuningConfidence > 62 ? 'teal' : 'amber'} />
      </div>
      <div className="analyzer-grid">
        <div className="data-card">
          <strong>Likely source</strong>
          <span>{signalAnalysis.probableCause.replaceAll('-', ' ')}</span>
          <small>{signalAnalysis.suggestedTweak}</small>
        </div>
        <div className="data-card">
          <strong>Signal fingerprint</strong>
          <span>{signalAnalysis.spectralCentroidHz}Hz centroid / {signalAnalysis.spectralRolloffHz}Hz rolloff</span>
          <small>Dynamic range {signalAnalysis.dynamicRange}% / flatness {signalAnalysis.spectralFlatness}</small>
        </div>
      </div>
      <div className="analyzer-grid">
        <div className="data-card">
          <strong>Mic status</strong>
          <span>{micRecommendation.micStatus.replace(/^\w/, (char) => char.toUpperCase())}</span>
          <small>Noise floor: {micRecommendation.noiseFloor} / Clip risk: {micRecommendation.clipRisk}</small>
        </div>
        <div className="data-card">
          <strong>Mic engine plan</strong>
          <span>{micRecommendation.recommendedAction}</span>
          <small>{micRecommendation.futureModule}</small>
        </div>
      </div>
      <div className="band-radar" aria-label="live analyzer bands">
        {signalBands.map((band) => (
          <div className="band-bar" key={band.id}>
            <span>{band.label}</span>
            <div><i style={{ width: `${signalAnalysis.bands[band.id] || 0}%` }} /></div>
            <strong>{signalAnalysis.bands[band.id] || 0}%</strong>
          </div>
        ))}
      </div>
      <p className="callout">{verdict}</p>
      <p>{toneStatus}</p>
    </Panel>
  );
}

function LiveMeter({ label, value, danger = false }) {
  return (
    <div className="live-meter">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="meter-track"><span className={danger && value > 20 ? 'danger' : ''} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function avg(values, start, end) {
  let total = 0;
  let count = 0;
  for (let i = start; i < Math.min(end, values.length); i += 1) {
    total += values[i];
    count += 1;
  }
  return count ? total / count : 0;
}

function AutoDetect({ onApplyProfile, onAutoSwitchProfile, onUpdateChain }) {
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('Auto scan starts when this page opens.');
  const [bridgeReport, setBridgeReport] = useState(null);
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [desktopBusy, setDesktopBusy] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');
  const [setupGame, setSetupGame] = useState('Tarkov / Siege / COD');
  const [budgetTier, setBudgetTier] = useState('no-spend');
  const [deviceAliases, setDeviceAliases] = useState(() => getSavedJson(DEVICE_ALIAS_KEY) || {});
  const [savedGameProfiles, setSavedGameProfiles] = useState(() => getSavedJson(GAME_PROFILE_KEY) || []);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(() => localStorage.getItem('cueforge-auto-switch-game-profile') !== 'off');
  const [gameProfileDraft, setGameProfileDraft] = useState({
    game: 'Tarkov / Siege / COD',
    sourceProfile: 'competitiveFps',
    matchHints: 'tarkov, siege, cod'
  });
  const lastAutoSwitchRef = useRef('');
  const desktopReady = Boolean(desktopInfo || window.cueforgeDesktop?.isDesktop);
  const deviceRecovery = useMemo(() => buildPermissionRecovery({
    feature: 'device-scan',
    state: permissionState,
    desktopReady
  }), [permissionState, desktopReady]);
  const autoDetectReport = useMemo(() => buildAutoDetectReport({
    browserDevices: devices,
    bridgeReport,
    permissionState,
    desktopReady
  }), [devices, bridgeReport, permissionState, desktopReady]);
  const autoDetectSummary = useMemo(() => summarizeAutoDetectReport(autoDetectReport), [autoDetectReport]);
  const namedDevices = useMemo(() => applyDeviceAliases(devices, deviceAliases), [devices, deviceAliases]);
  const gameProfileOptions = useMemo(() => mergeGameProfiles(savedGameProfiles), [savedGameProfiles]);
  const activeGameMatch = useMemo(() => detectActiveGameProfile({
    bridgeReport,
    savedProfiles: savedGameProfiles
  }), [bridgeReport, savedGameProfiles]);

  useEffect(() => {
    scanDevices({ auto: true });
    if (window.cueforgeDesktop?.info) {
      window.cueforgeDesktop.info()
        .then((info) => {
          setDesktopInfo(info);
          onUpdateChain?.({
            autoDetectReport: buildAutoDetectReport({ browserDevices: devices, bridgeReport, permissionState, desktopReady: Boolean(info) }),
            desktopReady: Boolean(info)
          });
        })
        .catch(() => setDesktopInfo(null));
    }
  }, []);

  useEffect(() => {
    if (!autoSwitchEnabled || !activeGameMatch) return;
    const switchKey = `${activeGameMatch.game}|${activeGameMatch.sourceProfile}|${activeGameMatch.matchedHint}`;
    if (lastAutoSwitchRef.current === switchKey) return;
    lastAutoSwitchRef.current = switchKey;
    setSetupGame(activeGameMatch.game);
    onAutoSwitchProfile?.(activeGameMatch);
    setStatus(`Running game detected: ${activeGameMatch.game}. CueForge switched to ${activeGameMatch.sourceProfile}.`);
  }, [activeGameMatch, autoSwitchEnabled, onAutoSwitchProfile]);

  const updateAlias = (deviceKey, label) => {
    setDeviceAliases((current) => {
      const next = saveDeviceAlias(current, deviceKey, label);
      safeSetJson(DEVICE_ALIAS_KEY, next);
      return next;
    });
  };

  const updateSetupGame = (nextGame) => {
    setSetupGame(nextGame);
    const saved = gameProfileOptions.find((profile) => profile.game === nextGame);
    setGameProfileDraft({
      game: nextGame,
      sourceProfile: saved?.sourceProfile || 'competitiveFps',
      matchHints: (saved?.matchHints || [nextGame]).join(', ')
    });
  };

  const saveGameProfile = () => {
    const next = upsertGameProfile(savedGameProfiles, {
      game: gameProfileDraft.game,
      sourceProfile: gameProfileDraft.sourceProfile,
      matchHints: gameProfileDraft.matchHints
    });
    setSavedGameProfiles(next);
    safeSetJson(GAME_PROFILE_KEY, next);
    setSetupGame(gameProfileDraft.game);
    setStatus(`Saved ${gameProfileDraft.game} profile. CueForge will match it from running-game or process hints.`);
  };

  const toggleAutoSwitch = (enabled) => {
    setAutoSwitchEnabled(enabled);
    localStorage.setItem('cueforge-auto-switch-game-profile', enabled ? 'on' : 'off');
    setStatus(enabled ? 'Auto-switch is on. CueForge will switch profiles when the Windows scan sees a saved game.' : 'Auto-switch is off. Detected games will show as suggestions only.');
  };

  const scanDevices = async ({ auto = false } = {}) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setPermissionState('unsupported');
      setStatus('This browser does not expose audio device detection.');
      return;
    }

    try {
      setPermissionState('prompt');
      setStatus(auto ? 'Auto-requesting mic permission for real device names.' : 'Requesting mic permission so device names can be read.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      const found = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = found.filter((device) => device.kind.includes('audio'));
      const nextReport = buildAutoDetectReport({
        browserDevices: audioDevices,
        bridgeReport,
        permissionState: 'granted',
        desktopReady
      });
      setDevices(audioDevices);
      onUpdateChain?.({ devices: audioDevices, bridgeReport, autoDetectReport: nextReport, desktopReady });
      setPermissionState('granted');
      setStatus('Scan complete. Device names are read locally in your browser.');
    } catch {
      let found = [];
      try {
        found = await navigator.mediaDevices.enumerateDevices();
      } catch {
        found = [];
      }
      const audioDevices = found.filter((device) => device.kind.includes('audio'));
      const nextReport = buildAutoDetectReport({
        browserDevices: audioDevices,
        bridgeReport,
        permissionState: 'blocked',
        desktopReady
      });
      setDevices(audioDevices);
      onUpdateChain?.({ devices: audioDevices, bridgeReport, autoDetectReport: nextReport, desktopReady });
      setPermissionState('blocked');
      setStatus('Permission was blocked or skipped, so some device names may be hidden. Use the browser permission icon near the address bar, allow microphone, then scan again.');
    }
  };

  const labels = namedDevices.map((device) => device.displayLabel.toLowerCase()).join(' ');
  const hyperx = labels.includes('hyperx') || labels.includes('hyper x');
  const iem = labels.includes('iem') || labels.includes('usb-c') || labels.includes('dac') || labels.includes('headphones');
  const bridgeHyperx = Boolean(bridgeReport?.matches?.hyperx);
  const bridgeIem = Boolean(bridgeReport?.matches?.iemOrDac);
  const apoInstalled = Boolean(bridgeReport?.tools?.equalizerApo?.installed);
  const peaceInstalled = Boolean(bridgeReport?.tools?.peace?.installed);
  const sonarInstalled = Boolean(bridgeReport?.tools?.steelSeriesSonar?.installed);
  const virtualRouting = Boolean(bridgeReport?.tools?.vbCable?.installed || bridgeReport?.tools?.voicemeeter?.installed || bridgeReport?.matches?.virtualRouting);
  const setupShareText = useMemo(() => buildSetupShareText({ devices: namedDevices, bridgeReport }), [namedDevices, bridgeReport]);
  const setupIntelligence = useMemo(() => buildSetupIntelligence({
    devices: namedDevices,
    bridgeReport,
    game: setupGame,
    budgetTier,
    desktopReady
  }), [namedDevices, bridgeReport, setupGame, budgetTier, desktopReady]);
  const setupIntelligenceText = useMemo(() => buildSetupIntelligenceText(setupIntelligence), [setupIntelligence]);
  const redditTesterAsk = useMemo(
    () => buildRedditSafeDraft({
      mode: 'community',
      summary: null,
      appUrl: publicRelease.app,
      discordUrl: socialLinks.Discord
    }),
    []
  );

  const importBridgeReport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextReport = buildAutoDetectReport({
        browserDevices: devices,
        bridgeReport: parsed,
        permissionState,
        desktopReady
      });
      setBridgeReport(parsed);
      onUpdateChain?.({ devices, bridgeReport: parsed, autoDetectReport: nextReport, desktopReady });
      setStatus('Imported Windows bridge report locally.');
    } catch {
      setStatus('Could not read that bridge report. Make sure it is the JSON from Scan-AudioSetup.ps1.');
    }
  };

  const loadGeneratedBridgeReport = async () => {
    try {
      const parsed = await getGeneratedBridgeReport();
      if (!parsed) throw new Error('missing report');
      const nextReport = buildAutoDetectReport({
        browserDevices: devices,
        bridgeReport: parsed,
        permissionState,
        desktopReady
      });
      setBridgeReport(parsed);
      onUpdateChain?.({ devices, bridgeReport: parsed, autoDetectReport: nextReport, desktopReady });
      setStatus('Loaded generated Windows bridge report locally.');
    } catch {
      setStatus('No generated bridge report found yet. Run tools/Scan-AudioSetup.ps1, then try again.');
    }
  };

  const runDesktopBridgeScan = async () => {
    if (!window.cueforgeDesktop?.scanAudioSetup) {
      setStatus('Desktop scan is only available in the CueForge desktop shell.');
      return;
    }

    setDesktopBusy(true);
    setStatus('Running Windows audio setup scan. This reads device/tool info and writes a local report.');
    try {
      const result = await window.cueforgeDesktop.scanAudioSetup();
      if (!result?.ok) {
        setStatus(result?.error || 'Desktop scan failed.');
        return;
      }
      const nextReport = buildAutoDetectReport({
        browserDevices: devices,
        bridgeReport: result.report,
        permissionState,
        desktopReady: true
      });
      setBridgeReport(result.report);
      onUpdateChain?.({ devices, bridgeReport: result.report, autoDetectReport: nextReport, desktopReady: true });
      setStatus(`Desktop scan complete. Report saved to ${result.reportPath}.`);
    } catch {
      setStatus('Desktop scan failed before a report could be created.');
    } finally {
      setDesktopBusy(false);
    }
  };

  const openBridgeFolder = async () => {
    if (!window.cueforgeDesktop?.openBridgeFolder) return;
    await window.cueforgeDesktop.openBridgeFolder();
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard?.writeText(text);
      setStatus(`${label} copied. Review it before posting.`);
    } catch {
      setStatus(`${label} is ready. Select the text and copy it manually if clipboard is blocked.`);
    }
  };

  const applySuggestedProfile = () => {
    onApplyProfile?.({
      game: setupGame,
      sourceProfile: setupIntelligence.gamePlan.sourceProfile
    });
    setStatus(`${setupIntelligence.gamePlan.profile} applied inside CueForge. Review EQ Studio before exporting APO.`);
  };

  return (
    <section className="grid two">
      <Panel title="Connected Device Scanner" icon={Search}>
        <p>{status}</p>
        <button className="primary" onClick={() => scanDevices()}><Search size={18} /> Scan audio devices</button>
        <div className={`data-card permission-recovery recovery-${deviceRecovery.level}`}>
          <strong>{deviceRecovery.title}</strong>
          <span>{deviceRecovery.detail}</span>
          <small>{formatPermissionRecoverySteps(deviceRecovery)}</small>
        </div>
        <div className="stack device-list">
          {devices.length === 0 && <div className="data-card"><strong>No scan yet</strong><span>The app auto-scans on open. If nothing appears, click scan and allow microphone permission.</span></div>}
          {namedDevices.map((device, index) => (
            <div className="data-card device-name-card" key={device.deviceKey}>
              <strong>{device.displayLabel}</strong>
              <span>{String(device.kind || '').replace('audio', 'audio ')}</span>
              <small>{device.needsAlias ? 'Browser hid the exact name. Add a friendly name so testers know which one to use.' : 'Noisy browser/Windows label cleaned locally. Edit it if this is not the right device.'}</small>
              <label className="field compact-field">
                <span>Friendly name</span>
                <input
                  value={device.alias}
                  onChange={(event) => updateAlias(device.deviceKey, event.target.value)}
                  placeholder={device.cleanedLabel}
                  aria-label={`Friendly name for ${device.cleanedLabel || `device ${index + 1}`}`}
                />
              </label>
              {device.hints.length > 0 && <em>{device.hints.join(' / ')}</em>}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Auto Setup Links" icon={Download}>
        {desktopInfo && (
          <div className="desktop-bridge">
            <strong>Desktop shell active</strong>
            <span>Native Windows scan available. Mic permission is granted inside CueForge, and device/tool detection runs locally.</span>
            <small>{desktopInfo.reportPath}</small>
            <div className="live-actions">
              <button className="primary" onClick={runDesktopBridgeScan} disabled={desktopBusy}>
                <Search size={18} /> {desktopBusy ? 'Scanning...' : 'Run Windows scan'}
              </button>
              <button className="ghost" onClick={openBridgeFolder}>Open report folder</button>
            </div>
          </div>
        )}
        <div className="detect-result">
          <Metric label="HyperX mic" value={hyperx || bridgeHyperx ? 'Seen' : 'Ready'} tone={hyperx || bridgeHyperx ? 'teal' : 'amber'} />
          <Metric label="IEM/DAC output" value={iem || bridgeIem ? 'Likely' : 'Manual'} tone={iem || bridgeIem ? 'teal' : 'amber'} />
          <Metric label="Equalizer APO" value={apoInstalled ? 'Found' : 'Link'} tone={apoInstalled ? 'teal' : 'amber'} />
          <Metric label="Peace UI" value={peaceInstalled ? 'Found' : 'Optional'} tone={peaceInstalled ? 'teal' : 'amber'} />
          <Metric label="Sonar" value={sonarInstalled ? 'Found' : 'Optional'} tone={sonarInstalled ? 'teal' : 'amber'} />
          <Metric label="Virtual routing" value={virtualRouting ? 'Found' : 'Optional'} tone={virtualRouting ? 'teal' : 'amber'} />
          <Metric label="Enhancers" value={setupIntelligence.detected.companionLayers.length ? `${setupIntelligence.detected.companionLayers.length} seen` : 'Scan'} tone={setupIntelligence.detected.companionLayers.length ? 'teal' : 'amber'} />
        </div>
        <label className="bridge-import">
          <span>Import Windows bridge report</span>
          <input type="file" accept="application/json,.json" aria-label="Import Windows bridge report" onChange={importBridgeReport} />
        </label>
        <button className="ghost" onClick={loadGeneratedBridgeReport}>Load generated bridge report</button>
        {bridgeReport && (
          <div className="data-card">
            <strong>Windows bridge report loaded</strong>
            <span>{bridgeReport.soundDevices?.length || 0} sound devices and {bridgeReport.mediaDevices?.length || 0} media devices found.</span>
            <small>{bridgeReport.tools?.equalizerApo?.installed ? 'Equalizer APO install detected.' : 'Equalizer APO config target not found yet.'}</small>
          </div>
        )}
        <ul className="clean-list">
          <li>Use the built-in Generic IEM FPS profile as your first output config.</li>
          <li>Use HyperX mic starting point: 80-90% input gain, reduce if clipping appears.</li>
          <li>Export APO config from EQ Studio, then paste/import into Equalizer APO or Peace.</li>
          <li>{desktopInfo ? 'Desktop bridge: run Windows scan here, then use the loaded report for real device names.' : 'Optional native bridge: run `tools/Scan-AudioSetup.ps1`, then import `cueforge-audio-setup-report.json` here.'}</li>
        </ul>
        <div className="link-grid">
          <a href="https://sourceforge.net/projects/equalizerapo/" target="_blank" rel="noreferrer">Equalizer APO</a>
          <a href="https://sourceforge.net/projects/peace-equalizer-apo-extension/" target="_blank" rel="noreferrer">Peace UI</a>
          <a href="https://github.com/jaakkopasanen/AutoEq" target="_blank" rel="noreferrer">AutoEq data</a>
          <a href="https://steelseries.com/gg/sonar" target="_blank" rel="noreferrer">SteelSeries Sonar</a>
          <a href="https://vb-audio.com/Cable/" target="_blank" rel="noreferrer">VB-CABLE</a>
        </div>
      </Panel>
      <Panel className="wide" title="Auto Detect v2 Report" icon={ShieldCheck}>
        <p>Normalized setup report. CueForge uses this same shape for Chain Graph, readiness, recommendations, exports, and later desktop/native setup work.</p>
        <div className="metric-row selftest-summary">
          <Metric label="Source" value={autoDetectReport.source} tone={autoDetectReport.source.includes('desktop') ? 'teal' : 'amber'} />
          <Metric label="Confidence" value={`${autoDetectReport.confidence.score}%`} tone={autoDetectReport.confidence.score >= 70 ? 'teal' : 'amber'} />
          <Metric label="Inputs" value={String(autoDetectReport.devices.browserInputs.length + autoDetectReport.devices.windowsCaptureDevices.length)} tone="teal" />
          <Metric label="Outputs" value={String(autoDetectReport.devices.browserOutputs.length + autoDetectReport.devices.windowsRenderDevices.length)} tone="teal" />
          <Metric label="Risks" value={String(autoDetectReport.risks.length)} tone={autoDetectReport.risks.some((risk) => risk.severity === 'high') ? 'red' : 'amber'} />
        </div>
        <div className={`data-card evidence-boundary ${autoDetectReport.confidence.requiresExplicitScan ? 'partial' : 'native'}`}>
          <strong>{autoDetectReport.confidence.requiresExplicitScan ? 'Browser-only partial evidence' : 'Native high-confidence evidence'}</strong>
          <span>{autoDetectReport.confidence.reasons.join(', ') || 'CueForge is waiting on device evidence.'}</span>
          <small>{autoDetectReport.confidence.requiresExplicitScan ? 'Run the desktop bridge scan or import the Windows report before calling the chain fully detected.' : 'Windows bridge data is loaded, so endpoint, companion, and route warnings are stronger.'}</small>
        </div>
        <div className="copy-grid">
          <div className="data-card">
            <strong>Detected</strong>
            <ul className="clean-list">
              {autoDetectSummary.detected.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="data-card">
            <strong>Risk</strong>
            <ul className="clean-list">
              {autoDetectSummary.risks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="data-card">
            <strong>Recommended</strong>
            <ul className="clean-list">
              {autoDetectSummary.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className="data-card">
          <strong>Companion detection</strong>
          <span>
            {Object.values(autoDetectReport.companions)
              .filter((companion) => companion.detected === true)
              .map((companion) => companion.label)
              .join(', ') || 'No companion audio layer confirmed yet.'}
          </span>
          <small>Browser mode cannot prove installed Windows audio apps. Desktop bridge data increases confidence.</small>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={() => copyText(JSON.stringify(autoDetectReport, null, 2), 'Normalized Auto Detect report')}><Copy size={18} /> Copy v2 report</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-auto-detect-report.json', JSON.stringify(autoDetectReport, null, 2))}><Download size={18} /> Export JSON</button>
        </div>
      </Panel>
      <Panel className="wide" title="Setup Intelligence" icon={BrainCircuit}>
        <p>{setupIntelligence.promise}</p>
        <div className="setup-intel-controls">
          <label className="field">
            <span>Game focus</span>
            <select value={setupGame} onChange={(event) => updateSetupGame(event.target.value)}>
              {setupIntelligenceOptions.games.map((game) => <option key={game}>{game}</option>)}
              {gameProfileOptions
                .filter((profile) => !setupIntelligenceOptions.games.includes(profile.game))
                .map((profile) => <option key={profile.id}>{profile.game}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Budget lane</span>
            <select value={budgetTier} onChange={(event) => setBudgetTier(event.target.value)}>
              {setupIntelligenceOptions.budgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.label}</option>)}
            </select>
          </label>
        </div>
        <div className="data-card auto-switch-card">
          <strong>{activeGameMatch ? `Detected game: ${activeGameMatch.game}` : 'Game auto-switch ready'}</strong>
          <span>{activeGameMatch ? `Matched ${activeGameMatch.matchedHint}; profile ${activeGameMatch.sourceProfile}.` : 'Run the Windows scan while a game is open, then CueForge can switch to the saved game profile.'}</span>
          <label>
            <input type="checkbox" checked={autoSwitchEnabled} onChange={(event) => toggleAutoSwitch(event.target.checked)} />
            <span>Auto-switch when a saved game is detected</span>
          </label>
        </div>
        <div className="data-card game-profile-editor">
          <strong>Saved game profile</strong>
          <span>Map a game or process name to the CueForge profile it should use when detected.</span>
          <div className="setup-intel-controls">
            <label className="field">
              <span>Game/profile name</span>
              <input
                value={gameProfileDraft.game}
                onChange={(event) => setGameProfileDraft({ ...gameProfileDraft, game: event.target.value })}
                placeholder="Example: Valorant / CS2"
              />
            </label>
            <label className="field">
              <span>CueForge profile</span>
              <select
                value={gameProfileDraft.sourceProfile}
                onChange={(event) => setGameProfileDraft({ ...gameProfileDraft, sourceProfile: event.target.value })}
              >
                {Object.entries(localSourceProfiles).map(([id, profile]) => <option key={id} value={id}>{profile.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Game/process hints</span>
              <input
                value={gameProfileDraft.matchHints}
                onChange={(event) => setGameProfileDraft({ ...gameProfileDraft, matchHints: event.target.value })}
                placeholder="valorant, cs2, r5apex"
              />
            </label>
          </div>
          <div className="live-actions">
            <button className="primary" onClick={saveGameProfile}><Save size={18} /> Save game profile</button>
          </div>
          <div className="module-list game-profile-list">
            {gameProfileOptions.slice(0, 6).map((profile) => (
              <div className="module-row" key={profile.id}>
                <Gamepad2 size={17} />
                <div>
                  <strong>{profile.game}</strong>
                  <span>{localSourceProfiles[profile.sourceProfile]?.name || profile.sourceProfile}</span>
                  <small>{profile.matchHints.slice(0, 4).join(', ')}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="Confidence" value={`${setupIntelligence.confidence}%`} tone={setupIntelligence.confidence >= 70 ? 'teal' : 'amber'} />
          <Metric label="Mic/input" value={setupIntelligence.detected.namedMic} tone={setupIntelligence.detected.inputs ? 'teal' : 'amber'} />
          <Metric label="Output" value={setupIntelligence.detected.namedOutput} tone={setupIntelligence.detected.outputs ? 'teal' : 'amber'} />
          <Metric label="Layers" value={String(setupIntelligence.detected.companionLayers.length)} tone={setupIntelligence.detected.companionLayers.length ? 'teal' : 'amber'} />
        </div>
        <div className="setup-intel-map">
          {setupIntelligence.chainStages.map((stage) => (
            <div className={`setup-stage stage-${stage.status}`} key={stage.id}>
              <span>{stage.label}</span>
              <strong>{stage.status}</strong>
              <small>{stage.detail}</small>
              <em>{stage.action}</em>
            </div>
          ))}
        </div>
        <div className="copy-grid">
          <div className="data-card">
            <strong>{setupIntelligence.gamePlan.profile}</strong>
            <span>{setupIntelligence.gamePlan.goal}</span>
            <small>{setupIntelligence.gamePlan.caution}</small>
          </div>
          <div className="data-card">
            <strong>{setupIntelligence.budgetPlan.label}</strong>
            <span>{setupIntelligence.budgetPlan.plan}</span>
            <small>{setupIntelligence.budgetPlan.proof}</small>
          </div>
        </div>
        <div className="recommendation-grid">
          {setupIntelligence.recommendationCards.map((card) => (
            <div className="data-card" key={card.id}>
              <strong>{card.title}</strong>
              <span>{card.detail}</span>
              <small>{card.proof}</small>
            </div>
          ))}
        </div>
        <div className="proof-gate-grid">
          {setupIntelligence.proofGates.map((gate) => (
            <div className={`proof-gate ${gate.ready ? 'ready' : 'needed'}`} key={gate.id}>
              <span>{gate.label}</span>
              <strong>{gate.status}</strong>
              <small>{gate.action}</small>
            </div>
          ))}
        </div>
        <div className="module-list">
          {setupIntelligence.actions.map((action) => (
            <div className="module-row" key={action}>
              <CheckCircle2 size={17} />
              <div>
                <strong>Next move</strong>
                <span>{action}</span>
              </div>
            </div>
          ))}
          {setupIntelligence.riskFlags.map((warning) => (
            <div className={`module-row warning-row severity-${warning.severity}`} key={warning.id}>
              <ShieldCheck size={17} />
              <div>
                <strong>{warning.title}</strong>
                <span>{warning.detail}</span>
                <small>{warning.action}</small>
              </div>
              <em>{warning.severity}</em>
            </div>
          ))}
        </div>
        <div className="data-card">
          <strong>Proof label</strong>
          <span>{setupIntelligence.testedProof}</span>
          <small>Recommendations stay marked as starter guidance until local scan plus real match feedback prove the setup.</small>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={applySuggestedProfile}><SlidersHorizontal size={18} /> Apply starting profile</button>
          <button className="primary" onClick={() => copyText(setupIntelligenceText, 'Setup intelligence plan')}><Copy size={18} /> Copy setup plan</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-setup-intelligence.txt', setupIntelligenceText)}><Download size={18} /> Export plan</button>
        </div>
      </Panel>
      <Panel className="wide" title="Redacted Setup Summary" icon={Save}>
        <p>Share this when someone asks what setup was tested. It uses browser scan data plus the Windows bridge report when available.</p>
        <div className="data-card quick-path">
          <strong>What to do</strong>
          <span>1. Scan devices or run the Windows scan. 2. Check the summary. 3. Copy only the redacted text below.</span>
          <small>No raw device IDs, group IDs, local paths, phone numbers, emails, tokens, or recovery info.</small>
        </div>
        <div className="copy-grid">
          <div className="data-card">
            <strong>Detected setup summary</strong>
            <pre>{setupShareText}</pre>
            <button className="primary" onClick={() => copyText(setupShareText, 'Setup summary')}>Copy setup summary</button>
          </div>
          <div className="data-card">
            <strong>Reddit-safe tester ask</strong>
            <pre>{redditTesterAsk}</pre>
            <button className="ghost" onClick={() => copyText(redditTesterAsk, 'Reddit tester ask')}>Copy Reddit ask</button>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function DriverLayerPage({ apoConfig }) {
  const [bridgeReport, setBridgeReport] = useState(null);
  const [status, setStatus] = useState('Load a Windows bridge report to see which companion audio layers are installed.');
  const [draftStatus, setDraftStatus] = useState('Desktop mode can save APO drafts into a CueForge folder. Browser mode can still copy or download config text.');

  const loadReport = async () => {
    const report = await getGeneratedBridgeReport();
    if (!report) {
      setStatus('No bridge report found yet. Run Auto Detect > Windows scan in desktop mode, or import the report there.');
      return;
    }
    setBridgeReport(report);
    setStatus('Driver layer scan loaded.');
  };

  const saveApoDraft = async () => {
    if (!window.cueforgeDesktop?.saveApoDraft) {
      setDraftStatus('Open CueForge in the desktop shell to save APO drafts through the native helper.');
      return;
    }
    const result = await window.cueforgeDesktop.saveApoDraft(apoConfig);
    if (!result?.ok) {
      setDraftStatus(result?.error || 'Could not save APO draft.');
      return;
    }
    setDraftStatus(`APO draft saved: ${result.file}`);
  };

  const openApoDraftFolder = async () => {
    if (!window.cueforgeDesktop?.openApoDraftFolder) {
      setDraftStatus('Desktop folder open is available in the CueForge desktop shell.');
      return;
    }
    const result = await window.cueforgeDesktop.openApoDraftFolder();
    setDraftStatus(result?.ok ? `Opened APO draft folder: ${result.folder}` : 'Could not open APO draft folder.');
  };

  useEffect(() => {
    loadReport();
  }, []);

  const toolState = {
    'Equalizer APO': Boolean(bridgeReport?.tools?.equalizerApo?.installed),
    'Peace UI': Boolean(bridgeReport?.tools?.peace?.installed),
    'SteelSeries Sonar': Boolean(bridgeReport?.tools?.steelSeriesSonar?.installed),
    'FxSound / OEM enhancers': Boolean(bridgeReport?.tools?.fxSound?.installed || bridgeReport?.tools?.nahimic?.installed || bridgeReport?.tools?.realtekAudio?.installed),
    'Spatial layers': Boolean(bridgeReport?.tools?.razerThx?.installed || bridgeReport?.tools?.dolbyAccess?.installed || bridgeReport?.tools?.dtsSoundUnbound?.installed),
    'Mic processors': Boolean(bridgeReport?.tools?.nvidiaBroadcast?.installed || bridgeReport?.tools?.elgatoWaveLink?.installed || bridgeReport?.tools?.logitechGHub?.installed || bridgeReport?.tools?.corsairIcue?.installed || bridgeReport?.tools?.voicemod?.installed),
    'VB-CABLE / Voicemeeter': Boolean(bridgeReport?.tools?.vbCable?.installed || bridgeReport?.tools?.voicemeeter?.installed || bridgeReport?.matches?.virtualRouting),
    'CueForge Native APO': false
  };

  return (
    <section className="grid two">
      <Panel className="wide" title="Driver Layer Strategy" icon={SlidersHorizontal}>
        <p>{status}</p>
        <div className="live-actions">
          <button className="primary" onClick={loadReport}><Search size={18} /> Refresh layer scan</button>
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="APO engine" value={toolState['Equalizer APO'] ? 'Found' : 'Add'} tone={toolState['Equalizer APO'] ? 'teal' : 'amber'} />
          <Metric label="Mixer layer" value={toolState['SteelSeries Sonar'] ? 'Found' : 'Optional'} tone={toolState['SteelSeries Sonar'] ? 'teal' : 'amber'} />
          <Metric label="Routing layer" value={toolState['VB-CABLE / Voicemeeter'] ? 'Found' : 'Later'} tone={toolState['VB-CABLE / Voicemeeter'] ? 'teal' : 'amber'} />
        </div>
      </Panel>
      <Panel title="Desktop APO Drafts" icon={Save}>
        <p>Use this as the legal, explicit apply path: CueForge saves a reviewed draft locally, then you choose whether to paste it into Equalizer APO or Peace.</p>
        <div className="live-actions">
          <button className="primary" onClick={saveApoDraft}><Save size={18} /> Save APO draft</button>
          <button className="ghost" onClick={openApoDraftFolder}><Download size={18} /> Open drafts folder</button>
        </div>
        <p className="callout">{draftStatus}</p>
        <pre>{apoConfig}</pre>
      </Panel>
      <Panel className="wide" title="Spatial Honesty" icon={Headphones}>
        <p>{spatialTruthWarning}</p>
        <div className="recommendation-grid">
          {honestSpatialModes.map((mode) => (
            <div className="data-card" key={mode.id}>
              <strong>{mode.label}</strong>
              <span>{mode.promise}</span>
              <small>{mode.futureOnly ? 'Future SDK path' : mode.bestFor.join(', ')}</small>
            </div>
          ))}
        </div>
      </Panel>
      {driverLayers.map((layer) => (
        <Panel title={layer.name} icon={SlidersHorizontal} key={layer.name}>
          <div className="data-card">
            <strong>{toolState[layer.name] ? 'Detected' : layer.name === 'CueForge Native APO' ? 'Future build' : 'Not detected yet'}</strong>
            <span>{layer.role}</span>
          </div>
          <p>{layer.fit}</p>
          <ul className="clean-list">
            <li>{layer.action}</li>
            <li>{layer.risk}</li>
          </ul>
          <a className="button-link" href={layer.url} target="_blank" rel="noreferrer">Open source</a>
        </Panel>
      ))}
    </section>
  );
}

function PandaNotesPage({ uiNotes = [], onOpen, onClearUiNotes }) {
  const [mode, setMode] = useState('developer');
  const [selectedId, setSelectedId] = useState('');
  const [packetStatus, setPacketStatus] = useState('Developer packet is ready when notes exist.');
  const uiSummary = summarizeUiFeedback(uiNotes);
  const repairCheck = useMemo(() => buildUiFeedbackRepairCheck(uiNotes), [uiNotes]);
  const repairPacket = useMemo(() => buildUiFeedbackRepairPacket(uiNotes), [uiNotes]);
  const actions = repairCheck.actions || [];
  const selectedAction = actions.find((action) => action.id === selectedId) || actions[0] || null;
  const selectedSnippet = selectedAction?.snippet;
  const audienceCards = [
    {
      key: 'alpha',
      label: 'Alpha tester',
      headline: 'Catch first-run breaks',
      detail: 'Right-click confusing, cramped, broken, or missing-feedback areas during setup, mic, EQ, and report flows.'
    },
    {
      key: 'beta',
      label: 'Beta tester',
      headline: 'Prove repeat issues',
      detail: 'Pair Panda Notes with Beta Check-in, Player Trial, or Report Lab so repeated session feedback becomes reproducible.'
    },
    {
      key: 'developer',
      label: 'Developer',
      headline: 'Turn notes into fixes',
      detail: 'Select a target issue, inspect the attached note evidence and source snippet, then run the focused test plan.'
    }
  ];
  const activeAudience = audienceCards.find((item) => item.key === mode) || audienceCards[2];

  useEffect(() => {
    if (!actions.length) {
      setSelectedId('');
      return;
    }
    if (!actions.some((action) => action.id === selectedId)) {
      setSelectedId(actions[0].id);
    }
  }, [actions, selectedId]);

  const copyRepairPacket = async () => {
    try {
      await navigator.clipboard?.writeText(repairPacket);
      setPacketStatus('Repair packet copied. Paste it into the developer workflow, then test the fix.');
    } catch {
      setPacketStatus('Clipboard was blocked. Export the repair packet instead.');
    }
  };

  return (
    <section className="grid two panda-notes-grid">
      <Panel className="wide panda-notes-hero" title="Panda Notes Console" icon={Bug}>
        <div className="panda-mode-tabs source-tabs">
          {audienceCards.map((item) => (
            <button className={mode === item.key ? 'selected' : ''} key={item.key} onClick={() => setMode(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="panda-audience-card">
          <strong>{activeAudience.headline}</strong>
          <span>{activeAudience.detail}</span>
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="Notes" value={String(uiSummary.total)} tone={uiSummary.total ? 'teal' : 'amber'} />
          <Metric label="Top tag" value={uiSummary.topTag} tone={uiSummary.total ? 'teal' : 'amber'} />
          <Metric label="Repair actions" value={String(repairCheck.actionCount)} tone={repairCheck.actionCount ? 'teal' : 'amber'} />
          <Metric label="Code map" value={String(cueforgeCodeStructure.length)} tone="teal" />
        </div>
        <div className="live-actions">
          <button className="primary" onClick={() => onOpen('reports')}><Bug size={18} /> Open Report Lab</button>
          <button className="ghost" onClick={() => onOpen('beta')}><Activity size={18} /> Open Beta Check-in</button>
          <button className="ghost" onClick={copyRepairPacket} disabled={!uiNotes.length}><Copy size={18} /> Copy dev packet</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-panda-notes-repair-packet.txt', repairPacket)} disabled={!uiNotes.length}><Download size={18} /> Export dev packet</button>
          <button className="ghost" onClick={onClearUiNotes} disabled={!uiNotes.length}><RotateCcw size={18} /> Clear notes</button>
        </div>
        <p className="callout">{packetStatus}</p>
      </Panel>

      <Panel title="Tester Flow" icon={ShieldCheck}>
        <div className="mini-step-list">
          <div><strong>1</strong><span>Right-click the exact area that felt off.</span></div>
          <div><strong>2</strong><span>Tag the issue and write the note in plain tester language.</span></div>
          <div><strong>3</strong><span>Export a redacted report only when you choose to send it.</span></div>
        </div>
        <p className="callout">No hidden upload. Panda Notes stay local unless attached to a report, setup pack, or developer packet.</p>
      </Panel>

      <Panel className="wide" title="Target Issues" icon={Bug}>
        <div className="panda-issue-layout">
          <div className="issue-list">
            {!actions.length && (
              <div className="data-card">
                <strong>No selected issues yet</strong>
                <span>Right-click a real app area, save a Panda Note, then return here to select the target issue and inspect the repair snippet.</span>
              </div>
            )}
            {actions.map((action) => (
              <button
                className={`issue-button ${selectedAction?.id === action.id ? 'selected' : ''}`}
                key={action.id}
                onClick={() => setSelectedId(action.id)}
              >
                <strong>{action.title}</strong>
                <span>{action.page} / {action.count} note{action.count === 1 ? '' : 's'} / priority {action.priority}</span>
                <small>{action.evidence?.[0]?.note || action.suggestedFix}</small>
              </button>
            ))}
          </div>
          <div className="note-detail-popout">
            {selectedAction ? (
              <>
                <strong>{selectedAction.title}</strong>
                <span>{selectedAction.suggestedFix}</span>
                <small>{selectedAction.testPlan}</small>
                <div className="selected-note-evidence">
                  {(selectedAction.evidence || []).map((item, index) => (
                    <div className="data-card" key={`${item.createdAt}-${index}`}>
                      <strong>Note {index + 1}</strong>
                      <span>{item.note || 'No written note attached.'}</span>
                      <small>{item.target || 'Unknown target'} / {item.viewport.width}x{item.viewport.height}</small>
                    </div>
                  ))}
                </div>
                {selectedSnippet && (
                  <div className="snippet-card">
                    <strong>{selectedSnippet.file}</strong>
                    <span>{selectedSnippet.title}</span>
                    <pre>{selectedSnippet.code}</pre>
                  </div>
                )}
              </>
            ) : (
              <>
                <strong>Pick a note to pop the target code</strong>
                <span>Once a Panda Note exists, the selected issue will show tester evidence, fix guidance, and a source snippet.</span>
              </>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="wide" title="Code Structure Viewer" icon={BrainCircuit}>
        <div className="code-structure-list">
          {cueforgeCodeStructure.map((entry) => (
            <div className="code-row" key={entry.path}>
              <strong>{entry.path}</strong>
              <span>{entry.role}</span>
              <em>{entry.audience}</em>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Inventory({ onOpen, onRerunSetup, uiNotes = [], shortcutVault = [], onUpdateShortcuts, onUpdateUiNotes, onClearUiNotes }) {
  const selfTests = getSavedJson('cueforge-self-test-results') || [];
  const evidence = getSavedJson('cueforge-audio-evidence') || [];
  const checkIns = getSavedJson('cueforge-beta-checkins') || [];
  const snapshots = getSavedJson('cueforge-gameplay-snapshots') || [];
  const communityItems = getSavedJson('cueforge-community-feedback') || [];
  const lastReport = getSavedJson('cueforge-last-issue-report');
  const desktopReady = Boolean(window.cueforgeDesktop?.isDesktop);
  const [privacyAudit, setPrivacyAudit] = useState(() => getSavedJson('cueforge-last-privacy-audit'));
  const [shortcutDraft, setShortcutDraft] = useState({ label: '', value: '', kind: 'link' });
  const [shortcutStatus, setShortcutStatus] = useState('Safe shortcuts are saved locally. Code-looking shortcuts lock before export.');
  const uiSummary = summarizeUiFeedback(uiNotes);
  const shortcutSummary = useMemo(() => summarizeShortcutVault(shortcutVault), [shortcutVault]);
  const shortcutExportText = useMemo(() => buildShortcutExportText(shortcutVault), [shortcutVault]);
  const repairCheck = useMemo(() => buildUiFeedbackRepairCheck(uiNotes), [uiNotes]);
  const displayedRepairActions = useMemo(() => repairCheck.actions.map((action) => {
    const displayTitle = rewriteLegacyUiCopy(action.title);
    const legacyFixed = displayTitle !== action.title;
    return {
      ...action,
      legacyFixed,
      displayTitle,
      displayFix: legacyFixed
        ? 'Copy was rewritten in this build. Re-test the target page, then clear the note when it passes.'
        : rewriteLegacyUiCopy(action.suggestedFix),
      displayTestPlan: rewriteLegacyUiCopy(action.testPlan)
    };
  }), [repairCheck.actions]);
  const openRepairActions = displayedRepairActions.filter((action) => !action.legacyFixed);
  const fixedRepairActions = displayedRepairActions.filter((action) => action.legacyFixed);
  const repairPacket = useMemo(() => buildUiFeedbackRepairPacket(uiNotes), [uiNotes]);
  const privacyAuditText = useMemo(() => buildPrivacyAuditText(privacyAudit), [privacyAudit]);
  const issueMemory = useMemo(() => buildIssuePatternMemory({
    lastReport,
    uiNotes,
    checkIns,
    communityItems,
    selfTests,
    evidence
  }), [lastReport, uiNotes, checkIns, communityItems, selfTests, evidence]);
  const issueMemoryText = useMemo(() => buildIssuePatternMemoryText(issueMemory), [issueMemory]);
  const systemDesktopPlan = useMemo(() => buildDesktopBridgeFixPlan({
    desktopAvailable: desktopReady,
    desktopInfo: null,
    bridgeReport: lastReport?.diagnostics?.bridgeReport || null
  }), [desktopReady, lastReport]);
  const systemDesktopPlanText = useMemo(() => buildDesktopBridgeFixText(systemDesktopPlan), [systemDesktopPlan]);
  const scopeBoundary = useMemo(() => buildScopeBoundarySummary(), []);
  const nativeRoadmap = useMemo(() => summarizeNativeEngineRoadmap(), []);
  const [repairStatus, setRepairStatus] = useState('Auto repair check runs from saved Panda Notes.');
  const releaseProof = useMemo(() => buildReleaseProofState({
    selfTests,
    evidence,
    checkIns,
    snapshots,
    lastReport,
    uiNotes,
    desktopReady,
    privacyAuditPassed: privacyAudit?.status === 'pass' || localStorage.getItem('cueforge-privacy-audit-passed') === 'yes',
    publicBuildVerified: localStorage.getItem('cueforge-public-build-verified') === 'yes',
    patternMemoryReady: issueMemory.matchedPatterns.some((pattern) => pattern.automationReady)
  }), [selfTests, evidence, checkIns, snapshots, lastReport, uiNotes, desktopReady, privacyAudit, issueMemory]);
  const releaseSummary = useMemo(() => summarizeReleaseQueue({
    testerCount: checkIns.length,
    proof: releaseProof
  }), [checkIns.length, releaseProof]);
  const releaseDraft = useMemo(() => buildReleaseUpdateDraft(releaseSummary), [releaseSummary]);
  const passedTests = selfTests.filter((item) => item.status === 'pass').length;
  const totalTests = selfTests.length;
  const healthScore = clamp(
    38 +
      (totalTests ? 16 : 0) +
      (evidence.length ? 14 : 0) +
      (checkIns.length ? 12 : 0) +
      (snapshots.length ? 8 : 0) +
      (lastReport ? 8 : 0) +
      (uiSummary.total ? 4 : 0) +
      (desktopReady ? 4 : 0),
    0,
    100
  );
  const healthLabel = healthScore > 80 ? 'tester ready' : healthScore > 62 ? 'needs one more pass' : 'setup in progress';
  const modules = [
    ['Setup Journey', 'gear profile, permission, bridge, calibration direction, and first-run handoff', 'rerunnable'],
    ['Signal Analyzer', 'spectral bands, FPS clarity, comms readiness, and likely-source diagnosis', 'live'],
    ['Evidence Loop', 'local mic proof, beta check-ins, report replay, and export packs', evidence.length || checkIns.length ? 'active' : 'empty'],
    ['Apply Boundary', 'exports configs and keeps native audio changes explicit', 'safe']
  ];

  const copyRepairPacket = async () => {
    try {
      await navigator.clipboard?.writeText(repairPacket);
      setRepairStatus('Repair packet copied. Paste it into the developer workflow, then test the fix.');
    } catch {
      setRepairStatus('Repair packet is ready, but clipboard access was blocked. Export it instead.');
    }
  };

  const runRepairCheck = () => {
    setRepairStatus(openRepairActions.length
      ? `Auto check found ${openRepairActions.length} open repair action${openRepairActions.length === 1 ? '' : 's'}. Top fix: ${openRepairActions[0].displayTitle}.`
      : fixedRepairActions.length
        ? `${fixedRepairActions.length} saved copy note${fixedRepairActions.length === 1 ? '' : 's'} already map to repaired wording. Re-test, then clear the notes.`
      : 'No Panda Notes found yet. Right-click a broken/confusing area, save a note, then this check will build the repair queue.');
  };

  const updateNotes = (next, message) => {
    onUpdateUiNotes?.(next);
    setRepairStatus(message);
  };

  const markAllNotes = (status) => {
    const next = markUiFeedbackNotes(uiNotes, 'all', status);
    updateNotes(next, `Panda Notes marked ${status}. ${status === 'fixed' ? 'Run browser QA, then clear fixed notes.' : 'Keep the loop moving from this inbox.'}`);
  };

  const clearFixedNotes = () => {
    const next = cleanupUiFeedbackNotes(uiNotes);
    updateNotes(next, `Cleared ${uiNotes.length - next.length} fixed or archived note${uiNotes.length - next.length === 1 ? '' : 's'}.`);
  };

  const updateShortcutVault = (next, message) => {
    onUpdateShortcuts?.(next);
    setShortcutStatus(message);
  };

  const saveShortcutDraft = () => {
    if (!shortcutDraft.label.trim() || !shortcutDraft.value.trim()) {
      setShortcutStatus('Add a name and link/action first, then save it.');
      return;
    }

    const next = saveShortcut(shortcutVault, shortcutDraft);
    const savedShortcut = next[next.length - 1];
    updateShortcutVault(next, savedShortcut.locked
      ? 'Saved and locked. That shortcut will show as redacted in public exports.'
      : 'Saved. It will be included in the safe shortcut kit.');
    setShortcutDraft({ label: '', value: '', kind: 'link' });
  };

  const lockShortcutCodes = () => {
    const next = lockSensitiveShortcuts(shortcutVault);
    const locked = summarizeShortcutVault(next).locked;
    updateShortcutVault(next, `${locked} code shortcut${locked === 1 ? '' : 's'} locked and redacted for export.`);
  };

  const copyShortcutKit = async () => {
    try {
      await navigator.clipboard?.writeText(shortcutExportText);
      setShortcutStatus('Safe shortcut kit copied. Locked code shortcuts stayed redacted.');
    } catch {
      setShortcutStatus('Shortcut kit is ready, but clipboard access was blocked. Export it instead.');
    }
  };

  const runPrivacyAuditNow = () => {
    const apo = buildApoConfig(baseEq);
    const sampleExportPack = buildExportPack({
      apoConfig: apo,
      calibration: { eq: baseEq, equalizerApoConfig: apo },
      hearing: null,
      dna: null,
      uiFeedbackNotes: uiNotes,
      shortcuts: shortcutVault
    });
    const audit = runPrivacyAudit([
      { name: 'last issue report', payload: lastReport || { status: 'no report saved yet' } },
      { name: 'setup export pack', payload: sampleExportPack },
      { name: 'setup summary', payload: buildSetupShareText({ devices: [], bridgeReport: null }) },
      { name: 'self-test results', payload: redactDeep(selfTests) },
      { name: 'panda notes', payload: uiNotes },
      { name: 'shortcut vault', payload: buildShortcutExportText(shortcutVault) }
    ]);
    setPrivacyAudit(audit);
    safeSetJson('cueforge-last-privacy-audit', audit);
    if (audit.status === 'pass') {
      localStorage.setItem('cueforge-privacy-audit-passed', 'yes');
      setRepairStatus('Privacy audit passed. Exports are clear for the next controlled tester update.');
    } else {
      localStorage.removeItem('cueforge-privacy-audit-passed');
      setRepairStatus(`Privacy audit found ${audit.leakCount} possible leak${audit.leakCount === 1 ? '' : 's'}. Fix before posting a tester update.`);
    }
  };

  return (
    <section className="grid two system-grid">
      <Panel className="system-overview" title="CueForge Status" icon={Activity}>
        <div className="system-hero">
          <div>
            <strong>{healthScore}%</strong>
            <span>{healthLabel}</span>
            <p>Local build is ready for controlled testing when the self test, analyzer evidence, and report replay all have recent proof.</p>
          </div>
          <div className="system-pill-stack">
            <span>Local-first</span>
            <span>{desktopReady ? 'Desktop bridge active' : 'Browser mode'}</span>
            <span>No silent driver writes</span>
          </div>
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="Self test" value={totalTests ? `${passedTests}/${totalTests}` : 'Run'} tone={passedTests === totalTests && totalTests ? 'teal' : 'amber'} />
          <Metric label="Evidence" value={String(evidence.length)} tone={evidence.length ? 'teal' : 'amber'} />
          <Metric label="Check-ins" value={String(checkIns.length)} tone={checkIns.length ? 'teal' : 'amber'} />
          <Metric label="Saves" value={String(snapshots.length)} tone={snapshots.length ? 'teal' : 'amber'} />
          <Metric label="UI notes" value={String(uiSummary.total)} tone={uiSummary.total ? 'teal' : 'amber'} />
        </div>
      </Panel>

      <Panel title="Analyzer Core" icon={AudioLines}>
        <p>CueForge now reads live mic buffers as a signal map, not just a volume meter.</p>
        <div className="module-list">
          {[
            ['Clip and gain', 'peak, RMS, crest factor, DC offset'],
            ['Noise and masking', 'rumble, low-mid load, sharp edge, air/noise'],
            ['Game readiness', 'FPS clarity, cue strength, comms readiness'],
            ['Tuning hint', 'likely source plus conservative EQ nudge']
          ].map(([name, detail]) => (
            <div className="module-row" key={name}>
              <CheckCircle2 size={17} />
              <div>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Build Map" icon={BrainCircuit}>
        <div className="module-list">
          {modules.map(([name, detail, status]) => (
            <div className="module-row" key={name}>
              <span className={`status-dot ${status === 'safe' || status === 'live' || status === 'active' || status === 'checked' ? 'ready' : ''}`} />
              <div>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
              <em>{status}</em>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Native Engine Roadmap" icon={Gauge}>
        <p>Post-v0.2 direction stays staged: sandbox first, preview second, Windows integration later, and no hidden system changes.</p>
        <div className="data-card native-next-card">
          <strong>{nativeRoadmap.next.version} - {nativeRoadmap.next.codename}</strong>
          <span>{nativeRoadmap.next.goal}</span>
          <small>{nativeRoadmap.next.deliverables.slice(0, 3).join(' / ')}</small>
        </div>
        <div className="module-list native-roadmap-list">
          {nativeRoadmap.releaseLadder.map((milestone) => (
            <div className="module-row" key={milestone.version}>
              <span className={`status-dot ${milestone.version === nativeRoadmap.next.version ? 'ready' : ''}`} />
              <div>
                <strong>{milestone.version} - {milestone.codename}</strong>
                <span>{milestone.goal}</span>
                <small>Proof: {milestone.proofGates.slice(0, 2).join(' / ')}</small>
              </div>
              <em>{milestone.lane}</em>
            </div>
          ))}
        </div>
        <p className="callout">{nativeRoadmap.principles[0]} {nativeRoadmap.principles[3]}</p>
      </Panel>

      <Panel title="Desktop Bridge Fix Path" icon={Download}>
        <p>{systemDesktopPlan.summary}</p>
        <div className="metric-row selftest-summary">
          <Metric label="Mode" value={desktopReady ? 'Desktop' : 'Browser'} tone={desktopReady ? 'teal' : 'amber'} />
          <Metric label="Bridge" value={systemDesktopPlan.status.replaceAll('-', ' ')} tone={systemDesktopPlan.status === 'desktop-ready' ? 'teal' : 'amber'} />
        </div>
        <div className="data-card">
          <strong>{systemDesktopPlan.title}</strong>
          <span>{systemDesktopPlan.boundary}</span>
          <small>{systemDesktopPlan.playerSteps.slice(0, 2).join(' ')}</small>
        </div>
        <div className="module-list">
          {systemDesktopPlan.proofChecks.slice(0, 4).map((check) => (
            <div className="module-row" key={check}>
              <CheckCircle2 size={17} />
              <div>
                <strong>{check}</strong>
                <span>{check.includes('APO') ? 'Safe draft only; no direct system write.' : 'Required before calling desktop setup solved.'}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="live-actions">
          <button className="ghost" onClick={() => navigator.clipboard?.writeText(systemDesktopPlanText)}><Copy size={18} /> Copy desktop plan</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-desktop-bridge-plan.txt', systemDesktopPlanText)}><Download size={18} /> Export plan</button>
        </div>
      </Panel>

      <Panel title="Shortcut Vault" icon={Save}>
        <p>Save player shortcuts for setup, support, feedback, and release notes. Code shortcuts lock locally and export as redacted placeholders.</p>
        <div className="metric-row selftest-summary">
          <Metric label="Saved" value={String(shortcutSummary.total)} tone={shortcutSummary.total ? 'teal' : 'amber'} />
          <Metric label="Public" value={String(shortcutSummary.exportable)} tone={shortcutSummary.exportable ? 'teal' : 'amber'} />
          <Metric label="Locked" value={String(shortcutSummary.locked)} tone={shortcutSummary.locked ? 'amber' : 'teal'} />
        </div>
        <div className="shortcut-builder">
          <label className="field">
            <span>Name</span>
            <input
              value={shortcutDraft.label}
              onChange={(event) => setShortcutDraft({ ...shortcutDraft, label: event.target.value })}
              placeholder="Example: Open web app"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={shortcutDraft.kind} onChange={(event) => setShortcutDraft({ ...shortcutDraft, kind: event.target.value })}>
              <option value="link">Link</option>
              <option value="action">Action</option>
              <option value="command">Command</option>
              <option value="code">Code / locked</option>
              <option value="note">Note</option>
            </select>
          </label>
          <label className="field shortcut-value-field">
            <span>Shortcut</span>
            <input
              value={shortcutDraft.value}
              onChange={(event) => setShortcutDraft({ ...shortcutDraft, value: event.target.value })}
              placeholder="Paste a link, action, or code"
            />
          </label>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={saveShortcutDraft}><Save size={18} /> Save shortcut</button>
          <button className="ghost" onClick={lockShortcutCodes}><ShieldCheck size={18} /> Lock code shortcuts</button>
          <button className="ghost" onClick={copyShortcutKit}><Copy size={18} /> Copy safe shortcuts</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-shortcut-kit.txt', shortcutExportText)}><Download size={18} /> Export shortcut kit</button>
        </div>
        <p className="callout">{shortcutStatus}</p>
        <div className="module-list shortcut-list">
          {shortcutVault.slice(0, 6).map((shortcut) => (
            <div className="module-row" key={shortcut.id}>
              <span className={`status-dot ${shortcut.locked ? '' : 'ready'}`} />
              <div>
                <strong>{shortcut.label}</strong>
                <span>{shortcut.locked ? '[locked]' : shortcut.value}</span>
                <small>{shortcut.kind} / {shortcut.scope}</small>
              </div>
              <em>{shortcut.locked ? 'locked' : 'saved'}</em>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Issue Pattern Memory" icon={BrainCircuit}>
        <p>CueForge is for Windows players using IEMs, headsets, USB mics, Discord, Equalizer APO, Peace, Sonar, and real-world audio chains that never behave perfectly.</p>
        <div className="metric-row selftest-summary">
          <Metric label="Signals" value={String(issueMemory.totalSignals)} tone={issueMemory.totalSignals ? 'teal' : 'amber'} />
          <Metric label="Patterns" value={String(issueMemory.matchedCount)} tone={issueMemory.matchedCount ? 'teal' : 'amber'} />
          <Metric label="Auto-ready" value={String(issueMemory.matchedPatterns.filter((pattern) => pattern.automationReady).length)} tone={issueMemory.matchedPatterns.some((pattern) => pattern.automationReady) ? 'teal' : 'amber'} />
        </div>
        {issueMemory.topPattern ? (
          <div className="data-card">
            <strong>{issueMemory.topPattern.label}</strong>
            <span>{issueMemory.topPattern.debugPlaybook[0]}</span>
            <small>{issueMemory.topPattern.confidence}% confidence / {issueMemory.topPattern.source} / {issueMemory.topPattern.evidenceCount} signal{issueMemory.topPattern.evidenceCount === 1 ? '' : 's'}</small>
          </div>
        ) : (
          <div className="data-card">
            <strong>No repeated pattern yet</strong>
            <span>Collect a redacted report, Panda Note, check-in, or community signal after a real match.</span>
            <small>Pattern memory stays local and suggests debug playbooks only.</small>
          </div>
        )}
        <div className="module-list">
          {issueMemory.matchedPatterns.slice(0, 3).map((pattern) => (
            <div className="module-row" key={pattern.id}>
              <span className={`status-dot ${pattern.automationReady ? 'ready' : ''}`} />
              <div>
                <strong>{pattern.label}</strong>
                <span>{pattern.debugPlaybook.slice(0, 2).join(' ')}</span>
                <small>Later: {pattern.futureAutomation}</small>
              </div>
              <em>{pattern.confidence}%</em>
            </div>
          ))}
        </div>
        <div className="live-actions">
          <button className="ghost" onClick={() => navigator.clipboard?.writeText(issueMemoryText)}><Copy size={18} /> Copy playbook</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-issue-pattern-memory.txt', issueMemoryText)}><Download size={18} /> Export memory</button>
        </div>
        <p className="callout">{issueMemory.boundary}</p>
      </Panel>

      <Panel title="Target-Gated Release Queue" icon={Gauge}>
        <p>Updates stay queued until the tester target and proof gates are both ready. That keeps CueForge moving fast without shipping half-proof hype.</p>
        <div className="metric-row selftest-summary">
          <Metric label="Local tester signals" value={String(releaseSummary.testerCount)} tone={releaseSummary.testerCount ? 'teal' : 'amber'} />
          <Metric label="Active target" value={`${releaseSummary.active.testerTarget}`} tone={releaseSummary.active.targetMet ? 'teal' : 'amber'} />
          <Metric label="Proof gaps" value={String(releaseSummary.active.missingProof.length)} tone={releaseSummary.active.proofReady ? 'teal' : 'amber'} />
        </div>
        <div className="data-card">
          <strong>{releaseSummary.active.label}</strong>
          <span>{releaseSummary.active.theme}</span>
          <small>{releaseSummary.nextAction}</small>
        </div>
        <div className="module-list">
          {releaseSummary.targets.map((target) => (
            <div className="module-row" key={target.id}>
              <span className={`status-dot ${target.status === 'ready-to-release' ? 'ready' : ''}`} />
              <div>
                <strong>{target.label}</strong>
                <span>{target.ship.slice(0, 2).join(' / ')}</span>
                <small>{target.missingProof.length ? `Waiting on: ${target.missingProof.join(', ')}` : target.releaseWhen}</small>
              </div>
              <em>{target.status}</em>
            </div>
          ))}
        </div>
        <div className="live-actions">
          <button className="ghost" onClick={() => navigator.clipboard?.writeText(releaseDraft)}><Copy size={18} /> Copy update draft</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-next-release-update.txt', releaseDraft)}><Download size={18} /> Export draft</button>
        </div>
      </Panel>

      <HunterRewardsPanel />

      <Panel title="Privacy Export Audit" icon={ShieldCheck}>
        <p>Run this before any controlled tester update. It checks saved reports, export packs, setup summaries, self-test logs, and Panda Notes for private data.</p>
        <div className="metric-row selftest-summary">
          <Metric label="Audit" value={privacyAudit?.status || 'Run'} tone={privacyAudit?.status === 'pass' ? 'teal' : 'amber'} />
          <Metric label="Leaks" value={String(privacyAudit?.leakCount ?? 0)} tone={privacyAudit?.leakCount ? 'red' : 'teal'} />
        </div>
        <div className="data-card">
          <strong>{privacyAudit?.status === 'pass' ? 'Clear for controlled update' : 'Needs proof before posting'}</strong>
          <span>{privacyAudit?.status === 'pass'
            ? 'No raw private identifiers were found in the checked payloads.'
            : 'Run the audit after Self Test and before copying any public tester update.'}</span>
          <small>{privacyAudit?.checkedItems?.join(', ') || 'No audit run saved yet.'}</small>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={runPrivacyAuditNow}><ShieldCheck size={18} /> Run privacy audit</button>
          <button className="ghost" onClick={() => navigator.clipboard?.writeText(privacyAuditText)} disabled={!privacyAudit}><Copy size={18} /> Copy audit</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-privacy-audit.txt', privacyAuditText)} disabled={!privacyAudit}><Download size={18} /> Export audit</button>
        </div>
        {privacyAudit?.leaks?.length > 0 && (
          <div className="module-list">
            {privacyAudit.leaks.slice(0, 4).map((leak, index) => (
              <div className="module-row" key={`${leak.path}-${index}`}>
                <span className="status-dot" />
                <div>
                  <strong>{leak.type}</strong>
                  <span>{leak.path}</span>
                </div>
                <em>fix</em>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Safety Boundary" icon={ShieldCheck}>
        <div className="safety-list">
          <div>
            <strong>What it can do</strong>
            <span>Detect, analyze, recommend, export APO text, save local reports, and replay state.</span>
          </div>
          <div>
            <strong>What needs approval</strong>
            <span>Driver installs, Windows routing changes, APO writes, and any public upload.</span>
          </div>
          <div>
            <strong>What stays local</strong>
            <span>Mic clips, redacted reports, device summaries, check-ins, and gameplay snapshots.</span>
          </div>
        </div>
        <div className="scope-boundary-card">
          <strong>Not in v0.2.0</strong>
          <span>These stay blocked so CueForge remains trusted, explicit, and away from anti-cheat or hidden-driver risk.</span>
        </div>
        <div className="module-list compact-scope-list">
          {scopeBoundary.blocked.map((item) => (
            <div className="module-row warning-row severity-high" key={item.id}>
              <ShieldCheck size={17} />
              <div>
                <strong>{item.label}</strong>
                <span>{item.reason}</span>
              </div>
              <em>blocked</em>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Fast Path" icon={Search}>
        <p>Use these in order before handing the app to a tester.</p>
        <div className="system-action-grid">
          <button className="primary" onClick={() => onOpen('selftest')}><TestTube2 size={18} /> Run self test</button>
          <button className="ghost" onClick={() => onOpen('mic')}><Mic size={18} /> Open analyzer</button>
          <button className="ghost" onClick={() => onOpen('beta')}><Activity size={18} /> Record check-in</button>
          <button className="ghost" onClick={() => onOpen('reports')}><Bug size={18} /> Create report</button>
          <button className="ghost" onClick={runPrivacyAuditNow}><ShieldCheck size={18} /> Audit exports</button>
          <button className="ghost" onClick={onRerunSetup}><RotateCcw size={18} /> Rerun setup</button>
        </div>
        <p className="callout">{lastReport ? 'A replayable report exists locally. Import/export can prove the current state.' : 'Create one report after the next real test so failures can be replayed.'}</p>
      </Panel>

      <Panel title="Panda Notes Inbox" icon={Bug}>
        <p>Review tester UI notes here. Triage them, mark the repair state, copy the fix packet, then clear fixed notes after QA passes.</p>
        <div className="data-card quick-path">
          <strong>Fix loop</strong>
          <span>1. Read the latest note. 2. Run repair check. 3. Mark reviewed or needs retest. 4. Clear only after the fix is proven.</span>
          <small>Notes stay local unless a tester chooses to send a report or export packet.</small>
        </div>
        <div className="metric-row selftest-summary">
          <Metric label="Captured" value={String(uiSummary.total)} tone={uiSummary.total ? 'teal' : 'amber'} />
          <Metric label="Open" value={String(uiSummary.open)} tone={uiSummary.open ? 'amber' : 'teal'} />
          <Metric label="Retest" value={String(uiSummary.needsRetest)} tone={uiSummary.needsRetest ? 'amber' : 'teal'} />
          <Metric label="Fixed" value={String(uiSummary.fixed)} tone={uiSummary.fixed ? 'teal' : 'amber'} />
          <Metric label="Top tag" value={uiSummary.topTag} tone={uiSummary.total ? 'teal' : 'amber'} />
          <Metric label="Open fixes" value={String(openRepairActions.length)} tone={openRepairActions.length ? 'amber' : 'teal'} />
        </div>
        {uiSummary.latest ? (
          <div className="data-card">
            <strong>{rewriteLegacyUiCopy(uiSummary.latest.tag)} / {rewriteLegacyUiCopy(uiSummary.latest.page)}</strong>
            <span>{rewriteLegacyUiCopy(uiSummary.latest.note)}</span>
            <small>{uiSummary.latest.status} / {rewriteLegacyUiCopy(uiSummary.latest.target.panel || uiSummary.latest.target.label)}</small>
          </div>
        ) : (
          <div className="data-card">
            <strong>No notes yet</strong>
            <span>Right-click any app area to tag confusing text, layout issues, broken controls, or ideas.</span>
          </div>
        )}
        <div className="live-actions">
          <button className="primary" onClick={runRepairCheck}><Sparkles size={18} /> Run repair check</button>
          <button className="ghost" onClick={() => markAllNotes('reviewed')} disabled={!uiNotes.length}><CheckCircle2 size={18} /> Mark reviewed</button>
          <button className="ghost" onClick={() => markAllNotes('needs-retest')} disabled={!uiNotes.length}><RotateCcw size={18} /> Needs retest</button>
          <button className="ghost" onClick={() => markAllNotes('fixed')} disabled={!uiNotes.length}><ShieldCheck size={18} /> Mark fixed</button>
          <button className="ghost" onClick={copyRepairPacket} disabled={!uiNotes.length}><Copy size={18} /> Copy fix packet</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-ui-feedback-notes.json', JSON.stringify(uiNotes, null, 2))} disabled={!uiNotes.length}><Download size={18} /> Export notes</button>
          <button className="ghost" onClick={() => downloadTextFile('cueforge-ui-repair-packet.txt', repairPacket)} disabled={!uiNotes.length}><Download size={18} /> Export fix packet</button>
          <button className="ghost" onClick={clearFixedNotes} disabled={!uiNotes.some((note) => ['fixed', 'archived'].includes(note.status))}><RotateCcw size={18} /> Clear fixed</button>
          <button className="ghost" onClick={onClearUiNotes} disabled={!uiNotes.length}><RotateCcw size={18} /> Clear notes</button>
        </div>
        <p className="callout">{repairStatus}</p>
        <div className="repair-boundary">
          <strong>Safe self-repair boundary</strong>
          <span>{repairCheck.boundary}</span>
        </div>
        <div className="module-list repair-action-list">
          {displayedRepairActions.length === 0 && (
            <div className="module-row">
              <span className="status-dot" />
              <div>
                <strong>No repair queue yet</strong>
                <span>Save a Panda Note on a real UI problem and CueForge will turn it into a prioritized developer action.</span>
              </div>
              <em>idle</em>
            </div>
          )}
          {displayedRepairActions.slice(0, 4).map((action) => (
            <div className="module-row" key={action.id}>
              <span className={`status-dot ${action.legacyFixed || action.priority >= 78 ? 'ready' : ''}`} />
              <div>
                <strong>{action.legacyFixed ? 'Repaired copy: ' : ''}{action.displayTitle}</strong>
                <span>{action.displayFix}</span>
                <small>{rewriteLegacyUiCopy(action.page)} / {action.count} note{action.count === 1 ? '' : 's'} / test: {action.displayTestPlan}</small>
              </div>
              <em>{action.legacyFixed ? 'fixed' : action.priority}</em>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function VideoStarterPage() {
  const [settings] = useState(() => readUserSettingsFromStorage());
  const [uploads, setUploads] = useState({});
  const [showFullCut, setShowFullCut] = useState(false);
  const [copiedShot, setCopiedShot] = useState('');
  const [soundStage, setSoundStage] = useState('panic');
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [audioPolicyStatus, setAudioPolicyStatus] = useState(() => buildAudioPolicySummary(settings));
  const [motionPass, setMotionPass] = useState(motionPassFallback);
  const [motionApproval, setMotionApproval] = useState(readMotionPassApproval);
  const [motionRefreshTick, setMotionRefreshTick] = useState(0);
  const heroVideoRef = useRef(null);
  const fullCutRef = useRef(null);
  const motionApproved = motionApproval?.revision === motionPass.revision;
  const motionRevision = motionApproved
    ? `approved-${motionApproval.revision}`
    : `${motionPass.revision || 'pending'}-${motionRefreshTick}`;
  const assets = useMemo(() => {
    const rawAssets = { ...pandaVideoAssets, ...pandaStoryAssets, ...uploads };
    return Object.fromEntries(Object.entries(rawAssets).map(([key, asset]) => [
      key,
      asset?.url ? { ...asset, url: appendAssetRevision(asset.url, motionRevision) } : asset
    ]));
  }, [uploads, motionRevision]);
  const isPanicStage = soundStage === 'panic';
  const cinematicAudioAllowed = canPlayCinematicVideoAudio(settings);
  const stageAssets = isPanicStage
    ? {
        webm: assets.setupWebm,
        mp4: assets.setupMp4,
        poster: assets.setupPoster,
        mobile: assets.setupMp4
      }
    : {
        webm: assets.enhancedWebm,
        mp4: assets.enhancedMp4,
        poster: assets.poster,
        mobile: assets.enhancedMobile
      };
  const heroKey = [soundStage, stageAssets.webm.url, stageAssets.mp4.url, stageAssets.mobile.url, stageAssets.poster.url].join('|');
  const stageCopy = isPanicStage
    ? {
        eyebrow: 'Panda Soundwalk',
        title: 'Hear the unseen.',
        body: 'Forest noise ripples outward, bends through bamboo and fog, then resolves into directional hearing.',
        pill: `Live cut ${motionPass.revision || 'pending'}`
      }
    : {
        eyebrow: 'Panda Soundwalk',
        title: 'Hear the unseen.',
        body: 'Sparse cues travel from their source, reach the acoustic ears, and fade as the signal locks into place.',
        pill: `Live cut ${motionPass.revision || 'pending'}`
      };

  useEffect(() => {
    if (motionApproved) return undefined;
    let active = true;
    const loadMotionPass = async () => {
      try {
        const response = await fetch(publicAssetPath(`/media/panda-motion-pass-status.json?cache=${Date.now()}`), { cache: 'no-store' });
        if (!response.ok) return;
        const next = await response.json();
        if (!active) return;
        setMotionPass({ ...motionPassFallback, ...next });
        setMotionRefreshTick((current) => current + 1);
      } catch {
        if (active) setMotionRefreshTick((current) => current + 1);
      }
    };
    loadMotionPass();
    const interval = window.setInterval(loadMotionPass, 8000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [motionApproved]);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    video.muted = !soundUnlocked || !cinematicAudioAllowed;
    video.volume = isPanicStage ? 0.58 : 0.5;
    if (soundUnlocked && cinematicAudioAllowed) {
      video.play().catch(() => {});
    }
  }, [heroKey, isPanicStage, soundUnlocked, cinematicAudioAllowed]);

  useEffect(() => {
    if (!showFullCut) return;
    const video = fullCutRef.current;
    if (!video) return;
    video.muted = !cinematicAudioAllowed;
    video.volume = 0.55;
    video.currentTime = 0;
    if (cinematicAudioAllowed) video.play().catch(() => {});
  }, [showFullCut, assets.storyFull.url, cinematicAudioAllowed]);

  useEffect(() => () => {
    Object.values(uploads).forEach((asset) => {
      if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
    });
  }, [uploads]);

  const addUpload = (key, file) => {
    if (!file) return;
    setUploads((current) => {
      if (current[key]?.objectUrl) URL.revokeObjectURL(current[key].objectUrl);
      const objectUrl = URL.createObjectURL(file);
      const baseAsset = pandaVideoAssets[key] || pandaStoryAssets[key] || { label: key };
      return {
        ...current,
        [key]: {
          ...baseAsset,
          url: objectUrl,
          objectUrl,
          meta: `${file.name} / live override`
        }
      };
    });
  };

  const exportList = [
    ['setupMp4', 'Opening MP4', 'video/mp4,.mp4'],
    ['enhancedMp4', 'Listening Reveal MP4', 'video/mp4,.mp4'],
    ['setupPoster', 'Opening Poster', 'image/jpeg,image/png,.jpg,.jpeg,.png'],
    ['poster', 'Hero Poster', 'image/jpeg,image/png,.jpg,.jpeg,.png'],
    ['storyFull', 'Full Soundwalk Cut', 'video/mp4,.mp4']
  ];

  const playHeroWithSound = (volume) => {
    if (!cinematicAudioAllowed) {
      setSoundUnlocked(false);
      setAudioPolicyStatus('Cinematic video audio is off in Settings. The preview stays muted.');
      return;
    }

    setSoundUnlocked(true);
    setAudioPolicyStatus('Cinematic video audio live.');
    window.setTimeout(() => {
      const video = heroVideoRef.current;
      if (!video) return;
      video.muted = false;
      video.volume = volume;
      video.play().catch(() => {});
    }, 0);
  };

  const startSetupAudio = () => {
    setSoundStage('panic');
    playHeroWithSound(0.58);
  };

  const completeSetup = () => {
    setSoundStage('enhanced');
    playHeroWithSound(0.5);
  };

  const approveMotionPass = () => {
    const approval = {
      revision: motionPass.revision,
      approvedAt: new Date().toISOString()
    };
    localStorage.setItem(MOTION_PASS_APPROVAL_KEY, JSON.stringify(approval));
    setMotionApproval(approval);
  };

  const resumeMotionPass = () => {
    localStorage.removeItem(MOTION_PASS_APPROVAL_KEY);
    setMotionApproval(null);
    setMotionRefreshTick((current) => current + 1);
  };

  const replaySetup = () => {
    setSoundStage('panic');
    setSoundUnlocked(false);
    window.setTimeout(() => {
      const video = heroVideoRef.current;
      if (!video) return;
      video.muted = true;
      video.currentTime = 0;
      video.play().catch(() => {});
    }, 0);
  };

  const copyShotPrompt = async (shot) => {
    const text = `${shot.prompt}\n\nNegative prompt: cartoon, anime, mascot suit, plush toy, horror, scary, monster, demon, glowing red eyes, aggressive roar, gore, blood, extra limbs, distorted face, deformed panda, duplicate panda, broken paws, paws clipping through ground, limbs passing through bamboo, ears morphing or duplicating, waveform slicing through fur eyes or body, sparks passing through body bamboo or paws, glowing feet, amber foot rings, magic light under paws, cheap sci-fi HUD, text, logo, watermark, plastic fur, toy-like panda, oversaturated neon, comedy, childish, low resolution, flickering, jittery camera, broken continuity, uncanny animal movement, clumsy biped walk, human costume, rubber body`;
    await navigator.clipboard?.writeText(text);
    setCopiedShot(shot.id);
    window.setTimeout(() => setCopiedShot(''), 1800);
  };

  return (
    <main className="video-starter-page">
      <section className={`video-hero-preview ${isPanicStage ? 'panic-stage' : 'enhanced-stage'}`}>
        <video
          ref={heroVideoRef}
          key={heroKey}
          className="video-hero-media"
          autoPlay
          muted={!soundUnlocked}
          loop
          playsInline
          controls
          preload="metadata"
          poster={stageAssets.poster.url}
          aria-label="Panda Soundwalk hero video preview"
        >
          <source media="(max-width: 720px)" src={stageAssets.mobile.url} type="video/mp4" />
          <source src={stageAssets.mp4.url} type="video/mp4" />
          <source src={stageAssets.webm.url} type="video/webm" />
        </video>
        <SoundwaveOverlay stage={soundStage} videoRef={heroVideoRef} />
        <div className="video-hero-shade" />
        <div className="video-hero-copy">
          <span>{stageCopy.eyebrow}</span>
          <h1>{stageCopy.title}</h1>
          <p>{stageCopy.body}</p>
          <div className="video-actions">
            {isPanicStage ? (
              <>
                <button className="primary" onClick={startSetupAudio}><Volume2 size={18} /> Play soundwalk</button>
                <button className="ghost" onClick={completeSetup}><ShieldCheck size={18} /> Show tuned moment</button>
              </>
            ) : (
              <>
                <button className="primary" onClick={() => setShowFullCut(true)}><Play size={18} /> Watch full cut</button>
                <button className="ghost" onClick={replaySetup}><RotateCcw size={18} /> Replay opening</button>
              </>
            )}
            <a className="ghost button-link" href={stageAssets.mp4.url} download><Download size={18} /> Download video</a>
          </div>
          <div className="setup-signal-strip">
            <span>{stageCopy.pill}</span>
            <i>{soundUnlocked && cinematicAudioAllowed ? 'Audio live' : 'Muted preview'}</i>
          </div>
          <p className="video-audio-policy">{audioPolicyStatus}</p>
        </div>
      </section>

      <section className="video-build-console">
        <div className="video-build-head">
          <div>
            <span className="eyebrow">Live Video Test Bay</span>
            <h2>One hero video, two directing beats</h2>
            <p>The page copy stays clean while the director notes track the opening pressure beat and the tuned listening reveal behind the scenes.</p>
          </div>
          <div className="video-status-pill">Soundwave overlay online</div>
        </div>

        <div className="video-upload-grid">
          {exportList.map(([key, label, accept]) => (
            <label className="video-upload-tile" key={key}>
              <span>{label}</span>
              <strong>{assets[key].label}</strong>
              <small>{assets[key].meta}</small>
              <input
                type="file"
                accept={accept}
                onChange={(event) => addUpload(key, event.target.files?.[0])}
              />
            </label>
          ))}
        </div>

        <div className="video-direction-grid">
          <div>
            <h3>Director beat A</h3>
            <p>The opening beat should feel like a cluttered wild forest: insects, rain, bamboo snaps, distant predator pressure, and movement in the dark.</p>
          </div>
          <div>
            <h3>Do not accept</h3>
            <p>Cartoon panda, mascot suit, plastic fur, horror face, glowing feet, amber foot rings, waveform slicing through eyes or fur, phantom sparks, limb or bamboo clipping, jitter, text, logo, watermark, or goofy biped motion.</p>
          </div>
          <div>
            <h3>Director beat B</h3>
            <p>The listening reveal should show soundwaves originating from the forest, conforming around bamboo and fog, touching the ears, then dissipating.</p>
          </div>
        </div>

        <div className="flow-shot-panel">
          <div className="video-build-head compact">
            <div>
              <span className="eyebrow">Next: Flow/Veo Motion Pass</span>
              <h2>Generate a cleaner style-board motion pass, then approve it here</h2>
              <p>HeyGen is connected, but it is avatar-focused and does not fit this wildlife shot. Keep using Flow/OpenArt-style generation for the panda footage; this page keeps refreshing the pending media until you approve the revision.</p>
            </div>
            <div className={`video-status-pill ${motionApproved ? 'approved' : 'pending'}`}>
              {motionApproved ? 'Motion approved' : 'Auto-refreshing'}
            </div>
          </div>
          <div className={`motion-review-card ${motionApproved ? 'approved' : 'pending'}`}>
            <div>
              <span className="eyebrow">Motion pass {motionPass.revision}</span>
              <strong>{motionPass.summary}</strong>
              <small>{motionPass.blurFix}</small>
              <small>{motionPass.audio}</small>
              <em>{motionApproved ? `Approved ${new Date(motionApproval.approvedAt).toLocaleString()}` : `Pending review / refresh ${motionRefreshTick}`}</em>
            </div>
            <div className="motion-review-actions">
              <button className="primary" onClick={approveMotionPass} disabled={motionApproved}><CheckCircle2 size={18} /> Approve motion pass</button>
              <button className="ghost" onClick={resumeMotionPass} disabled={!motionApproved}><RotateCcw size={18} /> Resume auto-update</button>
            </div>
          </div>
          <div className="flow-shot-grid">
            {pandaFlowShotQueue.map((shot) => (
              <article className="flow-shot-card" key={shot.id}>
                <div>
                  <span>{shot.label}</span>
                  <strong>{shot.file}</strong>
                  <small>{shot.duration}</small>
                </div>
                <p>{shot.prompt}</p>
                <button className="ghost" onClick={() => copyShotPrompt(shot)}>
                  <Copy size={16} /> {copiedShot === shot.id ? 'Copied' : 'Copy prompt'}
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="video-qa-strip">
          {[
            'Opening beat uses wild nature/predator audio, not panda vocal noise',
            'Tuned beat swaps the preview to focused directional hearing',
            'Live overlay shows soundwave source, travel path, ear contact, and dissipation',
            'Full soundwalk cut crossfades forest clutter into clean focus',
            'Opening and listening clips are exported as WebM plus MP4 with audio',
            'Battle scars are subtle and healed, with no blood or horror',
            'Bat-like acoustic ears now keep one matched silhouette through the cut',
            'Teal radar lines are synchronized to left, right, and center predator cues',
            'Added foot-light rings are removed; paw glow is suppressed',
            'Ugly OpenArt close-crop is no longer the hero first impression',
            'Remaining issue: setup visual suggests pressure more than a literal pursuer',
            'Hero audio starts only after the user clicks setup audio or enters'
          ].map((item) => (
            <span key={item}><CheckCircle2 size={16} /> {item}</span>
          ))}
        </div>
      </section>

      {showFullCut && (
        <div className="video-modal" role="dialog" aria-modal="true" aria-label="Full Panda Soundwalk cut">
          <div className="video-modal-panel">
            <button className="ghost close-modal" onClick={() => setShowFullCut(false)}>Close</button>
            <video ref={fullCutRef} src={assets.storyFull.url} poster={assets.poster.url} controls autoPlay={cinematicAudioAllowed} muted={!cinematicAudioAllowed} playsInline preload="auto" className="full-cut-player" />
          </div>
        </div>
      )}
    </main>
  );
}

function RootShell() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return hash === '#video' ? <VideoStarterPage /> : <App />;
}

const rootElement = document.getElementById('root');
const cueforgeRoot = window.__cueforgeRoot || createRoot(rootElement);
window.__cueforgeRoot = cueforgeRoot;
cueforgeRoot.render(<RootShell />);
