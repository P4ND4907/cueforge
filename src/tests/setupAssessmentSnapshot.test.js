import { describe, expect, it } from 'vitest';
import { buildCueForgeState } from '../core/cueforgeState.js';
import {
  buildSetupAssessmentSnapshot,
  publishSetupAssessmentSnapshot,
  readSetupAssessmentSnapshot,
  SETUP_ASSESSMENT_EVENT,
  SETUP_ASSESSMENT_STORAGE_KEY,
  SETUP_ASSESSMENT_WINDOW_KEY,
  validateSetupAssessmentSnapshot
} from '../core/setupAssessmentSnapshot.js';

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value)
  };
}

function eventTarget() {
  const events = [];
  class LocalCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  return {
    events,
    CustomEvent: LocalCustomEvent,
    dispatchEvent: (event) => {
      events.push(event);
      return true;
    }
  };
}

describe('setup assessment snapshot', () => {
  it('builds a versioned local snapshot from the CueForge state bundle', () => {
    const bundle = buildCueForgeState({
      devices: [
        { kind: 'audioinput', label: 'USB Test Mic' },
        { kind: 'audiooutput', label: 'USB Test DAC' }
      ],
      desktopReady: true,
      apoConfig: 'Preamp: -4 dB',
      selfTests: [{ status: 'pass' }]
    });
    const snapshot = buildSetupAssessmentSnapshot(bundle, {
      createdAt: '2026-05-24T09:00:00.000Z',
      source: 'unit-test'
    });

    expect(snapshot).toMatchObject({
      schema: 'cueforge.setup-assessment-snapshot.v1',
      version: '0.2.0-alpha.3',
      source: 'unit-test',
      privacy: {
        rawAudioIncluded: false,
        rawDeviceIdsIncluded: false,
        rawUserPathsIncluded: false,
        publicSafeByDefault: true
      }
    });
    expect(snapshot.stateAnchor.statePresent).toBe(true);
    expect(snapshot.readiness.nextActions.length).toBeGreaterThan(0);
    expect(snapshot.brain.contrast).toContain('Not just EQ preset packs.');
    expect(validateSetupAssessmentSnapshot(snapshot)).toEqual({ ok: true, issues: [] });
  });

  it('publishes through localStorage, a window key, and a namespaced event', () => {
    const bundle = buildCueForgeState({ apoConfig: 'Preamp: -4 dB' });
    const snapshot = buildSetupAssessmentSnapshot(bundle);
    const storage = memoryStorage();
    const target = eventTarget();

    const result = publishSetupAssessmentSnapshot(snapshot, { storage, target });
    const saved = readSetupAssessmentSnapshot({ storage });

    expect(result).toMatchObject({
      ok: true,
      storageKey: SETUP_ASSESSMENT_STORAGE_KEY,
      windowKey: SETUP_ASSESSMENT_WINDOW_KEY,
      eventName: SETUP_ASSESSMENT_EVENT
    });
    expect(saved.schema).toBe('cueforge.setup-assessment-snapshot.v1');
    expect(target[SETUP_ASSESSMENT_WINDOW_KEY]).toBe(snapshot);
    expect(target.events).toHaveLength(1);
    expect(target.events[0].type).toBe(SETUP_ASSESSMENT_EVENT);
    expect(target.events[0].detail).toBe(snapshot);
  });

  it('rejects snapshots that leak raw evidence or lose the state anchor', () => {
    const bad = {
      schema: 'cueforge.setup-assessment-snapshot.v1',
      version: '0.2.0-alpha.3',
      stateAnchor: { statePresent: false },
      privacy: {
        rawAudioIncluded: true,
        rawDeviceIdsIncluded: false,
        rawUserPathsIncluded: false
      },
      readiness: { nextActions: [] }
    };

    const validation = validateSetupAssessmentSnapshot(bad);

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContain('Snapshot is missing a valid state anchor.');
    expect(validation.issues).toContain('Snapshot must not include raw audio.');
  });
});
