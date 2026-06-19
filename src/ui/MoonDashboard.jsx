import { useState } from 'react';
import ProgressRing from './ProgressRing.jsx';
import { runFullSmartAssessment } from '../smartOnboarding.js';
import { extractor } from '../audio-science/wavFeatureExtractor.js';

export default function MoonDashboard() {
  const [assessment, setAssessment] = useState(null);
  const [clipReport, setClipReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const startAssessment = async () => {
    setLoading(true);
    const result = await runFullSmartAssessment();
    setAssessment(result);
    setLoading(false);
  };

  const handleClip = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await extractor.analyzeWav(file);
    setClipReport(result.coach?.summary || result.coachReport || result.error || 'Clip analyzed.');
  };

  return (
    <section className="moon-dashboard">
      <div className="moon-hero">
        <h1>CueForge</h1>
        <p>Your audio, finally understood.</p>
      </div>

      <div className="moon-grid">
        <div className="moon-card">
          <h2>Instant Intelligence</h2>
          <p>Run the full local assessment, find the bottleneck, and get the next playable step.</p>
          <button onClick={startAssessment} disabled={loading} className="big-button">
            {loading ? 'Analyzing...' : 'Launch Full Smart Assessment'}
          </button>
          {assessment && <ProgressRing percent={assessment.score} />}
          {assessment?.recommendations?.length > 0 && (
            <ul className="clean-list">
              {assessment.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>

        <div className="moon-card">
          <h2>Drop A Game Clip</h2>
          <p>Analyze a rendered WAV locally for post-mix transients, band balance, stereo width, and coach notes.</p>
          <div className="clip-analyzer">
            <input type="file" accept="audio/wav,audio/*" onChange={handleClip} />
            {clipReport && <pre>{clipReport}</pre>}
          </div>
        </div>
      </div>

      <div className="data-card">
        <strong>Local, private, honest, powerful</strong>
        <span>No raw clip is stored in the report. CueForge keeps derived evidence and conservative coaching only.</span>
      </div>
    </section>
  );
}
