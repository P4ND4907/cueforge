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
import { analyzeAudioFrame, createEmptySignalAnalysis, signalBands } from './signalAnalyzer.js';
import {
  createUiFeedbackNote,
  summarizeUiFeedback,
  UI_FEEDBACK_KEY,
  uiFeedbackTags
} from './uiFeedback.js';
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
  const [setupComplete, setSetupComplete] = useState(() => localStorage.getItem('cueforge-setup-complete') === 'yes');
  const [active, setActive] = useState('dashboard');
  const [eq, setEq] = useState(baseEq);
  const [sample, setSample] = useState('HyperX Cloud Alpha, Discord, Valorant, teammates say mic is a little boomy');
  const [analysis, setAnalysis] = useState(() => analyzeSample(sample));
  const [selectedGame, setSelectedGame] = useState(gameProfiles[0].game);
  const [selectedSourceProfile, setSelectedSourceProfile] = useState('iemFps');
  const [saved, setSaved] = useState(false);
  const [replayNotice, setReplayNotice] = useState('');
  const [uiNotes, setUiNotes] = useState(() => getSavedJson(UI_FEEDBACK_KEY) || []);
  const [uiNoteDraft, setUiNoteDraft] = useState(null);
  const [uiNoteNotice, setUiNoteNotice] = useState(() => localStorage.getItem('cueforge-ui-note-notice-dismissed') !== 'yes');
  const [uiNoteStatus, setUiNoteStatus] = useState('Right-click any app area to leave a developer note.');
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
      dna: latestDnaProfile(),
      uiFeedbackNotes: uiNotes
    });

    Object.entries(pack.files).forEach(([filename, text], index) => {
      setTimeout(() => downloadTextFile(`cueforge-${filename}`, text), index * 160);
    });
  };

  const handleUiContextMenu = (event) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.ui-note-popover')) return;
    event.preventDefault();

    const rect = target.getBoundingClientRect();
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
      position: {
        x: Math.max(16, Math.min(event.clientX, window.innerWidth - 360)),
        y: Math.max(16, Math.min(event.clientY, window.innerHeight - 260))
      },
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
      {uiNoteNotice && (
        <div className="tester-note-banner">
          <Bug size={18} />
          <span>Personal UI debugger is on: right-click any CueForge area to tag a note. Notes stay local and only ride with the redacted report or export pack you choose to send.</span>
          <button className="ghost" onClick={dismissUiNoteNotice}>Got it</button>
        </div>
      )}
      {uiNoteStatus && <p className="ui-note-status">{uiNoteStatus}</p>}
      {uiNoteDraft && (
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
    localStorage.removeItem('cueforge-setup-complete');
    setSetupComplete(false);
    setActive('dashboard');
  };

  if (!setupComplete) {
    return (
      <div className="setup-journey-shell" onContextMenu={handleUiContextMenu}>
        <SetupJourney onComplete={completeSetup} onSkip={() => completeSetup({ skipped: true, completedAt: new Date().toISOString() })} />
        {feedbackLayer}
      </div>
    );
  }

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

      <main onContextMenu={handleUiContextMenu}>
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
        {feedbackLayer}

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
            uiNotes={uiNotes}
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

        {active === 'inventory' && <Inventory onOpen={setActive} onRerunSetup={rerunSetup} uiNotes={uiNotes} onClearUiNotes={() => {
          setUiNotes([]);
          safeSetJson(UI_FEEDBACK_KEY, []);
          setUiNoteStatus('Developer UI notes cleared from this browser.');
        }} />}
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
  return (
    <div
      className="ui-note-popover"
      style={{ left: `${draft.position.x}px`, top: `${draft.position.y}px` }}
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
      <label className="field">
        <span>Retrieval tag</span>
        <select value={draft.tag} onChange={(event) => onChange({ ...draft, tag: event.target.value })}>
          {uiFeedbackTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Note for developer</span>
        <textarea
          value={draft.note}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          placeholder="What felt confusing, broken, too small, missing, or annoying?"
          autoFocus
        />
      </label>
      <div className="live-actions">
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

function SetupJourney({ onComplete, onSkip }) {
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
  const profileStrength = Math.round((Number(profile.footstepFocus) + Number(profile.commsFocus) + Number(profile.bassControl) + Number(profile.fatigueControl)) / 4 * 10);

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updateTool = (key, value) => setProfile((current) => ({
    ...current,
    tools: { ...current.tools, [key]: value }
  }));

  useEffect(() => {
    if (soundRef.current) pulseSetupStep(step);
  }, [step]);

  useEffect(() => () => stopSetupSoundscape({ immediate: true }), []);

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
            <button className="primary" onClick={startSetupSoundscape}><Volume2 size={18} /> {soundActive ? 'Stop soundwalk' : 'Start soundwalk'}</button>
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
  uiNotes = [],
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
        notes
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
              <Metric label="UI notes" value={String(report.diagnostics.uiFeedbackNotes?.length || 0)} tone={report.diagnostics.uiFeedbackNotes?.length ? 'teal' : 'amber'} />
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

function Inventory({ onOpen, onRerunSetup, uiNotes = [], onClearUiNotes }) {
  const selfTests = getSavedJson('cueforge-self-test-results') || [];
  const evidence = getSavedJson('cueforge-audio-evidence') || [];
  const checkIns = getSavedJson('cueforge-beta-checkins') || [];
  const snapshots = getSavedJson('cueforge-gameplay-snapshots') || [];
  const lastReport = getSavedJson('cueforge-last-issue-report');
  const uiSummary = summarizeUiFeedback(uiNotes);
  const desktopReady = Boolean(window.cueforgeDesktop?.isDesktop);
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
      </Panel>

      <Panel title="Fast Path" icon={Search}>
        <p>Use these in order before handing the app to a tester.</p>
        <div className="system-action-grid">
          <button className="primary" onClick={() => onOpen('selftest')}><TestTube2 size={18} /> Run self test</button>
          <button className="ghost" onClick={() => onOpen('mic')}><Mic size={18} /> Open analyzer</button>
          <button className="ghost" onClick={() => onOpen('beta')}><Activity size={18} /> Record check-in</button>
          <button className="ghost" onClick={() => onOpen('reports')}><Bug size={18} /> Create report</button>
          <button className="ghost" onClick={onRerunSetup}><RotateCcw size={18} /> Rerun setup</button>
        </div>
        <p className="callout">{lastReport ? 'A replayable report exists locally. Import/export can prove the current state.' : 'Create one report after the next real test so failures can be replayed.'}</p>
      </Panel>

      <Panel title="Developer UI Notes" icon={Bug}>
        <p>Right-click notes are private to the local report/export loop. They are not posted publicly and they do not leave the machine unless a tester sends the packet.</p>
        <div className="metric-row selftest-summary">
          <Metric label="Captured" value={String(uiSummary.total)} tone={uiSummary.total ? 'teal' : 'amber'} />
          <Metric label="Top tag" value={uiSummary.topTag} tone={uiSummary.total ? 'teal' : 'amber'} />
        </div>
        {uiSummary.latest ? (
          <div className="data-card">
            <strong>{uiSummary.latest.tag} / {uiSummary.latest.page}</strong>
            <span>{uiSummary.latest.note}</span>
            <small>{uiSummary.latest.target.panel || uiSummary.latest.target.label}</small>
          </div>
        ) : (
          <div className="data-card">
            <strong>No notes yet</strong>
            <span>Right-click any app area to tag confusing text, layout issues, broken controls, or ideas.</span>
          </div>
        )}
        <div className="live-actions">
          <button className="ghost" onClick={() => downloadTextFile('cueforge-ui-feedback-notes.json', JSON.stringify(uiNotes, null, 2))} disabled={!uiNotes.length}><Download size={18} /> Export notes</button>
          <button className="ghost" onClick={onClearUiNotes} disabled={!uiNotes.length}><RotateCcw size={18} /> Clear notes</button>
        </div>
      </Panel>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
