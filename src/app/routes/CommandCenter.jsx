// src/app/routes/CommandCenter.jsx
// Smart onboarding route scaffold. Keep all logic local: no network calls, no silent routing changes.

import { useState } from 'react';
import { runQuickAssessment } from '../../smartOnboarding.js';
import ProgressRing from '../../ui/ProgressRing.jsx';

export default function CommandCenter() {
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuickStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runQuickAssessment();
      setAssessment(result);
      if (result?.error) setError(result.error);
    } catch (err) {
      console.error('Quick assessment failed', err);
      setError('Quick assessment failed. Run Auto Detect manually or retry after checking permissions.');
    } finally {
      setLoading(false);
    }
  };

  const primaryBottleneck = assessment?.bottleneck?.primaryBottleneck;
  const suggestions = assessment?.suggestions || assessment?.recommendations || [];

  return (
    <div className="command-center">
      <h1>CueForge • Make Your Audio Make Sense</h1>
      <p className="command-center-subtitle">
        Run a local quick assessment, find the first setup bottleneck, then move into Sound Match or Player Trial with proof.
      </p>

      <div className="quick-start-card">
        <button onClick={handleQuickStart} disabled={loading} className="big-button">
          {loading ? 'Analyzing Your Setup...' : 'Run 60-Second Smart Assessment'}
        </button>
        <small>No network calls. No silent driver changes. Saved only to local CueForge Audio DNA history.</small>
      </div>

      {error && <div className="assessment-error" role="alert">{error}</div>}

      {assessment?.completed && (
        <div className="assessment-results">
          <ProgressRing percent={assessment.score} />
          <h2>Setup Score: {assessment.score}/100</h2>

          <div className={`bottleneck severity-${primaryBottleneck?.type || primaryBottleneck?.severity || 'low'}`}>
            <strong>Primary Insight:</strong> {primaryBottleneck?.message || primaryBottleneck?.msg || 'No major bottleneck detected'}
            {primaryBottleneck?.fix && <small>{primaryBottleneck.fix}</small>}
          </div>

          {suggestions.length > 0 && (
            <ul className="next-actions">
              {suggestions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
