const highConflictIds = new Set([
  'double-spatial-risk',
  'native-spatial-stack-blocked',
  'double-eq-risk',
  'stacked-noise-suppression',
  'missing-stream-limiter',
  'stream-clipping-risk',
  'bass-masking-footsteps',
  'latency-budget-fail'
]);

export function detectBottleneck(detectData = {}) {
  const findings = [];
  const conflicts = Array.isArray(detectData.conflicts) ? detectData.conflicts : [];
  const metrics = detectData.metrics || {};

  if (detectData?.sonar && detectData?.discord) {
    findings.push({
      id: 'sonar-discord-conflict',
      severity: 'high',
      title: 'Sonar + Discord likely conflicting',
      msg: 'Sonar + Discord likely conflicting',
      fix: 'Pick one processing path for voice while testing, then confirm Discord input/output.'
    });
  }

  if (Number(detectData?.micClip) > 0.6) {
    findings.push({
      id: 'mic-clipping-risk',
      severity: 'high',
      title: 'High mic clipping risk',
      msg: 'High mic clipping risk - lower gain',
      fix: 'Lower mic gain before trusting EQ, Sound Match, or Discord feedback.'
    });
  }

  if (detectData?.iEm && !detectData?.eqActive) {
    findings.push({
      id: 'iem-eq-needed',
      severity: 'medium',
      title: 'IEMs usually need EQ',
      msg: 'IEMs usually need EQ',
      fix: 'Start from a safe IEM profile and verify comfort before boosting cue bands.'
    });
  }

  conflicts.forEach((conflict) => {
    findings.push({
      id: conflict.id || 'conflict',
      severity: conflict.severity || (highConflictIds.has(conflict.id) ? 'high' : 'medium'),
      title: conflict.title || conflict.message || conflict.id || 'Audio conflict',
      msg: conflict.msg || conflict.message || conflict.title || conflict.id || 'Audio conflict',
      fix: conflict.fix || 'Resolve this before applying a profile.'
    });
  });

  if (Number(metrics.cpuLoadPercent) >= 75) {
    findings.push({
      id: 'cpu-load-high',
      severity: 'medium',
      title: 'CPU load is high for live monitoring',
      msg: 'CPU load is high for live monitoring',
      fix: 'Use Game Mode or close extra analyzers while playing.'
    });
  }

  if (Number(metrics.audioLatencyMs) > 30) {
    findings.push({
      id: 'latency-budget-fail',
      severity: 'high',
      title: 'Latency budget is too high',
      msg: 'Latency budget is too high',
      fix: 'Use one spatial layer, one EQ path, and a lower-latency output route.'
    });
  }

  if (Number(metrics.droppedFrames) > 0 || Number(metrics.monitorDrops) > 0) {
    findings.push({
      id: 'monitor-drops',
      severity: 'medium',
      title: 'Monitoring loop dropped updates',
      msg: 'Monitoring loop dropped updates',
      fix: 'Switch to Game Mode or reduce analyzer size.'
    });
  }

  const sorted = findings
    .map(normalizeFinding)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const primary = sorted[0] || normalizeFinding({
    id: 'none',
    severity: 'low',
    title: 'No bottleneck detected',
    msg: 'No bottleneck detected',
    fix: 'Keep the current profile and run one controlled match test.'
  });
  const highCount = sorted.filter((item) => item.severity === 'high').length;
  const mediumCount = sorted.filter((item) => item.severity === 'medium').length;

  return {
    schema: 'cueforge.bottleneck-diagnosis.v1',
    status: primary.severity === 'high' ? 'blocked' : sorted.length ? 'watch' : 'clear',
    primary,
    primaryBottleneck: {
      id: primary.id,
      type: primary.severity,
      severity: primary.severity,
      title: primary.title,
      msg: primary.msg || primary.title,
      message: primary.message || primary.msg || primary.title,
      fix: primary.fix
    },
    issues: sorted.map((item) => ({
      severity: item.severity,
      type: item.severity,
      msg: item.msg || item.title,
      message: item.message || item.msg || item.title,
      id: item.id,
      fix: item.fix
    })),
    findings: sorted,
    counts: {
      high: highCount,
      medium: mediumCount,
      low: sorted.filter((item) => item.severity === 'low').length
    },
    nextAction: primary.fix,
    summary: `${primary.message || primary.msg || primary.title}. ${primary.fix}`,
    metrics: {
      cpuLoadPercent: Number(metrics.cpuLoadPercent) || 0,
      audioLatencyMs: Number(metrics.audioLatencyMs) || 0,
      droppedFrames: Number(metrics.droppedFrames || metrics.monitorDrops) || 0
    }
  };
}

function normalizeFinding(finding = {}) {
  const severity = finding.severity || finding.type || 'medium';
  const message = finding.message || finding.msg || finding.title || 'Audio bottleneck detected';

  return {
    ...finding,
    severity,
    type: severity,
    title: finding.title || message,
    msg: finding.msg || message,
    message,
    fix: finding.fix || 'Resolve this before applying a profile.'
  };
}

function severityRank(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] || 0;
}
