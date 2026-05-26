import { buildExportPack } from './exportPack.js';
import { buildIssueReport } from './reportPack.js';
import { runPrivacyAudit } from './privacyAudit.js';
import { electronSecurityPolicy } from './security/electronPolicy.js';
import { evidencePrivacyDefaults, validateEvidencePrivacyPosture } from './core/evidencePrivacyPolicy.js';

export const hearingSafetyCopy = 'This is a guided IEM/headphone threshold check. It is not a medical hearing test.';

export const declaredNativeCapabilities = [
  'canReadDefaults',
  'canReadSessions',
  'canReadLoopback',
  'canWriteApoDraft',
  'canModifySystemState'
];

export const securityPrivacyCriteria = [
  {
    id: 'local-first-default',
    label: 'Local-first by default',
    required: 'No silent upload of reports, device data, mic data, or evidence clips.'
  },
  {
    id: 'export-redaction',
    label: 'Export redaction',
    required: 'Exports must redact device IDs, group IDs, machine/user identifiers, Windows paths, emails, and phone numbers.'
  },
  {
    id: 'hashed-export-fingerprints',
    label: 'Hashed export fingerprints',
    required: 'Stable device/route correlation must use hashed fingerprints instead of raw labels or IDs.'
  },
  {
    id: 'driver-layer-boundary',
    label: 'Driver-layer boundary',
    required: 'No silent driver install, default-device change, or hidden EQ stacking.'
  },
  {
    id: 'electron-hardening',
    label: 'Electron hardening',
    required: 'Renderer sandbox, context isolation, no node integration, IPC sender validation, and secure content rules stay enabled.'
  },
  {
    id: 'native-manifest-contract',
    label: 'Native manifest contract',
    required: 'The UI only trusts declared native capabilities, and canModifySystemState must remain false.'
  },
  {
    id: 'hearing-not-medical',
    label: 'Hearing workflow wording',
    required: 'CueForge must never claim the hearing workflow is medical.'
  },
  {
    id: 'protected-playback-boundary',
    label: 'Protected playback boundary',
    required: 'Loopback capture must not promise universal capture of DRM or protected playback streams.'
  }
];

export function evaluateSecurityPrivacyGate({
  issueReport = null,
  exportPack = null,
  nativeManifest = null,
  electronPolicy = electronSecurityPolicy,
  hearingCopy = hearingSafetyCopy
} = {}) {
  const report = issueReport || sampleIssueReport();
  const pack = exportPack || sampleExportPack();
  const audit = runPrivacyAudit([
    { name: 'issue report', payload: report },
    { name: 'export pack', payload: pack }
  ]);

  const checks = [
    check('local-first-default',
      report.privacy?.localFirst === true &&
      pack.privacy?.localFirst === true &&
      report.privacy?.noSilentUpload === true &&
      pack.privacy?.noSilentUpload === true &&
      report.privacy?.rawAudioIncluded === false &&
      pack.privacy?.rawAudioIncluded === false,
      'Reports and export packs must declare local-first/no-upload/no-raw-audio defaults.'
    ),
    check('export-redaction',
      audit.status === 'pass',
      `Privacy audit status: ${audit.status}; leaks: ${audit.leakCount}.`
    ),
    check('hashed-export-fingerprints',
      hasHashedFingerprints(report, pack),
      'Report and export pack must include cfp_ hashed fingerprints for correlation.'
    ),
    check('driver-layer-boundary',
      JSON.stringify(pack).includes('does not silently change Windows audio drivers') &&
      JSON.stringify(report).includes('redactedExports'),
      'Export copy must preserve no-silent-driver/routing/apply wording.'
    ),
    check('electron-hardening',
      electronPolicy?.webPreferences?.contextIsolation === true &&
      electronPolicy?.webPreferences?.nodeIntegration === false &&
      electronPolicy?.webPreferences?.sandbox === true &&
      electronPolicy?.webPreferences?.webSecurity === true &&
      electronPolicy?.webPreferences?.allowRunningInsecureContent === false &&
      electronPolicy?.ipc?.validateSender === true &&
      !/connect-src[^;]*https:/i.test(electronPolicy?.contentSecurityPolicy || ''),
      'Electron policy must sandbox the renderer, validate IPC senders, and avoid broad remote connect permissions.'
    ),
    check('native-manifest-contract',
      nativeManifest ? nativeManifestSafe(nativeManifest) : true,
      'Native helper manifests must declare all known capabilities and canModifySystemState must be false.'
    ),
    check('hearing-not-medical',
      /not a medical hearing test/i.test(String(hearingCopy || '')),
      'Hearing workflow copy must include the not-medical disclaimer.'
    ),
    check('protected-playback-boundary',
      report.privacy?.protectedPlaybackUniversalCapture === false &&
      /protected playback|drm/i.test(report.privacy?.protectedPlaybackBoundary || evidencePrivacyDefaults.protectedPlaybackBoundary),
      'Evidence privacy policy must disclose that protected playback can constrain loopback capture.'
    )
  ];
  const evidencePosture = validateEvidencePrivacyPosture(report);
  if (!evidencePosture.ok) {
    checks.push(check('local-first-default', false, evidencePosture.failures.join(' ')));
  }

  const failed = checks.filter((item) => item.status !== 'pass');

  return {
    schema: 'cueforge.security-privacy-gate.v1',
    status: failed.length ? 'fail' : 'pass',
    criteria: securityPrivacyCriteria,
    checks,
    failedChecks: failed.map((item) => item.id),
    audit
  };
}

function check(id, ok, detail) {
  const criterion = securityPrivacyCriteria.find((item) => item.id === id);
  return {
    id,
    label: criterion?.label || id,
    status: ok ? 'pass' : 'fail',
    detail
  };
}

function hasHashedFingerprints(report, pack) {
  const reportText = JSON.stringify(report?.diagnostics?.exportFingerprints || {});
  const packText = String(pack?.files?.['export-fingerprints.json'] || '');
  return /cfp_[a-f0-9]{20}/.test(reportText) || /deviceFingerprints/.test(reportText)
    ? /cueforge\.export-fingerprints\.v1/.test(packText)
    : false;
}

function nativeManifestSafe(manifest) {
  if (manifest.manifestVersion !== 'cueforge.native.v1') return false;
  const capabilities = manifest.capabilities || {};
  const allDeclared = declaredNativeCapabilities.every((key) => Object.prototype.hasOwnProperty.call(capabilities, key));
  return allDeclared && capabilities.canModifySystemState === false;
}

function sampleIssueReport() {
  stubBrowserGlobals();
  return buildIssueReport({
    eq: Array(10).fill(0),
    apoConfig: 'Preamp: -1.0 dB',
    selectedGame: 'Tactical FPS',
    selectedSourceProfile: 'safe',
    currentPage: 'Report Lab',
    sample: 'HyperX mic had boom, path C:\\Users\\carls\\secret.txt',
    analysis: { clarity: 70 },
    browserDevices: [{ kind: 'audioinput', label: 'HyperX mic', deviceId: 'raw-device-id' }],
    notes: 'No upload unless I choose to send it.'
  });
}

function sampleExportPack() {
  return buildExportPack({
    apoConfig: 'Preamp: -1.0 dB',
    calibration: { eq: Array(10).fill(0) },
    hearing: null,
    dna: null,
    cueforgeState: {
      devices: {
        output: { label: 'USB DAC', deviceId: 'raw-output-id' },
        input: { label: 'USB mic', deviceId: 'raw-input-id' }
      },
      chainGraph: {
        edges: [{ from: 'game', to: 'apo', relation: 'processed-by' }]
      }
    }
  });
}

function stubBrowserGlobals() {
  if (!globalThis.navigator) {
    globalThis.navigator = {
      userAgent: 'cueforge-security-gate',
      mediaDevices: {
        enumerateDevices: () => Promise.resolve([]),
        getUserMedia: () => Promise.reject(new Error('not used'))
      }
    };
  }
  if (!globalThis.window) {
    globalThis.window = {
      innerWidth: 1280,
      innerHeight: 720,
      AudioContext: function AudioContext() {}
    };
  }
  if (!globalThis.localStorage) {
    globalThis.localStorage = {
      setItem() {},
      removeItem() {}
    };
  }
}
