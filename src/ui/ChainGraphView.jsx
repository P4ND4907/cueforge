import React from 'react';
import { AlertTriangle, AudioLines, Gamepad2, Headphones, MessageSquare, Mic, Monitor, SlidersHorizontal, UserRound } from 'lucide-react';
import { buildChainWarnings, buildReadableAudioChainPath, buildReadableMicChainPath } from '../core/chainGraph.js';

const pathIcons = {
  game: Gamepad2,
  'windows-output': Monitor,
  layers: SlidersHorizontal,
  'physical-output': Headphones,
  player: UserRound,
  mic: Mic,
  'windows-input': Monitor,
  'mic-layers': SlidersHorizontal,
  'chat-target': MessageSquare
};

export function ChainGraphView({ graph }) {
  const outputPath = buildReadableAudioChainPath(graph);
  const micPath = buildReadableMicChainPath(graph);
  const warnings = buildChainWarnings(graph);

  return (
    <div className="command-card chain-graph-card">
      <div className="command-card-head">
        <AudioLines size={18} />
        <span>Audio Chain Graph</span>
      </div>
      <p className="chain-intro">The hidden Windows audio mess, drawn as what you hear and what your teammates hear.</p>
      <div className="chain-path-grid">
        <ChainPath title="Output path" subtitle="Game sound to your ears" stages={outputPath} />
        <ChainPath title="Mic path" subtitle="Your voice to chat or stream" stages={micPath} />
      </div>
      <div className="chain-warning-list" aria-label="Chain warnings and recommended fixes">
        {warnings.length ? warnings.map((warning) => (
          <div className={`chain-warning chain-warning-${warning.severity}`} key={warning.id}>
            <AlertTriangle size={16} />
            <div>
              <strong>{warning.title}</strong>
              <span>{warning.detail}</span>
              <small>{warning.fix}</small>
            </div>
          </div>
        )) : (
          <div className="chain-warning chain-warning-clear">
            <AudioLines size={16} />
            <div>
              <strong>Chain looks clean enough to test</strong>
              <span>No obvious routing or processing stack was detected.</span>
              <small>Run one real match check before calling the profile proven.</small>
            </div>
          </div>
        )}
      </div>
      <div className="chain-stats">
        <span>{graph?.confidence ?? 0}% confidence</span>
        <span>{graph?.summary?.inputs || 0} inputs</span>
        <span>{graph?.summary?.outputs || 0} outputs</span>
        <span>{graph?.summary?.companions || 0} layers</span>
        <span>{graph?.summary?.defaults || 0} defaults</span>
        <span>{graph?.summary?.sessions || 0} app hints</span>
      </div>
    </div>
  );
}

function ChainPath({ title, subtitle, stages }) {
  return (
    <div className="chain-path-block">
      <div className="chain-path-head">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="chain-path" aria-label={title}>
        {stages.map((stage, index) => {
          const Icon = pathIcons[stage.id] || AudioLines;
          return (
            <React.Fragment key={stage.id}>
              <div className={`chain-step chain-${stage.status}`}>
                <div className="chain-step-icon"><Icon size={18} /></div>
                <div className="chain-step-copy">
                  <span>{stage.label}</span>
                  <strong>{stage.value}</strong>
                  <small>{stage.detail}</small>
                  {stage.items?.length > 0 && (
                    <div className="chain-layer-tags">
                      {stage.items.slice(0, 6).map((item) => <em key={item}>{item}</em>)}
                    </div>
                  )}
                </div>
              </div>
              {index < stages.length - 1 && <div className="chain-arrow" aria-hidden="true" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
