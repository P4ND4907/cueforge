import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AudioLines,
  BrainCircuit,
  Bug,
  ChevronRight,
  CheckCircle2,
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
  hearingScore
} from './hearingModel.js';
import { buildAutoTuneEq } from './autoTune.js';
import { createAudioDna } from './audioDna.js';
import { buildExportPack, downloadTextFile } from './exportPack.js';
import { blindMatchRounds, createBlindMatchResult } from './blindMatch.js';
import { createMaskingTune, maskingScenarios } from './maskingLab.js';
import { buildIssueReport, validateIssueReport } from './reportPack.js';
import { computeSetupReadiness } from './setupReadiness.js';
import { buildTesterPacket, feedbackDefaults, scoreTrialFeedback, trialSteps } from './playerTrial.js';
import { buildBetaTesterPacket, createBetaCheckIn, createTesterId, summarizeBetaActivity } from './betaCheckIn.js';
import { buildAudioEvidencePacket, createAudioEvidenceSummary } from './audioEvidence.js';
import {
  buildCommunityDraft,
  buildRedditSafeDraft,
  buildRollCallPrompt,
  buildSetupShareText,
  communitySources,
  createCommunityItem,
  feedbackTypes,
  summarizeCommunityFeedback
} from './communityHub.js';
import {
  appendGameplaySnapshot,
  createGameplaySnapshot,
  gameplaySaveDefaults,
  normalizeGameplaySaveSettings,
  shouldSaveGameplaySnapshot
} from './gameplaySave.js';
import './styles.css';

const headsetProfiles = [
  { name: 'Generic IEM FPS', correction: '-2dB 35Hz, -1.5dB 120Hz, +2dB 4.2kHz', focus: 'IEM footsteps without harsh treble', score: 91 },
  { name: 'HyperX mic cleanup', correction: 'High-pass feel, lower boom, consonant clarity', focus: 'Discord voice quality', score: 86 },
  { name: 'Generic FPS Headset', correction: '+3dB 2.5kHz, -2dB 120Hz', focus: 'Footsteps and voice clarity', score: 82 },
  { name: 'SteelSeries / Sonar Style', correction: '+2dB 4kHz, -1dB 8kHz', focus: 'Competitive imaging', score: 88 },
  { name: 'Music + Media', correction: '+2dB 60Hz, +1dB 12kHz', focus: 'Warm cinematic balance', score: 74 }
];

const gameProfiles = [
  { game: 'Valorant / CS2', mode: 'Tactical FPS', changes: ['Use local Valorant overlay: -0.8dB at 150Hz', '+1.6dB at 3kHz', '+1.9dB at 4.7kHz'] },
  { game: 'Warzone / Apex', mode: 'Battle Royale', changes: ['Lift 180Hz impacts', 'Boost 3kHz cues', 'Reduce explosions'] },
  { game: 'Discord + Game', mode: 'Comms Focus', changes: ['Voice band priority', 'Noise gate light', 'Music duck -8dB'] }
];

const bands = [31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];
const baseEq = [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5];

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

function buildApoConfig(eq, preamp = -4.5) {
  const lines = [`Preamp: ${preamp.toFixed(1)} dB`];
  eq.forEach((gain, index) => {
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

function App() {
  const [active, setActive] = useState('setup');
  const [eq, setEq] = useState(baseEq);
  const [sample, setSample] = useState('HyperX Cloud Alpha, Discord, Valorant, teammates say mic is a little boomy');
  const [analysis, setAnalysis] = useState(() => analyzeSample(sample));
  const [selectedGame, setSelectedGame] = useState(gameProfiles[0].game);
  const [selectedSourceProfile, setSelectedSourceProfile] = useState('iemFps');
  const [saved, setSaved] = useState(false);
  const [replayNotice, setReplayNotice] = useState('');
  const configRef = useRef(null);
  const apoConfig = useMemo(() => buildApoConfig(eq), [eq]);
  const sourceConfig = useMemo(
    () => buildApoConfigFromFilters(localSourceProfiles[selectedSourceProfile]),
    [selectedSourceProfile]
  );

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
      dna: latestDnaProfile()
    });

    Object.entries(pack.files).forEach(([filename, text], index) => {
      setTimeout(() => downloadTextFile(`cueforge-${filename}`, text), index * 160);
    });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Waves size={22} /></div>
          <div>
            <strong>CueForge</strong>
            <span>Tactical Audio Suite</span>
          </div>
        </div>
        <nav>
          {[
            ['setup', ShieldCheck, 'Setup Gate'],
            ['hub', Radio, 'Community Hub'],
            ['dashboard', Gauge, 'Control'],
            ['selftest', TestTube2, 'Self Test'],
            ['dna', BrainCircuit, 'Audio DNA'],
            ['blindmatch', Radio, 'Blind Match'],
            ['masking', AudioLines, 'Masking Lab'],
            ['trial', Gamepad2, 'Player Trial'],
            ['beta', Activity, 'Beta Check-in'],
            ['saves', Save, 'Gameplay Save'],
            ['reports', Bug, 'Report Lab'],
            ['calibration', Sparkles, 'Calibration'],
            ['mic', Mic, 'Mic Lab'],
            ['eq', SlidersHorizontal, 'EQ Studio'],
            ['games', Gamepad2, 'Game Profiles'],
            ['detect', Search, 'Auto Detect'],
            ['drivers', SlidersHorizontal, 'Driver Layer'],
            ['hearing', Headphones, 'Hearing Model'],
            ['inventory', BrainCircuit, 'System Info']
          ].map(([id, Icon, label]) => (
            <button className={active === id ? 'active' : ''} key={id} onClick={() => setActive(id)}>
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
            <h1>{active === 'dashboard' ? 'Audio Command Center' : sectionTitle(active)}</h1>
            <p>Test your mic, tune your IEMs, generate game-ready EQ, and keep your setup dialed in without guessing.</p>
          </div>
          <div className="top-actions">
            <button className="ghost" onClick={exportSetupPack}><Download size={18} /> Export Pack</button>
            <button className="primary" onClick={downloadConfig}><Download size={18} /> Export APO</button>
          </div>
        </header>

        {active === 'setup' && (
          <PlayerSetupGate
            eq={eq}
            apoConfig={apoConfig}
            onGo={setActive}
          />
        )}

        {active === 'hub' && <CommunityHubPage />}

        {active === 'dashboard' && (
          <section className="grid dashboard-grid">
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
              <h2>IEM + HyperX Baseline</h2>
              <p>Starts from local IEM filters, lifts 2-4.7kHz cues, trims low-end bloom, and keeps HyperX mic boom under control.</p>
              <button className="ghost" onClick={() => setActive('eq')}>Tune EQ <ChevronRight size={16} /></button>
            </Panel>
            <Panel title="Product Invention" icon={Radio}>
              <h2>Audio DNA</h2>
              <p>Learns your headset, games, and manual tweaks into a personal sound fingerprint for future automatic recommendations.</p>
            </Panel>
          </section>
        )}

        {active === 'selftest' && <SelfTestRunner />}

        {active === 'dna' && <AudioDnaPage eq={eq} />}

        {active === 'blindmatch' && <BlindMatchPage baseEq={eq} onApply={applyAutoTune} />}

        {active === 'masking' && <MaskingLabPage eq={eq} onApply={applyAutoTune} />}

        {active === 'trial' && (
          <PlayerTrialPage
            eq={eq}
            selectedGame={selectedGame}
            selectedSourceProfile={selectedSourceProfile}
          />
        )}

        {active === 'beta' && <BetaCheckInPage />}

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
            <Panel title="Mic Analyzer" icon={Mic}>
              <label className="field">
                <span>Describe headset / app / problem</span>
                <textarea value={sample} onChange={(e) => setSample(e.target.value)} />
              </label>
              <button className="primary" onClick={runAnalyzer}><Play size={18} /> Run analysis</button>
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
          </section>
        )}

        {active === 'eq' && (
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
        )}

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

        {active === 'detect' && <AutoDetect />}

        {active === 'drivers' && <DriverLayerPage />}

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

        {active === 'inventory' && <Inventory />}
      </main>
    </div>
  );
}

function PersonalHearingModel() {
  const [ear, setEar] = useState('left');
  const [step, setStep] = useState(0);
  const [volume, setVolume] = useState(18);
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem('cueforge-hearing-results');
      return saved ? JSON.parse(saved) : createEmptyHearingResults();
    } catch {
      return createEmptyHearingResults();
    }
  });
  const [status, setStatus] = useState('Start quiet. Use the lowest comfortable volume. Mark only what you can clearly hear.');

  const frequency = hearingFrequencies[step];
  const compensation = calculateCompensation(results);
  const score = hearingScore(results);
  const apoOverlay = buildHearingApoOverlay(compensation);

  const playHearingTone = async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    panner.pan.value = ear === 'left' ? -1 : 1;
    const safeGain = clamp(volume / 100, 0.02, 0.28);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(safeGain, context.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.9);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.95);
    setStatus(`${ear === 'left' ? 'Left' : 'Right'} ear ${frequency}Hz tone played at ${volume}%.`);
  };

  const markTone = (heard) => {
    const next = {
      ...results,
      [ear]: {
        ...results[ear],
        [frequency]: heard
      }
    };
    setResults(next);
    safeSetJson('cueforge-hearing-results', next);

    if (step < hearingFrequencies.length - 1) {
      setStep(step + 1);
    } else if (ear === 'left') {
      setEar('right');
      setStep(0);
    }
    setStatus(heard ? 'Marked as clearly heard.' : 'Marked as missed or unclear. The model will compensate gently.');
  };

  const reset = () => {
    const empty = createEmptyHearingResults();
    setResults(empty);
    localStorage.removeItem('cueforge-hearing-results');
    setEar('left');
    setStep(0);
    setStatus('Hearing model reset. Start with left ear at 250Hz.');
  };

  const downloadProfile = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      method: 'Manual pure-tone audibility check, not a medical test',
      score,
      results,
      compensation,
      equalizerApoOverlay: apoOverlay
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
      <p>This is a guided IEM/headphone audibility check. It builds a gentle compensation overlay from tones you miss. It is not a medical hearing test.</p>
      <div className="hearing-status">
        <Metric label="Progress" value={`${score.answered}/${score.total}`} tone={score.complete ? 'teal' : 'amber'} />
        <Metric label="Heard" value={`${score.percentHeard}%`} tone="teal" />
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
          <span>Tone volume: {volume}%</span>
          <input type="range" min="5" max="35" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
        </label>
      </div>
      <div className="live-actions">
        <button className="primary" onClick={playHearingTone}><Play size={18} /> Play {frequency}Hz</button>
        <button className="ghost" onClick={() => markTone(true)}>Clearly heard</button>
        <button className="ghost" onClick={() => markTone(false)}>Missed / unclear</button>
        <button className="ghost" onClick={reset}>Reset</button>
      </div>
      <p className="callout">{status}</p>
      <div className="hearing-curve">
        {compensation.map((point) => (
          <span
            key={point.frequency}
            title={`${point.frequency}Hz ${point.averageDb}dB`}
            style={{ height: `${20 + point.averageDb * 22}%` }}
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
              <li key={point.frequency}>{point.frequency}Hz - L {point.leftDb.toFixed(1)}dB / R {point.rightDb.toFixed(1)}dB</li>
            ))}
          </ul>
        </div>
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

function PlayerSetupGate({ eq, apoConfig, onGo }) {
  const [snapshot, setSnapshot] = useState({
    audioApi: false,
    micPermission: 'unknown',
    deviceCount: 0,
    bridgeLoaded: false,
    apoFound: false,
    selfTests: [],
    reportReady: false,
    hearingAnswered: 0
  });
  const [status, setStatus] = useState('Checking local setup...');

  const refresh = async () => {
    const audioApi = Boolean(window.AudioContext && navigator.mediaDevices?.enumerateDevices);
    const devices = await getBrowserAudioDevices();
    const bridge = await getGeneratedBridgeReport();
    const selfTests = getSavedJson('cueforge-self-test-results') || [];
    const hearing = getSavedJson('cueforge-hearing-results');
    const hearingAnswered = hearing ? hearingScore(hearing).answered : 0;
    const micPermission = await getMicPermissionState();

    setSnapshot({
      audioApi,
      micPermission,
      deviceCount: devices.length,
      bridgeLoaded: Boolean(bridge),
      apoFound: Boolean(bridge?.tools?.equalizerApo?.installed),
      selfTests,
      reportReady: Boolean(getSavedJson('cueforge-last-issue-report')),
      hearingAnswered
    });
    setStatus('Setup check updated.');
  };

  useEffect(() => {
    refresh();
  }, []);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setStatus('Mic permission granted. Refreshing setup check...');
    } catch {
      setStatus('Mic permission was not granted. Use the browser address bar permission control, then refresh.');
    }
    refresh();
  };

  const createQuickReport = async () => {
    const devices = await getBrowserAudioDevices();
    const bridge = await getGeneratedBridgeReport();
    const report = buildIssueReport({
      eq,
      apoConfig,
      selectedGame: 'Setup Gate',
      selectedSourceProfile: 'iemFps',
      currentPage: 'setup',
      sample: 'Setup readiness report',
      analysis: analyzeSample('Setup readiness report'),
      hearing: getSavedJson('cueforge-hearing-results'),
      dna: getSavedJson('cueforge-dna-history')?.[0] || null,
      bridgeReport: bridge,
      browserDevices: devices,
      selfTestResults: getSavedJson('cueforge-self-test-results') || [],
      notes: 'Quick setup recovery report.'
    });
    safeSetJson('cueforge-last-issue-report', report);
    downloadTextFile('cueforge-setup-ready-report.json', JSON.stringify(report, null, 2));
    setStatus('Redacted setup report created and saved for replay.');
    refresh();
  };

  const readiness = computeSetupReadiness(snapshot);
  const readyLabel = readiness.status === 'player-test-ready'
    ? 'Ready for controlled player test'
    : readiness.status === 'nearly-ready'
      ? 'Nearly ready'
      : 'Needs setup';

  return (
    <section className="grid two setup-grid">
      <Panel className="wide" title="Player Test Readiness" icon={ShieldCheck}>
        <div className={`readiness-hero ${readiness.status}`}>
          <div>
            <strong>{readiness.score}%</strong>
            <span>{readyLabel}</span>
          </div>
          <p>{status}</p>
        </div>
        <div className="setup-checks">
          {readiness.checks.map((check) => (
            <div className={`setup-check ${check.ready ? 'ready' : 'open'}`} key={check.id}>
              <CheckCircle2 size={18} />
              <div>
                <strong>{check.label}</strong>
                <span>{check.ready ? 'Verified' : check.fix}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Fix The Gaps" icon={Sparkles}>
        <ul className="clean-list">
          {readiness.nextActions.length === 0
            ? <li>Ready for a controlled player session. Run one match, export the report, then compare feedback.</li>
            : readiness.nextActions.map((action) => <li key={action}>{action}</li>)}
        </ul>
        <div className="live-actions">
          <button className="primary" onClick={requestMic}><Mic size={18} /> Grant mic permission</button>
          <button className="ghost" onClick={refresh}><RotateCcw size={18} /> Refresh check</button>
          <button className="ghost" onClick={() => onGo('selftest')}><TestTube2 size={18} /> Run self test</button>
          <button className="ghost" onClick={() => onGo('detect')}><Search size={18} /> Load bridge</button>
        </div>
      </Panel>
      <Panel title="Player Test Launch" icon={Gamepad2}>
        <p>Use this path for every tester so reports come back consistent and replayable.</p>
        <div className="live-actions">
          <button className="primary" onClick={() => onGo('calibration')}><Sparkles size={18} /> Start tuning</button>
          <button className="ghost" onClick={() => onGo('trial')}><Gamepad2 size={18} /> Start player trial</button>
          <button className="ghost" onClick={() => onGo('mic')}><Mic size={18} /> Check mic</button>
          <button className="ghost" onClick={createQuickReport}><Bug size={18} /> Create setup report</button>
          <button className="ghost" onClick={() => onGo('reports')}><RotateCcw size={18} /> Replay reports</button>
        </div>
      </Panel>
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
          <textarea value={feedback.notes} onChange={(event) => setFeedback((current) => ({ ...current, notes: event.target.value }))} />
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
  const [audioStatus, setAudioStatus] = useState('Audio evidence is off. Record only when a tester explicitly starts it.');
  const [latestClip, setLatestClip] = useState(null);
  const evidenceRef = useRef(null);
  const summary = summarizeBetaActivity(checkIns);

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
  };

  const resetTesterId = () => {
    const next = createTesterId();
    setTesterId(next);
    localStorage.setItem('cueforge-beta-tester-id', next);
    setCheckIns([]);
    safeSetJson('cueforge-beta-checkins', []);
  };

  const exportPacket = () => {
    const packet = buildBetaTesterPacket({ testerId, checkIns, notes, evidence });
    downloadTextFile('cueforge-beta-tester-packet.json', JSON.stringify(packet, null, 2));
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
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
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
        stream.getTracks().forEach((track) => track.stop());
        context.close?.();
        if (evidenceRef.current?.raf) cancelAnimationFrame(evidenceRef.current.raf);
        if (evidenceRef.current?.timeout) clearTimeout(evidenceRef.current.timeout);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        if (latestClip?.url) URL.revokeObjectURL(latestClip.url);
        const completedStats = { ...stats, durationMs: performance.now() - startedAt };
        const summaryItem = createAudioEvidenceSummary(completedStats);
        const nextEvidence = [...evidence, summaryItem].slice(-20);
        setEvidence(nextEvidence);
        safeSetJson('cueforge-audio-evidence', nextEvidence);
        setLatestClip({ url, blob, recordedAt: summaryItem.recordedAt });
        setRecording(false);
        setAudioStatus(`${Math.round(summaryItem.durationMs / 1000)}s evidence saved locally. ${summaryItem.recommendation}`);
        evidenceRef.current = null;
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
        evidenceRef.current.raf = requestAnimationFrame(tick);
      };

      evidenceRef.current = {
        recorder,
        stream,
        context,
        raf: null,
        timeout: window.setTimeout(stopAll, 12000)
      };
      recorder.start();
      setRecording(true);
      setAudioStatus('Recording 12s local mic evidence. Speak naturally, then play one loud callout.');
      tick();
    } catch {
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

  const downloadLatestClip = () => {
    if (!latestClip) return;
    const link = document.createElement('a');
    link.href = latestClip.url;
    link.download = `cueforge-audio-evidence-${latestClip.recordedAt.replace(/[:.]/g, '-')}.webm`;
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
            <input value={handle} onChange={(event) => setHandle(event.target.value)} />
          </label>
          <label className="field">
            <span>Game tested</span>
            <input value={game} onChange={(event) => setGame(event.target.value)} />
          </label>
          <label className="field wide-field">
            <span>Gear chain</span>
            <input value={gear} onChange={(event) => setGear(event.target.value)} />
          </label>
        </div>
        <div className="live-actions">
          <button className="primary" onClick={checkIn}><CheckCircle2 size={18} /> Record check-in</button>
          <button className="ghost" onClick={exportPacket} disabled={checkIns.length === 0}><Download size={18} /> Export beta packet</button>
          <button className="ghost" onClick={resetTesterId}><RotateCcw size={18} /> Reset ID</button>
        </div>
      </Panel>
      <Panel title="Active Tester Proof" icon={ShieldCheck}>
        <div className="metric-row selftest-summary">
          <Metric label="Check-ins" value={String(summary.totalCheckIns)} tone={summary.totalCheckIns ? 'teal' : 'amber'} />
          <Metric label="Active days" value={String(summary.uniqueDays)} tone={summary.uniqueDays > 1 ? 'teal' : 'amber'} />
          <Metric label="Source" value={window.cueforgeDesktop?.isDesktop ? 'Desktop' : 'Web'} tone="teal" />
        </div>
        <label className="field">
          <span>Tester notes for export</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
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
      <Panel title="Audio Evidence Logger" icon={Mic}>
        <p>Opt-in local mic clips for before/after proof. CueForge records a short clip only when you press the button, analyzes signal stats, and stores capped metadata locally.</p>
        <div className="live-actions">
          <button className="primary" onClick={startAudioEvidence}>{recording ? 'Stop evidence clip' : 'Record 12s mic evidence'}</button>
          <button className="ghost" onClick={downloadLatestClip} disabled={!latestClip}><Download size={18} /> Download latest clip</button>
          <button className="ghost" onClick={exportEvidencePacket} disabled={evidence.length === 0}><Download size={18} /> Export evidence JSON</button>
        </div>
        <p className="callout">{audioStatus}</p>
        <div className="stack">
          {evidence.length === 0 && <div className="data-card"><strong>No audio evidence yet</strong><span>Record one before tuning and one after a real match for useful comparison.</span></div>}
          {evidence.slice(-4).reverse().map((item) => (
            <div className="data-card" key={item.recordedAt}>
              <strong>{new Date(item.recordedAt).toLocaleString()} - {Math.round(item.durationMs / 1000)}s</strong>
              <span>Voice {item.voicePresence}% / noise {item.noise}% / clip {item.clipRisk}%</span>
              <small>{item.suggestedTweak}</small>
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

function CommunityHubPage() {
  const appUrl = 'https://p4nd4907.github.io/cueforge/';
  const discordUrl = 'https://discord.gg/vyQwyJ49v';
  const [items, setItems] = useState(() => getSavedJson('cueforge-community-feedback') || []);
  const [source, setSource] = useState('Discord');
  const [platform, setPlatform] = useState('Discord');
  const [redditMode, setRedditMode] = useState('community');
  const [handle, setHandle] = useState('');
  const [game, setGame] = useState('Tarkov / Siege / COD');
  const [gear, setGear] = useState('IEM/headset + mic');
  const [choice, setChoice] = useState('this');
  const [type, setType] = useState('Footsteps');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('Discord is the main hub. Use this page to keep updates clean and useful.');
  const summary = summarizeCommunityFeedback(items);
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

  const exportFeedback = () => {
    const packet = {
      schema: 'cueforge.community-packet.v1',
      exportedAt: new Date().toISOString(),
      summary,
      items
    };
    downloadTextFile('cueforge-community-feedback.json', JSON.stringify(packet, null, 2));
  };

  return (
    <section className="grid two">
      <Panel className="wide" title="Discord Command Center" icon={Radio}>
        <p>Use Discord as the main hub, then turn X and Reddit replies into the same clean signal. No hidden tracking, no private account data, no spam posting.</p>
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
            <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="optional" />
          </label>
          <label className="field">
            <span>Game / mode</span>
            <input value={game} onChange={(event) => setGame(event.target.value)} />
          </label>
          <label className="field">
            <span>Gear chain</span>
            <input value={gear} onChange={(event) => setGear(event.target.value)} />
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
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Paste or type the useful part. Emails and phone numbers are redacted on save." />
        </label>
        <div className="live-actions">
          <button className="primary" onClick={addFeedback}><CheckCircle2 size={18} /> Add feedback</button>
          <button className="ghost" onClick={exportFeedback} disabled={items.length === 0}><Download size={18} /> Export signal</button>
          <button className="ghost" onClick={clearFeedback} disabled={items.length === 0}><RotateCcw size={18} /> Clear local signal</button>
        </div>
        <p className="callout">{status}</p>
      </Panel>

      <Panel title="Roll Call Copy" icon={Activity}>
        <pre>{rollCall}</pre>
        <button className="primary" onClick={() => copyText(rollCall, 'Roll call')}>Copy roll call</button>
      </Panel>

      <Panel title="Post Draft" icon={Bug}>
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
              ['community', 'Community no-link'],
              ['profile', 'Profile post'],
              ['modmail', 'Modmail ask'],
              ['comment', 'Helpful reply']
            ].map(([id, label]) => (
              <button className={redditMode === id ? 'selected' : ''} key={id} onClick={() => setRedditMode(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <pre>{socialDraft}</pre>
        <button className="primary" onClick={() => copyText(socialDraft, `${platform} draft`)}>Copy draft</button>
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
    setup: 'Player Setup Gate',
    hub: 'Community Hub',
    mic: 'Mic Lab',
    selftest: 'Auto Self Test',
    dna: 'Audio DNA',
    blindmatch: 'Blind Match',
    masking: 'Tactical Masking Lab',
    trial: 'Player Trial',
    beta: 'Beta Check-in',
    saves: 'Gameplay Save',
    reports: 'Report Lab',
    calibration: 'Auto Calibration',
    eq: 'EQ Studio',
    games: 'Game Profiles',
    detect: 'Auto Detect',
    drivers: 'Driver Layer',
    hearing: 'Personal Hearing Model',
    inventory: 'System Info'
  }[id];
}

function MaskingLabPage({ eq, onApply }) {
  const [scenarioId, setScenarioId] = useState(maskingScenarios[0].id);
  const tune = createMaskingTune(eq, scenarioId);

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

function BlindMatchPage({ baseEq, onApply }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const [savedResult, setSavedResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cueforge-blind-match') || 'null');
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState('Pick the sample that actually feels better. No charts first.');

  const round = blindMatchRounds[roundIndex];
  const result = createBlindMatchResult(choices, baseEq);

  const playSample = async (sampleKey) => {
    const sample = round[sampleKey];
    const context = new AudioContext();
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
      gain.gain.value = 0.16 / (index + 1);
      oscillator.connect(gain).connect(master);
      oscillator.start(context.currentTime + index * 0.08);
      oscillator.stop(context.currentTime + 0.85 + index * 0.08);
    });

    master.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.05);
    setTimeout(() => context.close(), 1200);
    setStatus(`Played Sample ${sampleKey.toUpperCase()}. Choose based on comfort and detail, not loudness.`);
  };

  const choose = (sampleKey) => {
    const next = { ...choices, [round.id]: sampleKey };
    setChoices(next);
    if (roundIndex < blindMatchRounds.length - 1) {
      setRoundIndex(roundIndex + 1);
    }
    setStatus(`Locked ${round.label}: Sample ${sampleKey.toUpperCase()}.`);
  };

  const reset = () => {
    setChoices({});
    setRoundIndex(0);
    setStatus('Reset. Start the blind rounds again.');
  };

  const save = () => {
    const next = createBlindMatchResult(choices, baseEq);
    safeSetJson('cueforge-blind-match', next);
    setSavedResult(next);
    setStatus('Blind Match profile saved.');
  };

  const exportResult = () => {
    const payload = createBlindMatchResult(choices, baseEq);
    downloadTextFile('cueforge-blind-match.json', JSON.stringify(payload, null, 2));
  };

  const complete = result.completedRounds === blindMatchRounds.length;

  return (
    <section className="grid two">
      <Panel title="Blind Match Tuner" icon={Radio}>
        <p>CueForge learns from your ears, not a generic preset. Compare hidden A/B samples, pick what works, and it builds your personal curve.</p>
        <div className="dna-hero">
          <strong>{round.label}</strong>
          <span>Round {roundIndex + 1} of {blindMatchRounds.length}</span>
        </div>
        <p className="callout">{round.prompt}</p>
        <div className="blind-actions">
          <button className="ghost" onClick={() => playSample('a')}><Play size={18} /> Play Sample A</button>
          <button className="ghost" onClick={() => playSample('b')}><Play size={18} /> Play Sample B</button>
          <button className="primary" onClick={() => choose('a')}>Choose A</button>
          <button className="primary" onClick={() => choose('b')}>Choose B</button>
        </div>
        <p>{status}</p>
        <div className="live-actions">
          <button className="ghost" onClick={reset}>Reset rounds</button>
          <button className="ghost" onClick={save} disabled={!complete}><Save size={18} /> Save Match</button>
          <button className="ghost" onClick={exportResult} disabled={!complete}><Download size={18} /> Export Match</button>
          <button className="primary" onClick={() => onApply(result.eq)} disabled={!complete}><CheckCircle2 size={18} /> Apply learned EQ</button>
        </div>
      </Panel>
      <Panel title="Learned Curve" icon={SlidersHorizontal}>
        <Metric label="Confidence" value={`${result.confidence}%`} tone={complete ? 'teal' : 'amber'} />
        <p>{result.summary}</p>
        <div className="eq-preview">
          {result.eq.map((gain, index) => <span key={bands[index]} style={{ height: `${45 + gain * 8}%` }} title={`${bands[index]} ${gain}dB`} />)}
        </div>
        <ul className="clean-list">
          {result.picked.length === 0 && <li>No choices yet.</li>}
          {result.picked.map((pick) => <li key={pick}>{pick}</li>)}
        </ul>
      </Panel>
      <Panel className="wide" title="Saved Blind Match" icon={Save}>
        {!savedResult && <div className="data-card"><strong>No saved Blind Match yet</strong><span>Complete all rounds and save the result.</span></div>}
        {savedResult && (
          <div className="data-card">
            <strong>{savedResult.signature}</strong>
            <span>{savedResult.confidence}% confidence from {savedResult.completedRounds} rounds.</span>
            <small>{savedResult.summary}</small>
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
        notes
      });
      setLastReport(report);
      safeSetJson('cueforge-last-issue-report', report);
      setStatus(`Redacted report ready: ${report.diagnostics.browserDevices.length} browser audio devices, ${report.diagnostics.selfTestResults.length} self-test rows.`);
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
        notes
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
    setStatus('Report downloaded. It can be imported later to reproduce this setup.');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const validation = validateIssueReport(parsed);
      if (!validation.ok) throw new Error(validation.reason);
      setImported(parsed);
      setStatus(validation.reason);
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
    onReplay(imported.reproducibleState);
  };

  const savedReport = getSavedJson('cueforge-last-issue-report');
  const report = lastReport || (validateIssueReport(savedReport).ok ? savedReport : null);

  return (
    <section className="grid two">
      <Panel title="Redacted Player Report" icon={Bug}>
        <p>Create a bug report that keeps the useful setup data and removes local identifiers before it leaves the machine.</p>
        <label className="field">
          <span>Issue notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="live-actions">
          <button className="primary" onClick={collectReport}><Bug size={18} /> Create redacted report</button>
          <button className="ghost" onClick={downloadReport}><Download size={18} /> Download report</button>
          <button className="ghost" onClick={() => report ? onReplay(report.reproducibleState) : setStatus('Create or import a report first.')} disabled={!report}>
            <RotateCcw size={18} /> Replay last report
          </button>
        </div>
        <p className="callout">{status}</p>
        {replayNotice && <p className="success">{replayNotice}</p>}
      </Panel>
      <Panel title="Recover And Reproduce" icon={RotateCcw}>
        <p>Import a player report to restore the EQ, game profile, source target, mic notes, and analyzer state that caused the issue.</p>
        <input ref={fileInputRef} className="file-input" type="file" accept="application/json,.json" onChange={handleImport} />
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
        {!report && <div className="data-card"><strong>No report yet</strong><span>Create a report to preview the redacted payload.</span></div>}
        {report && (
          <div className="report-preview">
            <div className="metric-row selftest-summary">
              <Metric label="EQ bands" value={String(report.reproducibleState.eq.length)} tone="teal" />
              <Metric label="Devices" value={String(report.diagnostics.browserDevices.length)} tone="amber" />
              <Metric label="Self tests" value={String(report.diagnostics.selfTestResults.length)} tone="teal" />
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

  try {
    const response = await withTimeout(fetch('/tools/cueforge-audio-setup-report.json', { cache: 'no-store' }), 1800, null);
    if (!response) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) return null;
    return response.json();
  } catch {
    return null;
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

function AudioDnaPage({ eq }) {
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

  const dna = createAudioDna({
    eq,
    hearingScore: hearingState,
    micProfile,
    gameFocus,
    deviceStatus: { bridgeLoaded, apoFound }
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

    try {
      const response = await fetch('/tools/cueforge-audio-setup-report.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('missing report');
      const report = await response.json();
      record('Windows bridge report', 'pass', `${report.soundDevices?.length || 0} sound devices, Equalizer APO ${report.tools?.equalizerApo?.installed ? 'found' : 'not found'}, Sonar ${report.tools?.steelSeriesSonar?.installed ? 'found' : 'not found'}.`);
    } catch {
      record('Windows bridge report', 'warn', 'No generated report found. Run tools/Scan-AudioSetup.ps1.');
    }

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
      const exportOk = pack.files['README.txt'].includes('CueForge Setup Pack') && pack.files['equalizer-apo-config.txt'].includes('Filter 10');
      record('Export payloads', exportOk ? 'pass' : 'fail', exportOk ? 'APO config and setup pack files are generated.' : 'Export pack did not include expected files.');
    } catch {
      record('Autotune generation', 'fail', 'Autotune generator threw an error.');
    }

    try {
      const choices = Object.fromEntries(blindMatchRounds.map((round) => [round.id, 'a']));
      const match = createBlindMatchResult(choices, [-1, 1.5, 0.5, -2, -1, 0.5, 2.5, 3.2, 1.2, -0.5]);
      record('Blind Match learning', match.eq.length === 10 && match.completedRounds === blindMatchRounds.length ? 'pass' : 'fail', `${match.completedRounds} rounds produce a learned EQ curve.`);
    } catch {
      record('Blind Match learning', 'fail', 'Blind Match failed to generate a learned curve.');
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      record('Live mic permission', 'pass', 'Microphone access granted. Live mic feedback can run.');
    } catch {
      record('Live mic permission', 'warn', 'Microphone permission is blocked or not granted yet.');
    }

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
        <p>Runs the setup checks automatically: browser audio APIs, device enumeration, Windows bridge report, autotune, hearing model, storage, tone engine, and mic permission.</p>
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

        setLevel(clamp(Math.round(rms * 220), 0, 100));
        setNoise(clamp(Math.round((lowBand + highBand * 0.45) / 2.2), 0, 100));
        setVoicePresence(clamp(Math.round(voiceBand / 2.1), 0, 100));
        setClipRisk(clamp(Math.round(Math.max(0, peak - 0.72) * 360), 0, 100));
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
    clipRisk > 20
      ? 'Lower HyperX mic gain: clipping risk is high.'
      : noise > 55
        ? 'Room or cable noise is high. Try mic gain down and noise suppression light.'
        : voicePresence > 35 && level > 12
          ? 'Voice signal looks healthy for Discord testing.'
          : 'Speak normally into the HyperX mic to populate live readings.';

  return (
    <Panel className="wide" title="Live Mic + IEM Test Bench" icon={Activity}>
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

function AutoDetect() {
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('Auto scan starts when this page opens.');
  const [bridgeReport, setBridgeReport] = useState(null);
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [desktopBusy, setDesktopBusy] = useState(false);

  useEffect(() => {
    scanDevices({ auto: true });
    if (window.cueforgeDesktop?.info) {
      window.cueforgeDesktop.info()
        .then(setDesktopInfo)
        .catch(() => setDesktopInfo(null));
    }
  }, []);

  const scanDevices = async ({ auto = false } = {}) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setStatus('This browser does not expose audio device detection.');
      return;
    }

    try {
      setStatus(auto ? 'Auto-requesting mic permission for real device names.' : 'Requesting mic permission so device names can be read.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      const found = await navigator.mediaDevices.enumerateDevices();
      setDevices(found.filter((device) => device.kind.includes('audio')));
      setStatus('Scan complete. Device names are read locally in your browser.');
    } catch {
      const found = await navigator.mediaDevices.enumerateDevices();
      setDevices(found.filter((device) => device.kind.includes('audio')));
      setStatus('Permission was blocked or skipped, so some device names may be hidden. Use the browser permission icon near the address bar, allow microphone, then scan again.');
    }
  };

  const labels = devices.map((device) => device.label.toLowerCase()).join(' ');
  const hyperx = labels.includes('hyperx') || labels.includes('hyper x');
  const iem = labels.includes('iem') || labels.includes('usb-c') || labels.includes('dac') || labels.includes('headphones');
  const bridgeHyperx = Boolean(bridgeReport?.matches?.hyperx);
  const bridgeIem = Boolean(bridgeReport?.matches?.iemOrDac);
  const apoInstalled = Boolean(bridgeReport?.tools?.equalizerApo?.installed);
  const peaceInstalled = Boolean(bridgeReport?.tools?.peace?.installed);
  const sonarInstalled = Boolean(bridgeReport?.tools?.steelSeriesSonar?.installed);
  const virtualRouting = Boolean(bridgeReport?.tools?.vbCable?.installed || bridgeReport?.tools?.voicemeeter?.installed || bridgeReport?.matches?.virtualRouting);
  const setupShareText = useMemo(() => buildSetupShareText({ devices, bridgeReport }), [devices, bridgeReport]);
  const redditTesterAsk = useMemo(
    () => buildRedditSafeDraft({
      mode: 'community',
      summary: null,
      appUrl: 'https://p4nd4907.github.io/cueforge/',
      discordUrl: 'https://discord.gg/vyQwyJ49v'
    }),
    []
  );

  const importBridgeReport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setBridgeReport(parsed);
      setStatus('Imported Windows bridge report locally.');
    } catch {
      setStatus('Could not read that bridge report. Make sure it is the JSON from Scan-AudioSetup.ps1.');
    }
  };

  const loadGeneratedBridgeReport = async () => {
    try {
      const parsed = await getGeneratedBridgeReport();
      if (!parsed) throw new Error('missing report');
      setBridgeReport(parsed);
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
      setBridgeReport(result.report);
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

  return (
    <section className="grid two">
      <Panel title="Connected Device Scanner" icon={Search}>
        <p>{status}</p>
        <button className="primary" onClick={() => scanDevices()}><Search size={18} /> Scan audio devices</button>
        <div className="stack device-list">
          {devices.length === 0 && <div className="data-card"><strong>No scan yet</strong><span>The app auto-scans on open. If nothing appears, click scan and allow microphone permission.</span></div>}
          {devices.map((device, index) => (
            <div className="data-card" key={`${device.kind}-${index}`}>
              <strong>{autoNameDevice(device, index, bridgeReport)}</strong>
              <span>{device.kind.replace('audio', 'audio ')}</span>
              <small>{device.label ? 'Real browser device name' : 'Auto-name fallback until permission or bridge report gives the real name'}</small>
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
        </div>
        <label className="bridge-import">
          <span>Import Windows bridge report</span>
          <input type="file" accept="application/json,.json" onChange={importBridgeReport} />
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
      <Panel className="wide" title="Copy/Paste Setup Kit" icon={Save}>
        <p>Auto-detected setup text for testers, Discord reports, Reddit replies, and bug reports. It stays redacted: no raw device IDs, group IDs, paths, phone numbers, emails, tokens, or recovery info.</p>
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

function DriverLayerPage() {
  const [bridgeReport, setBridgeReport] = useState(null);
  const [status, setStatus] = useState('Load a Windows bridge report to see which companion audio layers are installed.');

  const loadReport = async () => {
    const report = await getGeneratedBridgeReport();
    if (!report) {
      setStatus('No bridge report found yet. Run Auto Detect > Windows scan in desktop mode, or import the report there.');
      return;
    }
    setBridgeReport(report);
    setStatus('Driver layer scan loaded.');
  };

  useEffect(() => {
    loadReport();
  }, []);

  const toolState = {
    'Equalizer APO': Boolean(bridgeReport?.tools?.equalizerApo?.installed),
    'Peace UI': Boolean(bridgeReport?.tools?.peace?.installed),
    'SteelSeries Sonar': Boolean(bridgeReport?.tools?.steelSeriesSonar?.installed),
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

function autoNameDevice(device, index, bridgeReport) {
  if (device.label) {
    if (/hyperx|hyper x/i.test(device.label)) return `${device.label} - HyperX mic candidate`;
    if (/iem|dac|usb audio|headphone|headset/i.test(device.label)) return `${device.label} - IEM/output candidate`;
    return device.label;
  }

  const bridgeDevices = [...(bridgeReport?.soundDevices || []), ...(bridgeReport?.mediaDevices || [])];
  const bridgeMatch = bridgeDevices[index]?.Name || bridgeDevices.find((item) => {
    if (device.kind === 'audioinput') return /mic|microphone|hyperx|hyper x/i.test(item.Name || '');
    return /headphone|headset|dac|usb audio|iem|speaker/i.test(item.Name || '');
  })?.Name;

  if (bridgeMatch) return `${bridgeMatch} - from Windows bridge`;
  if (device.kind === 'audioinput') return `Microphone input ${index + 1} - permission needed for real name`;
  if (device.kind === 'audiooutput') return `Headphone/output ${index + 1} - permission needed for real name`;
  return `Audio device ${index + 1} - permission needed for real name`;
}

function Inventory() {
  return (
    <section className="grid two">
      <Panel title="Product Build" icon={BrainCircuit}>
        <ul className="clean-list">
          <li>CueForge: gaming audio control center for IEMs, headsets, and mics.</li>
          <li>Core modules: Self Test, Auto Detect, Mic Lab, Calibration, EQ Studio, Hearing Model, Audio DNA.</li>
          <li>Output formats: Equalizer APO text config and JSON profile exports.</li>
          <li>Hardware focus: IEMs, HyperX-style boom mics, Equalizer APO, Peace, and Sonar workflows.</li>
        </ul>
      </Panel>
      <Panel title="Platform Status" icon={ShieldCheck}>
        <ul className="clean-list">
          <li>Runs locally in the browser with optional Windows bridge data.</li>
          <li>Includes live mic analysis, EQ sliders, game presets, hearing model, and APO export.</li>
          <li>Does not silently modify Windows audio drivers. You stay in control of apply steps.</li>
          <li>Desktop shell can run the Windows scan from inside CueForge and load the bridge report automatically.</li>
        </ul>
      </Panel>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
