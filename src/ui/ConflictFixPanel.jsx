import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function ConflictFixPanel({ conflicts, onOpen }) {
  const items = conflicts?.conflicts || [];
  const doctor = conflicts?.audioDoctor || null;
  const health = conflicts?.chainHealth || null;

  return (
    <div className="command-card conflict-card">
      <div className="command-card-head">
        <ShieldCheck size={18} />
        <span>Conflict Detector</span>
      </div>
      {health && (
        <div className="chain-health-card">
          <div className="chain-health-score">
            <span>{health.label || 'Audio Chain Health'}</span>
            <strong>{health.score}/100</strong>
          </div>
          <HealthList title="Blockers" empty="None" items={health.blockers} />
          <HealthList title="Warnings" empty="None" items={health.warnings} />
          <div className="chain-health-next">
            <span>Next action</span>
            <strong>{health.nextAction}</strong>
          </div>
        </div>
      )}
      {doctor && (
        <div className={`audio-doctor-card doctor-${doctor.status || 'ready'}`}>
          <span>Audio doctor</span>
          <strong>{doctor.headline}</strong>
          <p>{doctor.summary}</p>
          {doctor.layers?.length > 0 && (
            <div className="doctor-layer-row" aria-label="Detected sound shaping layers">
              {doctor.layers.slice(0, 4).map((layer) => <em key={layer}>{layer}</em>)}
            </div>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <div className="conflict-empty">
          <strong>No major conflicts</strong>
          <span>Still prove the profile with a real before/after match.</span>
        </div>
      ) : (
        <div className="conflict-list">
          {items.slice(0, 5).map((item) => (
            <button className={`conflict-item severity-${item.severity}`} key={item.id} onClick={() => onOpen?.(routeForConflict(item.id))}>
              <strong>{item.title}</strong>
              <span>{item.fix}</span>
              <em>{item.severity}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthList({ title, empty, items = [] }) {
  const visible = items.length ? items : [empty];

  return (
    <div className="chain-health-list">
      <span>{title}</span>
      <ul>
        {visible.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function routeForConflict(id) {
  if (id.includes('apo') || id.includes('sonar') || id.includes('route') || id.includes('shaper') || id.includes('processing')) return 'detect';
  if (id.includes('hearing') || id.includes('treble')) return 'hearing';
  if (id.includes('match')) return 'beta';
  if (id.includes('input')) return 'mic';
  return 'detect';
}
