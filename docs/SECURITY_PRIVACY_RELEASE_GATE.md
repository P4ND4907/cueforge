# Security, Privacy, and CI Release Gate

Status: release blocker for CueForge v0.2.0-alpha.3 and later.

CueForge's trust story is part of the product. The app can be weird, early, and experimental, but it cannot be casual with private setup data, mic evidence, or Windows audio changes.

The enforceable gate lives in:

- `src/securityPrivacyGate.js`
- `src/securityPrivacyGate.test.js`
- `src/exportFingerprints.js`
- `src/security/electronPolicy.js`
- `.github/workflows/release-gate.yml`

## Required Security Rules

1. Local-first by default.
   No silent upload of reports, device data, mic data, or evidence clips.

2. Redaction stays mandatory.
   Exports must strip raw device IDs, group IDs, machine/user identifiers, Windows paths, emails, phone numbers, tokens, passwords, and recovery codes.

3. Use hashed export fingerprints for correlation.
   If CueForge needs to correlate a device or route across reports, it uses `cfp_...` fingerprints from `src/exportFingerprints.js`, not raw labels or IDs.

4. Keep driver-layer boundaries.
   No silent driver install, no silent default-device changes, no hidden EQ stacking, and no silent Equalizer APO writes.

5. Harden Electron before desktop trust grows.
   The desktop shell keeps context isolation, node integration off, renderer sandboxing, sender-validated IPC, HTTPS-only external links, and a restrictive Content Security Policy.

6. Treat native helper manifests as safe capability contracts.
   If a helper capability is not declared, the UI must not assume it exists. `canModifySystemState` remains `false` in the current helper contract.

7. Keep hearing language honest.
   CueForge's hearing workflow is an IEM/headphone threshold guide, not a medical hearing test.

8. Keep evidence packets summary-only.
   Raw audio stays local by default, uploads are opt-in only, and public packets carry summaries plus derived metrics instead of whole system dumps.

9. Keep protected playback claims honest.
   WASAPI loopback and native capture helpers must not promise universal capture of DRM or protected playback streams.

## CI Gate

GitHub Actions runs the release gate on push, pull request, and manual dispatch:

```powershell
npm ci
npm test -- src/securityPrivacyGate.test.js src/tests/evidencePrivacyPolicy.test.js src/exportFingerprints.test.js src/privacyAudit.test.js src/electronHardening.test.js
npm test
npm run build
npm audit --audit-level=moderate
npm run qa:preflight
```

Local pre-release QA now starts with the same focused security/privacy test set before running the full suite.

## Electron Desktop Hardening

The Electron shell now uses `src/security/electronPolicy.js` for shared policy:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- IPC sender validation for every desktop helper channel
- Content Security Policy with no broad remote `connect-src`
- External links opened only for safe `https:` URLs
- App navigation limited to local CueForge content

This keeps the desktop bridge useful without turning it into a general browser with native powers.

The policy follows Electron's published security checklist around context isolation, process sandboxing, restrictive CSP, limited navigation/window creation, safe `shell.openExternal` usage, and IPC sender validation.

## Export Fingerprints

Reports and export packs include stable fingerprints such as:

```text
cfp_0123456789abcdef0123
```

Those are for matching "same setup, same route, same issue" across tester reports without sharing raw device IDs, group IDs, Windows paths, serials, or private labels.

## Hard Failure Examples

These should block a release:

- A report export contains `C:\Users\...`.
- An export contains a raw `deviceId`, `groupId`, serial, email, phone, token, password, or recovery code.
- Electron IPC accepts a sender outside local CueForge content.
- A native helper manifest claims `canModifySystemState: true`.
- RNNoise, mic evidence, or loopback capture runs without explicit player action.
- A public evidence packet contains raw audio, a raw handle, a local path, an email, a phone number, or a raw device ID.
- The app promises universal loopback capture of DRM/protected playback.
- The app claims the hearing flow is medical or diagnostic.
- The app claims true enemy position or game-object occlusion from a normal mixed stereo output.

## References

- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
