import { useMemo } from 'react';
import { cueforgeStateV2 } from '../../core/cueforgeState.js';

export function useCueForgeState(seed: Record<string, unknown> = {}) {
  return useMemo(() => ({ ...cueforgeStateV2, ...seed }), [seed]);
}
