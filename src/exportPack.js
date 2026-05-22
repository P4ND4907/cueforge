import { sanitizeUiFeedbackNotes, summarizeUiFeedback } from './uiFeedback.js';

export function buildSetupReadme({ apoConfig, calibration, hearing, dna, uiFeedbackNotes = [] }) {
  const uiSummary = summarizeUiFeedback(uiFeedbackNotes);

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
    '- ui-feedback-notes.json - right-click tester notes for the developer if any were captured.',
    '',
    '## Apply',
    '',
    '1. Open Equalizer APO Configuration Editor or Peace.',
    '2. Review equalizer-apo-config.txt.',
    '3. Paste or import the config.',
    '4. Save, then test in CueForge Mic Lab and Hearing Model.',
    '',
    '## Summary',
    '',
    `APO config lines: ${apoConfig.split('\n').length}`,
    `Calibration bands: ${calibration?.eq?.length || 0}`,
    `Hearing profile included: ${hearing ? 'yes' : 'no'}`,
    `Audio DNA included: ${dna ? 'yes' : 'no'}`,
    `UI feedback notes included: ${uiSummary.total}`
  ].join('\n');
}

export function buildExportPack({ apoConfig, calibration, hearing, dna, uiFeedbackNotes = [] }) {
  const safeUiFeedbackNotes = sanitizeUiFeedbackNotes(uiFeedbackNotes);

  return {
    generatedAt: new Date().toISOString(),
    files: {
      'README.txt': buildSetupReadme({ apoConfig, calibration, hearing, dna, uiFeedbackNotes: safeUiFeedbackNotes }),
      'equalizer-apo-config.txt': apoConfig,
      'calibration.json': JSON.stringify(calibration || {}, null, 2),
      'hearing-profile.json': JSON.stringify(hearing || {}, null, 2),
      'audio-dna.json': JSON.stringify(dna || {}, null, 2),
      'ui-feedback-notes.json': JSON.stringify(safeUiFeedbackNotes, null, 2)
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
