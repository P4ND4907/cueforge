# Shared Schemas

Versioned schema contracts live here when they graduate out of feature-specific code.

Current schema owners:

- Hardware profiles: `src/shared/schemas/hardwareProfile.js` and `qa/hardware-profiles/*.json`.
- Lab manifests: `src/shared/schemas/labManifest.js` and `qa/audio/manifests/*.json`.
- Native helper manifest: `src/core/manifests` and `src/native/helper`.
- Native DSP manifest: `src/engines/nativeEngineManifest.js`.
- Evidence privacy policy: `src/core/evidencePrivacyPolicy.js`.
- CueForge state: `src/core/cueforgeState.js`.

Do not create unversioned export shapes for reports, native helpers, or shared state.
