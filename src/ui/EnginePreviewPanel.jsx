import React from 'react';
import { Gauge } from 'lucide-react';

export function EnginePreviewPanel({ engine, applyPath, onExport }) {
  return (
    <div className="command-card engine-preview-card">
      <div className="command-card-head">
        <Gauge size={18} />
        <span>Native Engine Preview</span>
      </div>
      <strong>{engine?.ready ? 'Ready to prototype' : 'Foundation mode'}</strong>
      <p>{engine?.boundary || 'Native processing stays explicit and reviewable.'}</p>
      <div className="engine-stage-grid">
        {(engine?.plans?.dsp?.stages || []).map((stage) => (
          <div key={stage.id}>
            <span>{stage.label}</span>
            <strong>{stage.status}</strong>
          </div>
        ))}
      </div>
      <div className="data-card quick-path">
        <strong>{applyPath?.mode || 'export-only'}</strong>
        <span>{applyPath?.reason || 'No native apply step runs silently.'}</span>
      </div>
      {engine?.plans?.spatial && (
        <div className="data-card quick-path">
          <strong>{engine.plans.spatial.selectedMode?.label || 'Safe Stereo'}</strong>
          <span>{engine.plans.spatial.warning}</span>
        </div>
      )}
      <button className="ghost" onClick={onExport}>Export release pack</button>
    </div>
  );
}
