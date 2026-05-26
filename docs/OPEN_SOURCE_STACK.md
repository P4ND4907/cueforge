# CueForge Open-Source Stack

Status: v0.2.0-alpha.3 integration contract.

CueForge should not copy big audio apps. It should use proven open tools where they make the product safer, then wrap them in CueForge's own chain-verifier and personal sound-engine flow.

The stack is tracked in `src/data/openSourceStack.js` and tested by `src/tests/openSourceStack.test.js`. Future features should pass through this registry before a library becomes product behavior.

The broader release tooling backlog is tracked in `src/data/releaseToolBacklog.js` and tested by `src/tests/releaseToolBacklog.test.js`. That file includes tools that are not strictly open-source libraries, such as WASAPI loopback, because the release path needs one ranked table for native APIs, engines, analyzers, and automation.

## Candidate Tools and Engines

| Tool | Best use inside CueForge | Recommendation |
| --- | --- | --- |
| WASAPI loopback | Measure the actual Windows render mix from the active endpoint. | Required for Windows lab proof. |
| miniaudio | Native helper for device I/O, loopback, full-duplex harness, and internal node graph. | Primary native engine choice. |
| PortAudio | Portable stream/device abstraction with timing and latency information. | Fallback or benchmarking reference. |
| RtAudio | Lightweight common realtime I/O layer with device probing and multi-API support. | Secondary option for simpler C++ experiments. |
| RNNoise | Optional mic-path denoise baseline for comms testing. | Optional, light-touch module. |
| FFmpeg + libebur128 | Regression metrics, loudness, peak, phase, correlation, and lab analysis. | Required in CI and lab analysis. |
| Playwright | Browser and Electron E2E/smoke testing, traces, reports, and CI. | Primary automation framework. |
| Puppeteer | Small Chromium-only probes or developer scripts. | Optional, not primary. |
| Steam Audio | Synthetic lab scenes and partner/game-engine experiments. | Scene lab only, not arbitrary-game post-mix claims. |

Release order:

1. v0.2 hardening: Playwright first, Puppeteer only for tiny developer probes.
2. v0.3 Native DSP Sandbox: miniaudio, WASAPI loopback spike, FFmpeg/libebur128 metrics, PortAudio/RtAudio benchmarks only if useful.
3. v0.4 Desktop Real-Time Preview: manifest-controlled A/B preview through the app, no driver install.
4. v0.6 Mic Enhancement Pack: RNNoise as explicit opt-in comparison.
5. v0.7 Spatial Research Pack: Steam Audio in synthetic/partner scene labs only.

## Use Now

### Equalizer APO

Role: primary Windows output EQ target.

CueForge should keep Equalizer APO as the main Windows EQ handoff because it fits the current product boundary: generate readable config, help verify the endpoint, then let the player apply it explicitly.

What CueForge does:

- Exports APO config text.
- Warns when Sonar, virtual mixers, or endpoint confusion may make the APO target wrong.
- Saves local desktop draft files only when the player triggers that action.

What CueForge does not do:

- Silently rewrite real APO config locations.
- Install APO or change Windows routing in the background.
- Claim APO changed the game path until the player proves it audibly.

### AutoEq

Role: headphone and IEM baseline companion.

AutoEq is useful as upstream baseline data for known gear, but it should never replace CueForge's own personal layer. Hardware baseline comes first, then hearing model, Sound Match, game intent, masking evidence, and safety clamps.

What CueForge should build next:

- Import/reference exact model baselines only after the player confirms the gear.
- Label the baseline source in profile exports.
- Keep unknown gear on conservative generic profiles.

### Playwright

Role: default UI and visual regression layer.

The human-swarm work keeps proving the same lesson: tests can pass while a person still sees crooked boxes, cramped cards, or confusing flow. Playwright should become the standard check for:

- Guided setup flow.
- Command Center.
- Chain Graph.
- Player Trial.
- Mobile/tablet/desktop overflow.
- Screenshot baselines for stable surfaces.

Dynamic meters and live audio cards should use fixed fixture states or masks so visual tests do not become noisy.

## Browser DSP Core

### OfflineAudioContext

Role: deterministic browser render harness.

CueForge already has deterministic masking fixtures. Offline rendering should be the default way to prove analyzer and EQ behavior before touching real hardware.

Use it for:

- Masking Lab fixtures.
- Before/after EQ proof.
- Golden browser-side analyzer frames.
- Regression tests that do not depend on a real mic or headset.

Boundary: offline proof is not a live latency claim.

### AudioWorklet

Role: future low-latency browser analyzer processor.

AudioWorklet is the right browser step after the current analyzer math is stable. Move frame extraction and analyzer work off the UI path, compare it against WAV and OfflineAudioContext fixtures, then keep fallback behavior for unsupported browsers.

Boundary: browser worklets are not a system-wide engine and must not autoplay, capture, or process sound without a direct player action.

## Next Native Stage

### NAudio

Role: Windows-first helper candidate.

If CueForge adds a small .NET sidecar, NAudio is the practical Windows path to test endpoint enumeration, sessions, WASAPI loopback, FFT, and filter experiments. It belongs behind the native helper manifest, not directly inside random UI code.

Proof gates:

- Helper manifest validates before UI reads the data.
- Loopback is explicit and local.
- Capabilities keep `canModifySystemState: false`.

### miniaudio

Role: portable native DSP sandbox.

miniaudio stays in the v0.3 Native DSP Sandbox lane. It is the best first native lab helper for CueForge because it can cover playback, capture, full-duplex experiments, device enumeration, WASAPI loopback measurement, offline rendering, PEQ and limiter proof, and a compact internal node graph without making CueForge depend on a large always-on service.

Boundary: do not ship it as a system-wide app yet. No driver install. No hidden routing.

### RNNoise

Role: opt-in mic noise diagnostic and cleanup candidate.

RNNoise should become an optional comparison module when CueForge's analyzer thinks room/chain noise is the likely mic problem. It should not become surprise always-on cleanup.

Good behavior:

- Show before/after noise floor and voice presence.
- Keep raw audio local by default.
- Export Discord-safe mic suggestions.

Blocked behavior:

- Hidden gain changes.
- Cloud mic processing by default.
- Always-on recording.

## Differentiated Tier

### Steam Audio

Role: game and middleware spatial research tier.

Steam Audio is powerful for HRTF, occlusion, reflection, propagation, and engine/middleware integrations, but that is exactly why CueForge must be honest. A post-mix app cannot magically recover true game-object positions, room geometry, or occlusion from a normal stereo mix.

CueForge should split spatial work into two lanes:

- Player lane: Safe Stereo, Competitive Width, Immersive Preview.
- Partner/research lane: game or middleware hooks where spatial metadata can exist.

Blocked claims:

- "CueForge hears exact enemy positions automatically."
- "CueForge reconstructs true occlusion from a stereo mix."
- Any game memory read or anti-cheat-adjacent hook.

## Implementation Queue

1. Keep `src/data/openSourceStack.js` as the source of truth for library role, proof gates, and guardrails.
2. Add Playwright visual baselines for Command Center, Chain Graph, Player Trial, and mobile overflow.
3. Wire AutoEq as a labeled baseline under Profile Engine v2, with CueForge safety clamps above it.
4. Keep NAudio and miniaudio behind native manifest contracts.
5. Treat RNNoise as an opt-in mic diagnostic module.
6. Keep Steam Audio in research/partner lanes until real game metadata exists.

## Source Links

- [Equalizer APO on SourceForge](https://sourceforge.net/projects/equalizerapo/)
- [AutoEq on GitHub](https://github.com/jaakkopasanen/AutoEq)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [NAudio on GitHub](https://github.com/naudio/NAudio)
- [miniaudio on GitHub](https://github.com/mackron/miniaudio)
- [RNNoise on GitHub](https://github.com/xiph/rnnoise)
- [Steam Audio documentation](https://valvesoftware.github.io/steam-audio/)
- [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)
- [MDN AudioWorkletGlobalScope](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope)
