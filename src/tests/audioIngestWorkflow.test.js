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
    expect(workflow).toContain('FedericoCarboni/setup-ffmpeg@v3');
    expect(workflow).toContain('ffmpeg-version: release');
    expect(workflow).toContain('actions/setup-python@v5');
    expect(workflow).toMatch(/pip install\s+numpy\s+soundfile\s+pyloudnorm/);
    expect(workflow).toContain('ffprobe -v error');
    expect(workflow).toContain('codec_type,codec_name,sample_rate,channels,channel_layout,bits_per_sample,bits_per_raw_sample');
    expect(workflow).toContain('npm run qa:audio-ingest');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('qa/audio/ci');
  });
});
