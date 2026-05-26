export const setupPresets = {
  browserStarter: {
    id: 'browserStarter',
    label: 'Browser starter',
    mode: 'browser',
    description: 'Use browser device scan, safe EQ export, and manual setup confirmation.'
  },
  desktopBridge: {
    id: 'desktopBridge',
    label: 'Desktop bridge',
    mode: 'desktop',
    description: 'Use local Windows scan for real endpoint names, tools, and companion layers.'
  },
  realMatchProof: {
    id: 'realMatchProof',
    label: 'Real match proof',
    mode: 'proof',
    description: 'Run before/after check-ins and keep tuning changes tied to player evidence.'
  }
};
