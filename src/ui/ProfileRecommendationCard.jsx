import React from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';

export function ProfileRecommendationCard({ profile, onApply, onOpen }) {
  const recommendation = profile?.recommendation;

  return (
    <div className="command-card profile-rec-card">
      <div className="command-card-head">
        <BrainCircuit size={18} />
        <span>Profile Engine v2</span>
      </div>
      <strong>{recommendation?.label || 'Build profile'}</strong>
      <p>{recommendation?.explanation || 'Run setup first so CueForge can build a personal sound identity from the full chain.'}</p>
      <div className="identity-row">
        {(profile?.identity || ['setup-first']).map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="command-actions">
        <button className="primary" onClick={onApply}><Sparkles size={18} /> Apply starting profile</button>
        <button className="ghost" onClick={() => onOpen?.('dna')}>Open DNA</button>
      </div>
    </div>
  );
}
