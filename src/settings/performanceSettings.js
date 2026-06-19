export const PERFORMANCE_PROFILES = Object.freeze({
  quiet: Object.freeze({ updateRate: 200, analyserSize: 128, monitoring: true }),
  balanced: Object.freeze({ updateRate: 100, analyserSize: 256, monitoring: true }),
  high: Object.freeze({ updateRate: 50, analyserSize: 512, monitoring: true }),
  game: Object.freeze({ updateRate: 0, analyserSize: 64, monitoring: false })
});

export let currentProfile = 'balanced';

export const setPerformanceProfile = (profile) => {
  if (PERFORMANCE_PROFILES[profile]) {
    currentProfile = profile;
    return true;
  }
  return false;
};

export function resetPerformanceProfile() {
  currentProfile = 'balanced';
}

export function getPerformanceProfile() {
  return currentProfile;
}

export function getPerformanceProfileConfig(profile = currentProfile) {
  return PERFORMANCE_PROFILES[profile] || PERFORMANCE_PROFILES.balanced;
}

export function applyPerformanceProfileToAnalyser(analyser, profile = currentProfile) {
  const config = getPerformanceProfileConfig(profile);
  if (analyser && Number.isFinite(config.analyserSize)) {
    analyser.fftSize = clampFftSize(config.analyserSize);
  }
  return {
    profile: PERFORMANCE_PROFILES[profile] ? profile : 'balanced',
    ...config
  };
}

function clampFftSize(size) {
  const allowed = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  return allowed.includes(size) ? size : 256;
}
