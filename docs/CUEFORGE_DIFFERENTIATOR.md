# CueForge Differentiator

CueForge is the audio chain verifier + personal sound engine for gamers.

It is not trying to win by being another preset pack. The product lane is proof:

- Prove what the player setup is doing.
- Learn what the player actually prefers.
- Warn when Sonar, APO, Peace, Voicemeeter, VB-CABLE, Discord, spatial layers, or device suites make the chain harder to trust.
- Map every game or genre to a clear audio intent.
- Export or apply through explicit, reviewable steps.
- Keep evidence local unless the player chooses to share it.
- Prepare a native engine later with a manifest, safety rules, and proof gates first.

## CueForge Brain

The shared product brain lives in `src/core/cueforgeBrain.js`.

`buildCueForgeBrain()` reads the same state used by Auto Detect, Chain Graph, Conflict Detector, Readiness Score, Profile Engine, Native Engine Manifest, and Release Pack. It returns:

- A product score.
- A release tier.
- Seven proof pillars.
- Top proof points.
- Next actions.
- Honest competitor contrast.
- A hard safety boundary.

The seven pillars are:

1. Chain Verifier - proves the real game, Windows, output, mic, companion app, and apply path.
2. Personal Sound Engine - combines hearing, Sound Match, Blind Match, masking, hardware, and profile confidence.
3. Conflict Doctor - warns when layers fight each other before a player blames the game or the app.
4. Game Intent - picks a purpose-built mode instead of treating every title like generic FPS.
5. Safe Export / Apply - keeps system changes explicit and reviewable.
6. Local Evidence - turns self-tests, match proof, report packs, and export packs into useful local proof.
7. Native-Ready Brain - creates the manifest and state anchor that later native DSP work can consume.

## Trust Boundary

CueForge improves the final audio chain. It does not:

- Silently change Windows settings.
- Install drivers without review.
- Read game memory.
- Bypass anti-cheat boundaries.
- Claim exact enemy positions from a mixed stereo output.
- Upload raw audio by default.
- Use cloud personalization as the default path.

True object-level occlusion, reflection, and scene-aware spatial audio require game or middleware integration. CueForge can diagnose and improve the final player chain, but it should not pretend a mixed stereo output contains full game-world geometry. That honesty is part of the product trust story.

## Product Tiers

- Self-contained tier: chain verification, conflict warnings, personal preference, hearing comfort, masking checks, safe profiles, and redacted replay reports.
- Native/helper tier: desktop evidence, Windows endpoint/session checks, local DSP preview, and explicit apply/backup/undo flows.
- Integration tier: future game, engine, or middleware hooks for richer spatial metadata when a title can expose it safely.

## Open Limitations

- Windows-first: the practical next release targets WASAPI, APOs, Equalizer APO, PowerShell, and Electron first. Core Audio and PipeWire/ALSA can fit the harness later, but they are not the fastest route to proof.
- Public repo visibility: public claims should match files that are actually visible on GitHub. Local QA reports and swarm checks count publicly only after they are pushed.
- Spatial truth: CueForge can improve and verify the final chain, but arbitrary-game post-mix audio is not the same as game-engine occlusion, reflections, or object geometry.

## Product Sentence

Use this when describing the app:

> CueForge verifies your full gaming audio chain, learns your personal sound preference, warns when other apps are breaking the setup, and exports safe profiles you can test in real matches.

## Release Rule

Every major feature should answer this question before it ships:

> Which CueForge Brain pillar does this improve, and what proof shows it worked?

If a feature does not improve a pillar or feed the shared state, it stays out of the main flow.
