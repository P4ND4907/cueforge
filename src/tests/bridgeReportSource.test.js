import { describe, expect, it } from 'vitest';
import { shouldFetchGeneratedBridgeReport } from '../core/bridgeReportSource.js';

describe('generated bridge report source', () => {
  it('does not probe private generated reports from the public GitHub Pages site', () => {
    expect(shouldFetchGeneratedBridgeReport({
      protocol: 'https:',
      hostname: 'p4nd4907.github.io'
    })).toBe(false);
  });

  it('allows localhost web runs to probe an explicitly generated local report', () => {
    expect(shouldFetchGeneratedBridgeReport({
      protocol: 'http:',
      hostname: '127.0.0.1'
    })).toBe(true);
  });

  it('skips file protocol because the desktop bridge owns local file access', () => {
    expect(shouldFetchGeneratedBridgeReport({
      protocol: 'file:',
      hostname: ''
    })).toBe(false);
  });
});
