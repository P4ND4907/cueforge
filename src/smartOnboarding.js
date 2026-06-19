import { detectBottleneck } from './core/bottleneckDiagnosis.js';
import { runQuickDetect as defaultRunQuickDetect } from './detection/quickDetect.js';
import { runMinimalSelfTest as defaultRunMinimalSelfTest } from './selfTest/minimal.js';

export const SMART_DNA_HISTORY_KEY = 'cueforge_dna_history';

export const runSmartAssessment = async (mode = 'quick', {
  storage = globalThis.localStorage,
  runMinimalSelfTest = defaultRunMinimalSelfTest,
  runQuickDetect = defaultRunQuickDetect,
  runBlindMatchPreview = async () => ({})
} = {}) => {
  try {
    const baseData = {
      timestamp: Date.now(),
      selfTest: await runMinimalSelfTest(),
      detect: await runQuickDetect()
    };

    const matchData = mode === 'full' ? await runBlindMatchPreview() : {};
    const data = { ...baseData, match: matchData };
    const score = calculateHolisticScore(data);
    const bottleneck = detectBottleneck(data.detect);
    const recommendations = generatePersonalizedPlan(data, score, bottleneck);

    const assessment = {
      schema: 'cueforge.smart-onboarding-assessment.v1',
      data: redactAssessmentData(data),
      score,
      bottleneck,
      recommendations,
      mode
    };
    saveToLocalDNA(assessment, { storage });

    return assessment;
  } catch {
    return {
      schema: 'cueforge.smart-onboarding-assessment.v1',
      error: 'Assessment failed. Try again or check permissions.'
    };
  }
};

export function runFullSmartAssessment(options = {}) {
  return runSmartAssessment('full', options);
}

export function calculateHolisticScore(data) {
  let score = 40;
  if (data.selfTest?.passed) score += 25;
  if (data.detect?.completeChain) score += 20;
  if (data.match?.confidence > 0.65) score += 15;
  return Math.min(100, Math.round(score));
}

export function generatePersonalizedPlan(data, score, bottleneck) {
  const plan = [bottleneck.primaryBottleneck?.msg || 'Setup looks solid - focus on tuning'];
  if (score < 70) plan.push('Run full Sound Match for personalized curve');
  if (data.detect?.runningGame) plan.push(`Try Player Trial in ${data.detect.runningGame}`);
  else plan.push('Try Player Trial in your main game');
  return [...new Set(plan)];
}

export function saveToLocalDNA(assessment, { storage = globalThis.localStorage } = {}) {
  try {
    const history = JSON.parse(storage?.getItem?.(SMART_DNA_HISTORY_KEY) || '[]');
    history.push(assessment);
    storage?.setItem?.(SMART_DNA_HISTORY_KEY, JSON.stringify(history.slice(-10)));
  } catch {
    // Local history is optional; assessment still returns to the caller.
  }
}

function redactAssessmentData(data = {}) {
  const detect = {
    completeChain: Boolean(data.detect?.completeChain),
    sonar: Boolean(data.detect?.sonar),
    discord: Boolean(data.detect?.discord),
    micClip: Number(data.detect?.micClip) || 0,
    iEm: Boolean(data.detect?.iEm),
    eqActive: Boolean(data.detect?.eqActive)
  };
  if (data.detect?.runningGame) detect.runningGame = data.detect.runningGame;
  if (data.detect?.deviceCounts) detect.deviceCounts = data.detect.deviceCounts;

  return {
    timestamp: data.timestamp,
    selfTest: data.selfTest,
    detect,
    match: {
      confidence: Number(data.match?.confidence) || 0
    }
  };
}
