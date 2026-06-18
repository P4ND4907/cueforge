import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = resolve('.github/workflows/audio-ingest-qa.yml');

describe('audio ingest GitHub Actions workflow', () => {
  it('gates exported audio with ffprobe, Python loudness deps, and the CueForge QA script', () => {
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('actions/checkout@v6');
    expect(workflow).toContain('actions/setup-node@v6');
    expect(workflow).toContain('actions/setup-python@v6');
    expect(workflow).toContain('actions/upload-artifact@v7');
    expect(workflow).toContain('sudo apt-get install -y ffmpeg');
    expect(workflow).not.toContain('FedericoCarboni/setup-ffmpeg');
    expect(workflow).not.toContain('ffmpeg-version:');
    expect(workflow).not.toContain('linking-type:');
    expect(workflow).toMatch(/pip install\s+numpy\s+soundfile\s+pyloudnorm/);
    expect(workflow).toContain('tools/Measure-AudioIngestMetrics.py');
    expect(workflow).toContain('--manifest qa/audio/export-manifest.json');
    expect(workflow).toContain('qa/audio/ci/audio-ingest-summary.json');
    expect(workflow).toContain('npm run qa:audio-ingest -- --manifest qa/audio/export-manifest.json --output-dir qa/audio/ci --summary-json qa/audio/ci/audio-ingest-summary.json');
    expect(workflow).toContain('actions/upload-artifact@v7');
    expect(workflow).toContain('qa/audio/ci');
    expect(workflow).not.toContain("python - <<'PY'");
  });
});
