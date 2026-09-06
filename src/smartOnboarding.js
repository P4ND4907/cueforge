import { computeSetupReadiness } from './setupReadiness.js';
import { detectBottleneck } from './core/bottleneckDiagnosis.js';
import { runQuickDetect as defaultRunQuickDetect } from './detection/quickDetect.js';
import { runMinimalSelfTest as defaultRunMinimalSelfTest } from './selfTest/minimal.js';

export const SMART_DNA_HISTORY_KEY = 'cueforge_dna_history';
export const SMART_LAST_ASSESSMENT_KEY = 'cueforge_last_assessment';

export const runSmartAssessment = async (mode = 'quick', {
  storage = globalThis.localStorage,
  runMinimalSelfTest = defaultRunMinimalSelfTest,
  runQuickDetect = defaultRunQuickDetect,
  runBlindMatchPreview = async () => ({})
} = {}) => {
  try {
    const baseData = {
      timestamp: Date.now(),
      selfTest: normalizeSelfTest(await runMinimalSelfTest()),
      detect: normalizeDetect(await runQuickDetect())
    };

    const matchData = mode === 'full' ? await runBlindMatchPreview() : {};
    const data = { ...baseData, match: normalizeMatch(matchData) };
    const readiness = buildReadinessSnapshot(data);
    const detectForDiagnosis = {
      ...data.detect,
      selfTest: data.selfTest,
      readiness,
      matchRound: data.match
    };
    const score = calculateHolisticScore({ ...data, readiness });
    const bottleneck = normalizeBottleneck(detectBottleneck(detectForDiagnosis));
    const recommendations = generatePersonalizedPlan(data, score, bottleneck);

    const assessment = {
      schema: 'cueforge.smart-onboarding-assessment.v1',
      data: redactAssessmentData({ ...data, readiness }),
      results: redactAssessmentData({ ...data, readiness }),
      score,
      bottleneck,
      recommendations,
      suggestions: recommendations,
      completed: true,
      mode
    };
    saveToLocalDNA(assessment, { storage });
    saveLastAssessment(assessment, { storage });

    return assessment;
  } catch {
    return buildAssessmentError();
  }
};

export function runQuickAssessment(options = {}) {
  return runSmartAssessment('quick', options);
}

export function runFullSmartAssessment(options = {}) {
  return runSmartAssessment('full', options);
}

export function calculateSetupScore(data) {
  return calculateHolisticScore(data);
}

export function calculateHolisticScore(data) {
  let score = 40;
  const selfTestPassed = Boolean(data.selfTest?.passed || (data.selfTest?.micOk && data.selfTest?.audioApiOk));
  const chainComplete = Boolean(data.detect?.completeChain || data.detect?.chainComplete);
  const matchConfidence = Number(data.match?.confidence ?? data.matchRound?.confidence ?? 0);

  if (selfTestPassed) score += 25;
  if (chainComplete) score += 20;
  if (matchConfidence > 0.65) score += 15;
  return Math.min(100, Math.round(score));
}

export function generatePersonalizedPlan(data, score, bottleneck) {
  const primary = bottleneck.primaryBottleneck || bottleneck.primary || {};
  const plan = [primary.message || primary.msg || 'Setup looks solid - focus on tuning'];

  if (score < 70) plan.push('Run full Sound Match for personalized curve');
  if (!data.detect?.apoDetected && !data.detect?.eqActive) plan.push('Set up Equalizer APO or stay in export-only mode until a real apply target is proven');
  if (data.detect?.runningGame) plan.push(`Try Player Trial in ${data.detect.runningGame}`);
  else plan.push('Try Player Trial in your main game');

  return [...new Set(plan)].filter(Boolean);
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

export function saveLastAssessment(assessment, { storage = globalThis.localStorage } = {}) {
  try {
    storage?.setItem?.(SMART_LAST_ASSESSMENT_KEY, JSON.stringify(assessment));
  } catch {
    // Local quick-start recovery is optional.
  }
}

function normalizeSelfTest(selfTest = {}) {
  const checks = selfTest.checks || {};
  const audioApiOk = Boolean(selfTest.audioApiOk ?? checks.audioApi ?? selfTest.passed);
  const micOk = Boolean(selfTest.micOk ?? checks.mediaDevices ?? selfTest.passed);

  return {
    ...selfTest,
    passed: Boolean(selfTest.passed ?? (audioApiOk && micOk)),
    micOk,
    audioApiOk,
    checks: {
      ...checks,
      audioApi: audioApiOk,
      mediaDevices: Boolean(checks.mediaDevices ?? micOk),
      desktopBridge: Boolean(checks.desktopBridge)
    }
  };
}

function normalizeDetect(detect = {}) {
  const deviceCounts = detect.deviceCounts || {};
  const inputCount = Number(deviceCounts.inputs ?? detect.inputCount ?? 0) || 0;
  const outputCount = Number(deviceCounts.outputs ?? detect.outputCount ?? 0) || 0;
  const completeChain = Boolean(detect.completeChain ?? detect.chainComplete ?? (inputCount > 0 && outputCount > 0));
  const apoDetected = Boolean(detect.apoDetected ?? detect.eqActive);
  const sonarDetected = Boolean(detect.sonarDetected ?? detect.sonar);

  return {
    ...detect,
    completeChain,
    chainComplete: completeChain,
    apoDetected,
    eqActive: Boolean(detect.eqActive ?? apoDetected),
    sonarDetected,
    sonar: Boolean(detect.sonar ?? sonarDetected),
    discord: Boolean(detect.discord ?? detect.discordDetected),
    deviceCounts: {
      inputs: inputCount,
      outputs: outputCount
    }
  };
}

function normalizeMatch(match = {}) {
  return {
    ...match,
    confidence: Number(match.confidence) || 0
  };
}

function normalizeBottleneck(bottleneck = {}) {
  const primary = bottleneck.primaryBottleneck || bottleneck.primary || {};
  const message = primary.message || primary.msg || primary.title || 'CueForge needs more setup evidence.';

  return {
    ...bottleneck,
    primaryBottleneck: {
      ...primary,
      type: primary.type || primary.severity || 'low',
      severity: primary.severity || primary.type || 'low',
      msg: primary.msg || message,
      message,
      fix: primary.fix || bottleneck.nextAction || 'Run Auto Detect and retry the quick assessment.'
    }
  };
}

function buildReadinessSnapshot(data = {}) {
  const inputCount = Number(data.detect?.deviceCounts?.inputs || 0);
  const outputCount = Number(data.detect?.deviceCounts?.outputs || 0);
  const deviceCount = inputCount + outputCount;

  return computeSetupReadiness({
    audioApi: Boolean(data.selfTest?.audioApiOk || data.selfTest?.checks?.audioApi),
    micPermission: inputCount > 0 ? 'granted' : 'unknown',
    deviceCount,
    bridgeLoaded: Boolean(data.selfTest?.checks?.desktopBridge || data.detect?.bridgeLoaded),
    apoFound: Boolean(data.detect?.apoDetected || data.detect?.eqActive),
    selfTests: data.selfTest?.passed ? [{ id: 'smart-onboarding-minimal', status: 'pass' }] : [],
    reportReady: Boolean(data.detect?.reportReady),
    hearingAnswered: Number(data.detect?.hearingAnswered || 0)
  });
}

function redactAssessmentData(data = {}) {
  const detect = {
    completeChain: Boolean(data.detect?.completeChain),
    chainComplete: Boolean(data.detect?.chainComplete ?? data.detect?.completeChain),
    sonar: Boolean(data.detect?.sonar),
    sonarDetected: Boolean(data.detect?.sonarDetected ?? data.detect?.sonar),
    discord: Boolean(data.detect?.discord),
    micClip: Number(data.detect?.micClip) || 0,
    iEm: Boolean(data.detect?.iEm),
    eqActive: Boolean(data.detect?.eqActive),
    apoDetected: Boolean(data.detect?.apoDetected ?? data.detect?.eqActive)
  };
  if (data.detect?.runningGame) detect.runningGame = data.detect.runningGame;
  if (data.detect?.deviceCounts) detect.deviceCounts = data.detect.deviceCounts;

  return {
    timestamp: data.timestamp,
    selfTest: data.selfTest,
    detect,
    readiness: data.readiness
      ? {
          score: data.readiness.score,
          status: data.readiness.status,
          nextActions: data.readiness.nextActions
        }
      : null,
    match: {
      confidence: Number(data.match?.confidence) || 0
    }
  };
}

function buildAssessmentError() {
  return {
    schema: 'cueforge.smart-onboarding-assessment.v1',
    completed: false,
    score: 0,
    error: 'Assessment failed. Try again or check permissions.',
    bottleneck: {
      primaryBottleneck: {
        type: 'high',
        severity: 'high',
        msg: 'Assessment failed',
        message: 'Assessment failed',
        fix: 'Retry Smart Assessment or run Auto Detect manually.'
      }
    },
    recommendations: ['Retry Smart Assessment or run Auto Detect manually.'],
    suggestions: ['Retry Smart Assessment or run Auto Detect manually.'],
    results: null
  };
}
