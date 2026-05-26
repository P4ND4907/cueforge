export const LAB_MANIFEST_SCHEMA = 'cueforge.lab-manifest.v1';
export const LAB_RUN_PLAN_SCHEMA = 'cueforge.lab-run-plan.v1';

export const labTestPriorities = {
  immediate: 'immediate',
  next: 'next'
};

export const labTestClassCatalog = [
  {
    type: 'unit',
    purpose: 'Deterministic logic: redaction, scoring, graph normalization, signal analysis.',
    priority: labTestPriorities.immediate,
    runner: 'vitest-unit'
  },
  {
    type: 'integration',
    purpose: 'PowerShell, Electron/native helper, and UI wiring.',
    priority: labTestPriorities.immediate,
    runner: 'machine-assessment'
  },
  {
    type: 'e2e',
    purpose: 'First-run setup, Auto Detect, report export, and APO draft flow.',
    priority: labTestPriorities.immediate,
    runner: 'playwright-electron'
  },
  {
    type: 'ab-audio-render',
    purpose: 'Before/after cue-region change with loopback or deterministic render proof.',
    priority: labTestPriorities.immediate,
    runner: 'audio-fixture-render'
  },
  {
    type: 'blind-match-automation',
    purpose: 'Seeded order, response consistency, and preference stability.',
    priority: labTestPriorities.next,
    runner: 'blind-match-harness'
  },
  {
    type: 'hearing-model-automation',
    purpose: 'Safe threshold consistency and self-calibration boundaries, never clinical diagnosis.',
    priority: labTestPriorities.next,
    runner: 'hearing-harness'
  },
  {
    type: 'chain-graph-verification',
    purpose: 'Detect wrong defaults, missing APO bind, duplicate enhancers, and route uncertainty.',
    priority: labTestPriorities.immediate,
    runner: 'chain-graph'
  },
  {
    type: 'conflict-detection',
    purpose: 'Sonar, APO, Discord, Windows enhancements, spatial layers, and virtual route overlap rules.',
    priority: labTestPriorities.immediate,
    runner: 'conflict-detector'
  },
  {
    type: 'latency-regression',
    purpose: 'Impulse/chirp round-trip comparison and render/capture timing proof.',
    priority: labTestPriorities.immediate,
    runner: 'native-harness'
  },
  {
    type: 'bit-exact-dsp-regression',
    purpose: 'Prove deterministic transforms where applicable.',
    priority: labTestPriorities.next,
    runner: 'dsp-regression'
  },
  {
    type: 'mic-pipeline',
    purpose: 'Clipping, noise floor, AGC/suppression detection, and RNNoise A/B planning.',
    priority: labTestPriorities.immediate,
    runner: 'mic-analyzer'
  }
];

export const legacyLabTestTypes = {
  'chain-graph': 'chain-graph-verification',
  latency: 'latency-regression',
  'audio-regression': 'ab-audio-render'
};

const supplementalLabTypes = {
  privacy: 'redaction-gate',
  visual: 'playwright-visual',
  'desktop-smoke': 'electron-smoke',
  fixture: 'fixture-runner'
};

export const labRunnerByType = {
  ...Object.fromEntries(labTestClassCatalog.map((item) => [item.type, item.runner])),
  ...Object.fromEntries(Object.entries(legacyLabTestTypes).map(([legacy, canonical]) => [legacy, labTestClassCatalog.find((item) => item.type === canonical)?.runner || 'manual-review'])),
  ...supplementalLabTypes
};

export const labTestTypes = Object.keys(labRunnerByType);

export const requiredLabPrivacy = {
  allowRawAudioExport: false,
  redactDeviceIds: true,
  redactUserPaths: true
};

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function canonicalLabTestType(type) {
  const clean = cleanText(type);
  return legacyLabTestTypes[clean] || clean;
}

export function getLabTestClass(type) {
  const canonical = canonicalLabTestType(type);
  return labTestClassCatalog.find((item) => item.type === canonical) || null;
}

export function getLabTestClassesByPriority(priority) {
  return labTestClassCatalog.filter((item) => item.priority === priority);
}

export function assessLabManifestCoverage(manifests = []) {
  const present = new Set();

  asArray(manifests).forEach((manifest) => {
    asArray(manifest.tests).forEach((test) => {
      const canonical = canonicalLabTestType(test?.type);
      if (getLabTestClass(canonical)) present.add(canonical);
    });
  });

  const missingImmediate = getLabTestClassesByPriority(labTestPriorities.immediate)
    .map((item) => item.type)
    .filter((type) => !present.has(type));
  const missingNext = getLabTestClassesByPriority(labTestPriorities.next)
    .map((item) => item.type)
    .filter((type) => !present.has(type));

  return {
    schema: 'cueforge.lab-manifest-coverage.v1',
    manifestCount: asArray(manifests).length,
    supportedClassCount: labTestClassCatalog.length,
    present: [...present].sort(),
    missingImmediate,
    missingNext,
    readyForReleaseGate: missingImmediate.length === 0
  };
}

function validatePrivacy(privacy = {}) {
  const errors = [];

  if (privacy.allowRawAudioExport !== false) {
    errors.push('privacy.allowRawAudioExport must be false for lab manifests');
  }
  if (privacy.redactDeviceIds !== true) {
    errors.push('privacy.redactDeviceIds must be true');
  }
  if (privacy.redactUserPaths !== true) {
    errors.push('privacy.redactUserPaths must be true');
  }
  if ('allowCloudUpload' in privacy && privacy.allowCloudUpload !== false) {
    errors.push('privacy.allowCloudUpload must be false when present');
  }
  if ('summaryOnlyReports' in privacy && privacy.summaryOnlyReports !== true) {
    errors.push('privacy.summaryOnlyReports must be true when present');
  }

  return errors;
}

export function validateLabManifest(manifest = {}, options = {}) {
  const knownProfileIds = asArray(options.knownProfileIds);
  const errors = [];
  const tests = asArray(manifest.tests);

  if (manifest.schema !== LAB_MANIFEST_SCHEMA) errors.push('schema must be cueforge.lab-manifest.v1');
  if (!cleanText(manifest.manifestId)) errors.push('manifestId is required');
  if (!cleanText(manifest.profileId)) {
    errors.push('profileId is required');
  } else if (knownProfileIds.length && !knownProfileIds.includes(manifest.profileId)) {
    errors.push(`profileId ${manifest.profileId} is not in known hardware profiles`);
  }

  if (!tests.length) errors.push('tests must include at least one test');

  const seenIds = new Set();
  tests.forEach((test, index) => {
    const prefix = `tests[${index}]`;
    const id = cleanText(test?.id);
    const type = cleanText(test?.type);

    if (!id) {
      errors.push(`${prefix}.id is required`);
    } else if (seenIds.has(id)) {
      errors.push(`${prefix}.id duplicates ${id}`);
    } else {
      seenIds.add(id);
    }

    if (!type) {
      errors.push(`${prefix}.type is required`);
    } else if (!labTestTypes.includes(type)) {
      errors.push(`${prefix}.type ${type} is not a supported lab test type`);
    }
  });

  errors.push(...validatePrivacy(manifest.privacy));

  return {
    ok: errors.length === 0,
    errors
  };
}

export function buildLabRunPlan(manifest = {}, hardwareProfile = null) {
  const tests = asArray(manifest.tests).map((test, index) => ({
    order: index + 1,
    id: cleanText(test.id),
    type: cleanText(test.type),
    canonicalType: canonicalLabTestType(test.type),
    runner: labRunnerByType[test.type] || 'manual-review',
    priority: getLabTestClass(test.type)?.priority || 'supplemental',
    required: test.required !== false,
    fixture: cleanText(test.fixture) || null,
    policy: cleanText(test.policy) || null,
    capture: test.capture
      ? {
          method: cleanText(test.capture.method),
          endpoint: cleanText(test.capture.endpoint),
          allowSystemMutation: test.capture.allowSystemMutation === true
        }
      : null
  }));

  return {
    schema: LAB_RUN_PLAN_SCHEMA,
    manifestId: cleanText(manifest.manifestId),
    profileId: cleanText(manifest.profileId),
    hardwareProfileId: hardwareProfile?.profileId || cleanText(manifest.profileId),
    hardwareProfileLabel: hardwareProfile?.label || null,
    testCount: tests.length,
    tests,
    privacy: {
      ...requiredLabPrivacy,
      ...(manifest.privacy || {})
    },
    gates: {
      rawAudioExportAllowed: manifest.privacy?.allowRawAudioExport === true,
      redactionRequired: manifest.privacy?.redactDeviceIds === true && manifest.privacy?.redactUserPaths === true,
      systemMutationAllowed: false
    }
  };
}

export function summarizeLabManifest(manifest = {}) {
  const tests = asArray(manifest.tests);
  const typeCounts = tests.reduce((counts, test) => {
    const type = cleanText(test.type) || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  return {
    manifestId: cleanText(manifest.manifestId),
    profileId: cleanText(manifest.profileId),
    testCount: tests.length,
    typeCounts,
    privacyLocked: validatePrivacy(manifest.privacy).length === 0
  };
}
