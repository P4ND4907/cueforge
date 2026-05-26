export function buildDynamicsPlan({ conflicts, profile } = {}) {
  const conservative = Boolean(conflicts?.summary?.high);
  const brightRisk = profile?.identity?.includes('bright-check-needed');
  return {
    schema: 'cueforge.dynamics-plan.v1',
    mode: conservative ? 'monitor-only' : 'gentle-guard',
    blocks: [
      { id: 'clip-watch', label: 'Clip watch', action: 'warn before boost if headroom is low' },
      { id: 'fatigue-watch', label: 'Fatigue watch', action: brightRisk ? 'reduce sharp cue lift after long sessions' : 'watch only' },
      { id: 'noise-floor', label: 'Noise floor', action: 'keep mic cleanup light to avoid robotic voice' }
    ]
  };
}
