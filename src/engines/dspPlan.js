import { estimateHeadroom, smoothEqCurve } from './eqMath.js';

export function buildDspPlan({ profile, readiness } = {}) {
  const eq = profile?.recommendation?.eq || [];
  const smoothedEq = smoothEqCurve(eq);
  const headroom = estimateHeadroom(smoothedEq);
  return {
    schema: 'cueforge.dsp-plan.v1',
    readyForNative: readiness?.status === 'native-engine-ready',
    stages: [
      { id: 'capture', label: 'Capture/read audio features', status: 'planned' },
      { id: 'analyze', label: 'Extract bands, transients, pan, width, and noise', status: 'planned' },
      { id: 'decide', label: 'Use profile/conflict/readiness state before applying changes', status: 'planned' },
      { id: 'export', label: 'Export or explicitly apply after review', status: 'ready' }
    ],
    eq: smoothedEq,
    headroom
  };
}
