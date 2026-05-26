import { sanitizeUiFeedbackNotes, summarizeUiFeedback } from './uiFeedback.js';
import { sanitizeShortcutsForExport } from './shortcutVault.js';
import { attachStateAnchor, STATE_CONSUMERS } from './core/stateAdapters.js';
import { playerSafetyWarnings } from './core/safetyRules.js';
import { buildStateExportFingerprints } from './exportFingerprints.js';
import { redactDeep } from './reportPack.js';

export function buildSetupReadme({ apoConfig, calibration, hearing, dna, uiFeedbackNotes = [], shortcuts = [], cueforgeState = null }) {
  const uiSummary = summarizeUiFeedback(uiFeedbackNotes);
  const safeShortcuts = sanitizeShortcutsForExport(shortcuts);
  const shortcutCount = safeShortcuts.filter((shortcut) => shortcut.exportable).length;
  const lockedShortcutCount = safeShortcuts.filter((shortcut) => shortcut.locked).length;

  return [
    '# CueForge Setup Pack',
    '',
    'This pack was generated locally by CueForge.',
    '',
    '## Files',
    '',
    '- equalizer-apo-config.txt - paste into Equalizer APO or Peace.',
    '- calibration.json - autotune settings and generated EQ bands.',
    '- hearing-profile.json - hearing model snapshot if available.',
    '- audio-dna.json - Audio DNA snapshot if available.',
    '- cueforge-state-v2.json - canonical setup/profile/readiness state shared by CueForge features.',
    '- cueforge-state-anchor.json - small safe state summary for support and debugging.',
    '- export-fingerprints.json - stable hashed device/route fingerprints for correlation without raw IDs.',
    '- ui-feedback-notes.json - right-click tester notes for the developer if any were captured.',
    '- shortcuts.json - saved player shortcuts with locked developer codes redacted.',
    '',
    '## Apply',
    '',
    '1. Open Equalizer APO Configuration Editor or Peace.',
    '2. Review equalizer-apo-config.txt.',
    '3. Paste or import the config.',
    '4. Save, then test in CueForge Mic Lab and Hearing Model.',
    '',
    '## Safety',
    '',
    `- ${playerSafetyWarnings[0]}`,
    `- ${playerSafetyWarnings[1]}`,
    '- CueForge does not silently change Windows audio drivers, routing, or APO files.',
    '- Device and route correlation uses hashed fingerprints instead of raw labels, IDs, paths, or account data.',
    '',
    '## Summary',
    '',
    `APO config lines: ${apoConfig.split('\n').length}`,
    `Calibration bands: ${calibration?.eq?.length || 0}`,
    `Hearing profile included: ${hearing ? 'yes' : 'no'}`,
    `Audio DNA included: ${dna ? 'yes' : 'no'}`,
    `Canonical state included: ${cueforgeState ? 'yes' : 'no'}`,
    `UI feedback notes included: ${uiSummary.total}`,
    `Player shortcuts included: ${shortcutCount}`,
    `Locked code shortcuts redacted: ${lockedShortcutCount}`
  ].join('\n');
}

export function buildExportPack({ apoConfig, calibration, hearing, dna, uiFeedbackNotes = [], shortcuts = [], cueforgeState = null }) {
  const safeUiFeedbackNotes = sanitizeUiFeedbackNotes(uiFeedbackNotes);
  const safeShortcuts = sanitizeShortcutsForExport(shortcuts);
  const stateAnchor = attachStateAnchor({}, cueforgeState, STATE_CONSUMERS.releasePack).stateAnchor;
  const exportFingerprints = buildStateExportFingerprints(cueforgeState || {});
  const safeCueforgeState = cueforgeState ? redactDeep(cueforgeState) : {};
  const safeCalibration = redactDeep(calibration || {});
  const safeHearing = redactDeep(hearing || {});
  const safeDna = redactDeep(dna || {});

  return {
    generatedAt: new Date().toISOString(),
    stateAnchor,
    privacy: {
      localFirst: true,
      noSilentUpload: true,
      rawAudioIncluded: false,
      redactedExports: true,
      hashedFingerprints: true
    },
    files: {
      'README.txt': buildSetupReadme({ apoConfig, calibration: safeCalibration, hearing: safeHearing, dna: safeDna, uiFeedbackNotes: safeUiFeedbackNotes, shortcuts: safeShortcuts, cueforgeState }),
      'equalizer-apo-config.txt': apoConfig,
      'calibration.json': JSON.stringify(safeCalibration, null, 2),
      'hearing-profile.json': JSON.stringify(safeHearing, null, 2),
      'audio-dna.json': JSON.stringify(safeDna, null, 2),
      'cueforge-state-v2.json': JSON.stringify(safeCueforgeState, null, 2),
      'cueforge-state-anchor.json': JSON.stringify(stateAnchor, null, 2),
      'export-fingerprints.json': JSON.stringify(exportFingerprints, null, 2),
      'ui-feedback-notes.json': JSON.stringify(safeUiFeedbackNotes, null, 2),
      'shortcuts.json': JSON.stringify(safeShortcuts, null, 2)
    }
  };
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  const url = link.href;
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
