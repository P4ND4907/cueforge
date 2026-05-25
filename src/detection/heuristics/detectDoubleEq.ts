export function detectDoubleEq({ companions = {} }: { companions?: Record<string, any> } = {}) {
  const active = ['equalizerApo', 'peace', 'sonar', 'dolby', 'nahimic', 'razer']
    .filter((key) => companions[key]?.detected === true || companions[key] === true);

  return {
    id: 'double-eq',
    active,
    warning: active.length > 1 ? 'Multiple EQ/enhancer layers may be shaping the same output.' : null
  };
}
