import { getPerformanceProfile, getPerformanceProfileConfig } from '../../settings/performanceSettings.js';

export class EfficientMonitor {
  constructor({
    scheduler = (callback, delay) => setTimeout(callback, delay),
    cancelScheduler = (handle) => clearTimeout(handle),
    now = () => Date.now()
  } = {}) {
    this.scheduler = scheduler;
    this.cancelScheduler = cancelScheduler;
    this.now = now;
    this.handle = null;
    this.active = false;
    this.tick = 0;
  }

  start(onUpdate) {
    const profile = getPerformanceProfile();
    const config = getPerformanceProfileConfig(profile);

    if (!config.monitoring) {
      return {
        running: false,
        profile,
        reason: 'monitoring-disabled',
        stop: () => this.stop()
      };
    }

    this.active = true;
    this.tick = 0;
    const run = () => {
      if (!this.active) return;
      this.tick += 1;
      onUpdate?.({
        profile: getPerformanceProfile(),
        config: getPerformanceProfileConfig(),
        tick: this.tick,
        at: this.now()
      });
      const nextConfig = getPerformanceProfileConfig();
      if (nextConfig.monitoring) {
        this.handle = this.scheduler(run, Math.max(16, nextConfig.updateRate));
      } else {
        this.stop();
      }
    };

    run();
    return {
      running: true,
      profile,
      stop: () => this.stop()
    };
  }

  stop() {
    this.active = false;
    if (this.handle !== null) {
      this.cancelScheduler(this.handle);
      this.handle = null;
    }
  }
}
