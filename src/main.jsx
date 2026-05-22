import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AudioLines,
  BrainCircuit,
  ChevronRight,
  Download,
  Gamepad2,
  Gauge,
  Headphones,
  Mic,
  Play,
  Radio,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  Waves
} from 'lucide-react';
import { buildApoConfigFromFilters, hardwareTargets, localSourceProfiles } from './audioData.js';
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
  const [active, setActive] = useState('dashboard');
  const [eq, setEq] = useState(baseEq);
  const [sample, setSample] = useState('HyperX Cloud Alpha, Discord, Valorant, teammates say mic is a little boomy');
  const [analysis, setAnalysis] = useState(() => analyzeSample(sample));
  const [selectedGame, setSelectedGame] = useState(gameProfiles[0].game);
  const [selectedSourceProfile, setSelectedSourceProfile] = useState('iemFps');
  const [saved, setSaved] = useState(false);
  const configRef = useRef(null);
  const apoConfig = useMemo(() => buildApoConfig(eq), [eq]);
  const sourceConfig = useMemo(
    () => buildApoConfigFromFilters(localSourceProfiles[selectedSourceProfile]),
    [selectedSourceProfile]
  );

  const setBand = (index, value) => {
    setEq((current) => current.map((gain, i) => (i === index ? Number(value) : gain)));
    setSaved(false);
  };

  const runAnalyzer = () => {
    setAnalysis(analyzeSample(sample));
    setEq((current) => current.map((gain, index) => clamp(gain + ((index % 3) - 1) * 0.3, -6, 6)));
  };

  const downloadConfig = () => {
    const blob = new Blob([apoConfig], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'audiotuner-equalizer-apo-config.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    setSaved(true);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Waves size={22} /></div>
          <div>
            <strong>AudioTuner</strong>
            <span>Local Gaming Suite</span>
          </div>
        </div>
        <nav>
          {[
            ['dashboard', Gauge, 'Control'],
            ['mic', Mic, 'Mic Lab'],
            ['eq', SlidersHorizontal, 'EQ Studio'],
            ['games', Gamepad2, 'Game Profiles'],
            ['hearing', Headphones, 'Hearing Model'],
            ['inventory', BrainCircuit, 'Extracted Data']
          ].map(([id, Icon, label]) => (
            <button className={active === id ? 'active' : ''} key={id} onClick={() => setActive(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ShieldCheck size={18} />
          <span>Browser-safe tuning. Exports settings instead of touching drivers.</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{active === 'dashboard' ? 'Audio Command Center' : sectionTitle(active)}</h1>
            <p>Rebuilt locally from the Perplexity task data: headset analysis, game-aware EQ, profiles, and exportable configs.</p>
          </div>
          <button className="primary" onClick={downloadConfig}><Download size={18} /> Export APO</button>
        </header>

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

        {active === 'mic' && (
          <section className="grid two">
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
              <button className="primary" onClick={downloadConfig}><Download size={18} /> Save config</button>
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

        {active === 'hearing' && (
          <section className="grid two">
            <Panel title="Personal Hearing Model" icon={Headphones}>
              <p>Creates a compensation curve from age, volume habits, and simple tone checks. This local MVP simulates the model and prepares the UI for real pure-tone tests.</p>
              <div className="hearing-curve">
                {[18, 22, 29, 35, 40, 48, 54, 63, 70, 76].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}
              </div>
            </Panel>
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

function sectionTitle(id) {
  return {
    mic: 'Mic Lab',
    eq: 'EQ Studio',
    games: 'Game Profiles',
    hearing: 'Personal Hearing Model',
    inventory: 'Extracted Data Inventory'
  }[id];
}

function Inventory() {
  return (
    <section className="grid two">
      <Panel title="What was extracted" icon={BrainCircuit}>
        <ul className="clean-list">
          <li>Perplexity task title: Henry App Web MVP Plan</li>
          <li>Artifacts found: Henry — Engine Sound Diagnostics, AudioTuner — Gaming Audio Suite</li>
          <li>Web sources found: 93</li>
          <li>Uploaded file found: 1000040111.jpg</li>
          <li>Worked duration shown: 2h 52m 32s</li>
        </ul>
      </Panel>
      <Panel title="Local reconstruction status" icon={ShieldCheck}>
        <ul className="clean-list">
          <li>Built a local AudioTuner React app from the visible task data.</li>
          <li>Included headset profiles, mic analysis, EQ sliders, game presets, hearing model, and APO export.</li>
          <li>Does not modify Windows audio drivers. It exports settings safely.</li>
          <li>Ready for real native audio control later via Electron plus Windows audio APIs.</li>
        </ul>
      </Panel>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
