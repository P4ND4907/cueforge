export const SWARM_ROUTE_SCHEMA = 'cueforge.swarm-route.v1';
export const SWARM_JOB_SCHEMA = 'cueforge.swarm-job.v1';
export const SWARM_REPAIR_SCHEMA = 'cueforge.swarm-repair.v1';

export const swarmEscalationLevels = ['info', 'low', 'medium', 'high', 'release-blocker'];

export const requiredSwarmPrivacy = {
  allowRawAudioExport: false,
  allowCloudUpload: false,
  redactDeviceIds: true,
  redactUserPaths: true,
  summaryOnlyReports: true
};

const unsafePattern = /post\s+to|change\s+windows|write\s+apo|install\s+driver|upload\s+raw|password|token|phone|dob|recovery/i;

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function hasObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function validatePrivacy(privacy = {}, prefix = 'privacy') {
  const errors = [];

  for (const [key, expected] of Object.entries(requiredSwarmPrivacy)) {
    if (privacy[key] !== expected) errors.push(`${prefix}.${key} must be ${expected}`);
  }

  return errors;
}

function validateThresholds(thresholds = {}, prefix = 'analyzerThresholds') {
  const errors = [];
  const required = [
    'maxConsoleErrors',
    'maxHorizontalOverflowPx',
    'maxRawLeakCount',
    'maxHarmRate',
    'minDiagnosisAccuracy'
  ];

  required.forEach((key) => {
    if (!Number.isFinite(Number(thresholds[key]))) errors.push(`${prefix}.${key} must be numeric`);
  });
  if (Number(thresholds.maxRawLeakCount) !== 0) errors.push(`${prefix}.maxRawLeakCount must be 0`);
  if (Number(thresholds.maxHarmRate) > 0) errors.push(`${prefix}.maxHarmRate must be 0 or lower`);
  if (Number(thresholds.minDiagnosisAccuracy) < 80) errors.push(`${prefix}.minDiagnosisAccuracy must be at least 80`);

  return errors;
}

export function validateSwarmRouteManifest(route = {}) {
  const errors = [];
  const routeId = text(route.routeId);

  if (route.schema !== SWARM_ROUTE_SCHEMA) errors.push(`schema must be ${SWARM_ROUTE_SCHEMA}`);
  if (!routeId) errors.push('routeId is required');
  if (!text(route.label)) errors.push('label is required');
  if (!text(route.entrySurface)) errors.push('entrySurface is required');
  if (!arr(route.requiredSelectors).length) errors.push('requiredSelectors must include at least one selector');
  if (!arr(route.expectedStateTransitions).length) errors.push('expectedStateTransitions must include at least one transition');
  if (!arr(route.fixtureIds).length) errors.push('fixtureIds must include at least one fixture');
  if (!text(route.failureOwner)) errors.push('failureOwner is required');
  if (!swarmEscalationLevels.includes(route.escalationLevel)) errors.push('escalationLevel is invalid');
  if (!arr(route.safeAutoRepairActions).length) errors.push('safeAutoRepairActions must include at least one action');
  if (arr(route.safeAutoRepairActions).some((action) => unsafePattern.test(action))) {
    errors.push('safeAutoRepairActions contains an unsafe action');
  }

  arr(route.requiredSelectors).forEach((selector, index) => {
    if (!text(selector)) errors.push(`requiredSelectors[${index}] must be a selector string`);
  });
  arr(route.expectedStateTransitions).forEach((transition, index) => {
    if (!text(transition.from) || !text(transition.action) || !text(transition.to) || !text(transition.expected)) {
      errors.push(`expectedStateTransitions[${index}] must include from, action, to, and expected`);
    }
  });

  errors.push(...validateThresholds(route.analyzerThresholds || {}));
  errors.push(...validatePrivacy(route.privacy || {}));

  return {
    ok: errors.length === 0,
    errors,
    routeId
  };
}

export function validateSwarmJobManifest(job = {}, knownRouteIds = []) {
  const errors = [];
  const jobId = text(job.jobId);
  const routeIds = arr(job.routes);

  if (job.schema !== SWARM_JOB_SCHEMA) errors.push(`schema must be ${SWARM_JOB_SCHEMA}`);
  if (!jobId) errors.push('jobId is required');
  if (!text(job.label)) errors.push('label is required');
  if (!text(job.trigger)) errors.push('trigger is required');
  if (!text(job.command)) errors.push('command is required');
  if (unsafePattern.test(job.command)) errors.push('command contains an unsafe operation');
  if (!routeIds.length) errors.push('routes must include at least one route');
  routeIds.forEach((routeId) => {
    if (knownRouteIds.length && !knownRouteIds.includes(routeId)) {
      errors.push(`routes references unknown route ${routeId}`);
    }
  });
  if (!arr(job.outputs).length) errors.push('outputs must include at least one artifact path');
  if (!hasObject(job.gates)) errors.push('gates is required');
  if (job.gates?.canModifySystemState !== false) errors.push('gates.canModifySystemState must be false');
  if (job.gates?.canPostPublicly !== false) errors.push('gates.canPostPublicly must be false');
  errors.push(...validatePrivacy(job.privacy || {}));

  return {
    ok: errors.length === 0,
    errors,
    jobId
  };
}

export function validateSwarmRepairManifest(repair = {}) {
  const errors = [];
  const repairId = text(repair.repairId);

  if (repair.schema !== SWARM_REPAIR_SCHEMA) errors.push(`schema must be ${SWARM_REPAIR_SCHEMA}`);
  if (!repairId) errors.push('repairId is required');
  if (!text(repair.source)) errors.push('source is required');
  if (!text(repair.failureOwner)) errors.push('failureOwner is required');
  if (!swarmEscalationLevels.includes(repair.escalationLevel)) errors.push('escalationLevel is invalid');
  if (!arr(repair.allowedActions).length) errors.push('allowedActions must include at least one action');
  if (!arr(repair.blockedActions).length) errors.push('blockedActions must include at least one action');
  if (!text(repair.queueOutput)) errors.push('queueOutput is required');
  if (arr(repair.allowedActions).some((action) => unsafePattern.test(action))) {
    errors.push('allowedActions contains an unsafe action');
  }
  if (!arr(repair.blockedActions).some((action) => /post|windows|apo|raw audio|password|token/i.test(action))) {
    errors.push('blockedActions must explicitly block public posting, Windows/APO changes, raw audio, or private data');
  }
  errors.push(...validatePrivacy(repair.privacy || {}));

  return {
    ok: errors.length === 0,
    errors,
    repairId
  };
}

export function buildSwarmCoverageSummary({ routes = [], jobs = [], repairs = [] } = {}) {
  const routeIds = routes.map((route) => route.routeId).filter(Boolean);
  const jobRouteIds = new Set(jobs.flatMap((job) => arr(job.routes)));
  const uncoveredRoutes = routeIds.filter((routeId) => !jobRouteIds.has(routeId));
  const releaseJobs = jobs.filter((job) => /release/i.test(`${job.jobId} ${job.trigger}`));

  return {
    schema: 'cueforge.swarm-coverage.v1',
    routeCount: routes.length,
    jobCount: jobs.length,
    repairCount: repairs.length,
    routeIds,
    uncoveredRoutes,
    hasReleaseCandidateJob: releaseJobs.length > 0,
    readyForCi: routes.length >= 4 && jobs.length >= 3 && repairs.length >= 2 && uncoveredRoutes.length === 0 && releaseJobs.length > 0
  };
}
