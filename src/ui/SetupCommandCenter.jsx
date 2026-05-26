import React from 'react';
import { Activity, AudioLines, BrainCircuit, Bug, CheckCircle2, Download, Gamepad2, Gauge, Headphones, Mic, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { buildCommandCenterSummary } from '../core/commandCenterFlow.js';
import { summarizeCueForgeBrain } from '../core/cueforgeBrain.js';
import { ChainGraphView } from './ChainGraphView.jsx';
import { ConflictFixPanel } from './ConflictFixPanel.jsx';
import { EnginePreviewPanel } from './EnginePreviewPanel.jsx';
import { ProfileRecommendationCard } from './ProfileRecommendationCard.jsx';
import { ReadinessCard } from './ReadinessCard.jsx';

const cardIcons = {
  'setup-health': ShieldCheck,
  'active-profile': Sparkles,
  'audio-chain': AudioLines,
  'next-best-action': Gauge,
  'last-match-feedback': Gamepad2,
  'export-apply-status': Download
};

const questionIcons = {
  'hardware-software': Headphones,
  'active-route': AudioLines,
  'chain-conflicts': Bug,
  'tests-replay': CheckCircle2,
  'safest-next-step': Gauge
};

const stepIcons = {
  start: Gauge,
  'setup-command-center': ShieldCheck,
  'auto-detect': Search,
  'chain-graph': AudioLines,
  'conflict-fix': Bug,
  'output-check': Headphones,
  'mic-check': Mic,
  'hearing-model': Headphones,
  'choose-game': Gamepad2,
  'blind-match': Activity,
  'masking-lab': AudioLines,
  'profile-recommendation': Sparkles,
  'engine-preview': Gauge,
  'export-apply': Download,
  'player-trial': Gamepad2,
  'report-audio-dna': Bug
};

export function SetupCommandCenter({
  state,
  context,
  onOpen,
  onApplyProfile,
  onExportPack,
  compact = false
}) {
  const summary = buildCommandCenterSummary(state, context);
  const brain = summarizeCueForgeBrain(state?.brain);
  const brainPillars = (state?.brain?.pillars || []).slice(0, 7);
  const nextAction = summary.nextBestAction;
  const autoDetect = state?.autoDetectReport || {};
  const openRoute = (route) => {
    if (route === 'export') {
      onExportPack?.();
      return;
    }
    onOpen?.(route || 'dashboard');
  };

  return (
    <section className={`setup-command-center ${compact ? 'compact' : ''}`}>
      <div className="command-hero">
        <div>
          <span>CueForge v0.2.0-alpha.3</span>
          <h2>Setup Command Center</h2>
          <p>Audio chain verifier + personal sound engine. Prove the setup, learn the player, warn on conflicts, map the game intent, and export safely.</p>
        </div>
        <div className="command-next">
          <span>Next best move</span>
          <strong>{nextAction}</strong>
        </div>
      </div>
      <div className="command-actions command-main-actions">
        <button className="primary" onClick={() => onOpen?.('detect')}><Search size={18} /> Run setup scan</button>
        <button className="ghost" onClick={onApplyProfile}><Sparkles size={18} /> Apply profile brain</button>
        <button className="ghost" onClick={onExportPack}><Download size={18} /> Export release pack</button>
      </div>
      <div className="command-operating-panel">
        <div className="command-operating-head">
          <span>Default operating mode</span>
          <strong>One place for the whole setup.</strong>
          <small>Command Center answers the setup questions before the player touches EQ, routes, or match testing.</small>
        </div>
        <div className="command-operating-grid" aria-label="Setup Command Center operating questions">
          {summary.operatingQuestions.map((item) => {
            const Icon = questionIcons[item.id] || Gauge;
            return (
              <button className={`command-question-card question-${item.id}`} key={item.id} onClick={() => openRoute(item.route)}>
                <span><Icon size={16} /> {item.question}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </button>
            );
          })}
        </div>
      </div>
      <div className="command-brain-strip" aria-label="CueForge differentiator proof">
        <div className="brain-score">
          <span><BrainCircuit size={17} /> CueForge Brain</span>
          <strong>{brain.score}/100</strong>
          <small>{brain.title} - {brain.tier.replace(/[-_]+/g, ' ')}</small>
        </div>
        <div className="brain-proof-grid">
          {brainPillars.map((pillar) => (
            <div className={`brain-proof-item status-${pillar.status}`} key={pillar.id}>
              <span>{pillar.label}</span>
              <strong>{pillar.status.replace(/[-_]+/g, ' ')}</strong>
              <small>{pillar.proof?.[0] || pillar.nextAction}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="command-home-grid" aria-label="CueForge home summary cards">
        {summary.cards.map((card) => {
          const Icon = cardIcons[card.id] || Gauge;
          return (
            <button className={`command-home-card card-${card.id}`} key={card.id} onClick={() => openRoute(card.route)}>
              <span><Icon size={17} /> {card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </button>
          );
        })}
      </div>
      <AutoDetectEvidenceCard report={autoDetect} onOpen={onOpen} />
      <div className="command-flow-panel">
        <div className="command-flow-head">
          <span>Main flow</span>
          <strong>{summary.setupHealth.copy}</strong>
          <small>Main warning: {summary.mainWarning}</small>
        </div>
        <div className="command-flow" aria-label="Guided CueForge setup flow">
          {summary.flow.map((step, index) => {
            const Icon = stepIcons[step.id] || CheckCircle2;
            return (
              <React.Fragment key={step.id}>
                <button className={`flow-step flow-${step.status}`} onClick={() => openRoute(step.route)} title={step.label}>
                  <Icon size={15} />
                  <span>{step.label}</span>
                  <em>{step.status}</em>
                </button>
                {index < summary.flow.length - 1 && <i className="flow-join" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="command-grid">
        <ReadinessCard readiness={state?.readiness} onOpen={onOpen} />
        <ProfileRecommendationCard profile={state?.profile} onApply={onApplyProfile} onOpen={onOpen} />
        <ChainGraphView graph={state?.chainGraph} />
        <ConflictFixPanel conflicts={state?.conflicts} onOpen={onOpen} />
        <EnginePreviewPanel engine={state?.engine} applyPath={state?.applyPath} onExport={onExportPack} />
      </div>
    </section>
  );
}

function AutoDetectEvidenceCard({ report = {}, onOpen }) {
  const confidence = report.confidence || {};
  const devices = report.devices || {};
  const inputCount = (devices.browserInputs?.length || 0) + (devices.windowsCaptureDevices?.length || 0);
  const outputCount = (devices.browserOutputs?.length || 0) + (devices.windowsRenderDevices?.length || 0);
  const source = report.source || 'none';
  const hasNative = source.includes('desktop');
  const riskCount = report.risks?.length || 0;
  const nextRecommendation = report.recommendations?.[0] || 'Run Auto Detect to build a trusted setup report.';

  return (
    <button className={`auto-detect-evidence ${hasNative ? 'native' : 'partial'}`} onClick={() => onOpen?.('detect')}>
      <span><Search size={17} /> Auto Detect Evidence</span>
      <strong>{confidence.score ?? 0}% confidence - {confidence.tier || 'unknown'}</strong>
      <small>
        {hasNative
          ? 'Native Windows bridge evidence is loaded with stronger endpoint and companion-layer proof.'
          : 'Browser-only partial evidence is active. Device names and Windows audio layers may be hidden until a desktop scan or import runs.'}
      </small>
      <em>{inputCount} input{inputCount === 1 ? '' : 's'} / {outputCount} output{outputCount === 1 ? '' : 's'} / {riskCount} risk{riskCount === 1 ? '' : 's'}</em>
      <small>{nextRecommendation}</small>
    </button>
  );
}
