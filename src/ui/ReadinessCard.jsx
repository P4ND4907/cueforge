import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export function ReadinessCard({ readiness, onOpen }) {
  const score = readiness?.score ?? 0;
  const tone = score >= 80 ? 'ready' : score >= 55 ? 'warn' : 'need';

  return (
    <div className={`command-card readiness-card readiness-${tone}`}>
      <div className="command-card-head">
        <ShieldCheck size={18} />
        <span>Readiness v2</span>
      </div>
      <strong>{score}%</strong>
      <p>{readiness?.status || 'needs-foundation'}</p>
      <div className="readiness-bar" aria-label={`Readiness ${score}%`}>
        <span style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </div>
      <div className="readiness-next">
        <span>Best unlock</span>
        <strong>{readiness?.nextActions?.[0] || readiness?.warnings?.[0] || readiness?.blockers?.[0] || 'Run Auto Detect.'}</strong>
      </div>
      <ReadinessList title="Why this score" items={[...(readiness?.blockers || []), ...(readiness?.warnings || [])]} />
      <div className="mini-gates">
        {(readiness?.gates || []).slice(0, 5).map((gate) => (
          <button key={gate.id} onClick={() => onOpen?.(routeForGate(gate.id))} title={gate.fix}>
            <CheckCircle2 size={14} />
            <span>{gate.label}</span>
            <em>{gate.status}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadinessList({ title, items = [] }) {
  const visible = items
    .map((item) => typeof item === 'string' ? item : item?.label || item?.title || item?.fix)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="readiness-reasons">
      <span>{title}</span>
      {visible.length ? (
        <ul>
          {visible.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <small>No blocker from the current setup report.</small>
      )}
    </div>
  );
}

function routeForGate(id) {
  if (id.includes('device') || id.includes('chain') || id.includes('desktop') || id.includes('apply') || id.includes('export')) return 'detect';
  if (id.includes('profile')) return 'dna';
  if (id.includes('hearing')) return 'hearing';
  if (id.includes('blind')) return 'blindmatch';
  if (id.includes('masking')) return 'masking';
  if (id.includes('channel')) return 'mic';
  if (id.includes('conflict')) return 'detect';
  if (id.includes('self')) return 'selftest';
  if (id.includes('mic')) return 'mic';
  if (id.includes('match')) return 'beta';
  return 'detect';
}
