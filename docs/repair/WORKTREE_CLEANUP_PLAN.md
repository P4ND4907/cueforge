# Worktree Cleanup Plan

Generated: 2026-05-24T11:37:14.726Z
Branch: main
HEAD: d8f4b3c

## Status

Dirty entries: 427
Modified: 43
Deleted: 2
Untracked: 382

## Policy

- Do not revert sprint work just to make the status clean.
- Commit or review changes by lane so CI/docs, app product work, desktop/native work, social work, and generated artifacts do not get mixed accidentally.
- Generated repair reports and screenshots are evidence artifacts; decide intentionally which ones belong in GitHub before adding them.
- Release candidate gates should be committed with their tests and docs before any public release work.

## Suggested Commit Slices

1. Release/CI gates: package scripts, workflows, release-readiness tools, RC acceptance contract, and matching docs.
2. App product core: Setup Command Center, analyzer, state, privacy, profile, UI, and feature modules.
3. Desktop/native bridge: Electron, PowerShell scanner, native harness stubs, and desktop docs.
4. QA/lab/swarm: manifests, harnesses, generated reports selected for evidence, and screenshot baselines.
5. Social/Discord/outreach: Discord bot, social memory, post queues, and community docs.
6. Public bundle/media: GitHub Pages assets and panda media only when the build is meant to publish.

## Lanes

### Release / CI gates

Keep this lane tight: workflows, package scripts, Playwright configs, release-readiness tools, and the RC acceptance contract.

Count: 44

| Status | Kind | Path |
| --- | --- | --- |
| M | modified | `package-lock.json` |
| M | modified | `package.json` |
| M | modified | `vite.config.js` |
| ?? | untracked | `.github/copilot-instructions.md` |
| ?? | untracked | `.github/workflows/release-gate.yml` |
| ?? | untracked | `playwright.config.mjs` |
| ?? | untracked | `playwright.electron.config.mjs` |
| ?? | untracked | `qa/README.md` |
| ?? | untracked | `qa/audio/analyzers/README.md` |
| ?? | untracked | `qa/audio/baselines/README.md` |
| ?? | untracked | `qa/audio/fixtures/README.md` |
| ?? | untracked | `qa/audio/manifests/README.md` |
| ?? | untracked | `qa/audio/manifests/clean-apo-audio-regression.json` |
| ?? | untracked | `qa/audio/manifests/complex-routing-vm-lab.json` |
| ?? | untracked | `qa/audio/manifests/machine-play-lab-full-coverage.json` |
| ?? | untracked | `qa/audio/manifests/setup-command-center-smoke.json` |
| ?? | untracked | `qa/audio/policies/README.md` |
| ?? | untracked | `qa/audio/policies/eq-render-a-b.json` |
| ?? | untracked | `qa/audio/reports/README.md` |
| ?? | untracked | `qa/hardware-profiles/README.md` |
| ?? | untracked | `qa/hardware-profiles/win-realtek-hyperx-sonar.json` |
| ?? | untracked | `qa/hardware-profiles/win-usb-dac-apo-clean.json` |
| ?? | untracked | `qa/hardware-profiles/win-voicemeeter-vbcable-complex.json` |
| ?? | untracked | `qa/hardware-profiles/win-wireless-chat-game-split.json` |
| ?? | untracked | `qa/playwright/electron-report/index.html` |
| ?? | untracked | `qa/playwright/electron/README.md` |
| ?? | untracked | `qa/playwright/electron/desktop-bridge-smoke.spec.mjs` |
| ?? | untracked | `qa/playwright/web/README.md` |
| ?? | untracked | `qa/playwright/web/command-center-smoke.spec.mjs` |
| ?? | untracked | `src/data/releaseAcceptanceChecklist.js` |
| ?? | untracked | `src/tests/releaseAcceptanceChecklist.test.js` |
| ?? | untracked | `tools/Run-AudioFixtureRegression.mjs` |
| ?? | untracked | `tools/Run-FeedbackContract.mjs` |
| ?? | untracked | `tools/Run-HumanSwarmCdp.mjs` |
| ?? | untracked | `tools/Run-HumanSwarmQa.mjs` |
| ?? | untracked | `tools/Run-PandaNotesRepair.mjs` |
| ?? | untracked | `tools/Run-PreReleaseQa.mjs` |
| ?? | untracked | `tools/Run-ReleaseReadiness.mjs` |
| ?? | untracked | `tools/Run-RouteGraphLab.mjs` |
| ?? | untracked | `tools/Run-ScreenshotUpdate.mjs` |
| ?? | untracked | `tools/Run-VirtualMachinePlayerLab.mjs` |
| ?? | untracked | `tools/Run-WorktreeAudit.mjs` |
| ?? | untracked | `tools/run-checks.ps1` |
| ?? | untracked | `tools/run-checks.sh` |

### Generated QA / repair evidence

Evidence from local runs. Useful, but should be curated before public commits.

Count: 54

| Status | Kind | Path |
| --- | --- | --- |
| ?? | untracked | `docs/repair/AUDIO_FIXTURE_REGRESSION.md` |
| ?? | untracked | `docs/repair/BROWSER_HUMAN_SWARM_QA_RUN.md` |
| ?? | untracked | `docs/repair/BROWSER_HUMAN_SWARM_WAVE_1.md` |
| ?? | untracked | `docs/repair/COMPACT_HUMAN_WAVE_QA.md` |
| ?? | untracked | `docs/repair/FEEDBACK_CONTRACT.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_accessibility-privacy-guardians.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_alpha-beta-hunters.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_audio-science-reviewers.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_community-growth-operators.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_competitive-fps-coaches.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_curious-thinkers.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_design-reviewers.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_desktop-release-engineers.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_final-flow-qol.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_logic-council.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_standard.md` |
| ?? | untracked | `docs/repair/HUMAN_SWARM_CDP_QA_RUN_stress-breakers.md` |
| ?? | untracked | `docs/repair/PANDA_NOTES_REPAIR_PACKET.txt` |
| ?? | untracked | `docs/repair/PANDA_NOTES_REPAIR_QUEUE.md` |
| ?? | untracked | `docs/repair/PRE_RELEASE_QA_RUN.md` |
| ?? | untracked | `docs/repair/RELEASE_READINESS.md` |
| ?? | untracked | `docs/repair/ROUTE_GRAPH_LAB.md` |
| ?? | untracked | `docs/repair/SCREENSHOT_SMOKE_RUN.md` |
| ?? | untracked | `docs/repair/VIRTUAL_MACHINE_PLAYER_LAB.md` |
| ?? | untracked | `docs/repair/WORKTREE_CLEANUP_PLAN.md` |
| ?? | untracked | `docs/repair/audio-fixture-regression.json` |
| ?? | untracked | `docs/repair/browser-human-swarm-state.json` |
| ?? | untracked | `docs/repair/feedback-contract.json` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-accessibility-privacy-guardians.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-alpha-beta-hunters.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-audio-science-reviewers.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-community-growth-operators.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-competitive-fps-coaches.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-curious-thinkers.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-design-reviewers.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-desktop-release-engineers.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-final-flow-qol.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-logic-council.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-standard.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary-stress-breakers.png` |
| ?? | untracked | `docs/repair/human-swarm-cdp-summary.png` |
| ?? | untracked | `docs/repair/panda-notes-repair-check.json` |
| ?? | untracked | `docs/repair/panda-notes-repair-run.json` |
| ?? | untracked | `docs/repair/release-readiness.json` |
| ?? | untracked | `docs/repair/route-graph-lab-summary.json` |
| ?? | untracked | `docs/repair/screenshots/auto-detect.png` |
| ?? | untracked | `docs/repair/screenshots/blind-match.png` |
| ?? | untracked | `docs/repair/screenshots/command-center-mobile.png` |
| ?? | untracked | `docs/repair/screenshots/command-center.png` |
| ?? | untracked | `docs/repair/screenshots/hearing.png` |
| ?? | untracked | `docs/repair/screenshots/masking-lab.png` |
| ?? | untracked | `docs/repair/screenshots/report-lab.png` |
| ?? | untracked | `docs/repair/worktree-cleanup-plan.json` |

### GitHub Pages bundle / public media

Generated public site assets and media. Commit only when the matching build is intended.

Count: 24

| Status | Kind | Path |
| --- | --- | --- |
| D | deleted | `docs/assets/index-BxPEiPXz.js` |
| D | deleted | `docs/assets/index-XoWzmCus.css` |
| M | modified | `docs/index.html` |
| ?? | untracked | `docs/assets/index-Bor0kfVL.js` |
| ?? | untracked | `docs/assets/index-BvVn950a.css` |
| ?? | untracked | `docs/assets/index-Bx-rX8yI.js` |
| ?? | untracked | `docs/assets/index-CFF8cdNJ.js` |
| ?? | untracked | `docs/assets/index-CIDHKmR0.js` |
| ?? | untracked | `docs/assets/index-CunSi33e.js` |
| ?? | untracked | `docs/assets/index-DU5iWuql.css` |
| ?? | untracked | `docs/assets/index-cMafSHsk.js` |
| ?? | untracked | `docs/media/panda-motion-pass-status.json` |
| ?? | untracked | `docs/media/panda-soundwalk-enhanced-clean.mp4` |
| ?? | untracked | `docs/media/panda-soundwalk-enhanced-clean.webm` |
| ?? | untracked | `docs/media/panda-soundwalk-enhanced-mobile.mp4` |
| ?? | untracked | `docs/media/panda-soundwalk-full-cut.mp4` |
| ?? | untracked | `docs/media/panda-soundwalk-hero-desktop.mp4` |
| ?? | untracked | `docs/media/panda-soundwalk-hero-desktop.webm` |
| ?? | untracked | `docs/media/panda-soundwalk-hero-mobile.mp4` |
| ?? | untracked | `docs/media/panda-soundwalk-poster.jpg` |
| ?? | untracked | `docs/media/panda-soundwalk-setup-chaos.mp4` |
| ?? | untracked | `docs/media/panda-soundwalk-setup-chaos.webm` |
| ?? | untracked | `docs/media/panda-soundwalk-setup-poster.jpg` |
| ?? | untracked | `docs/media/panda-soundwalk-story-full.mp4` |

### Social / Discord / outreach

Community docs, Discord bot changes, social memory, and outreach queues should stay separate from release gates.

Count: 18

| Status | Kind | Path |
| --- | --- | --- |
| M | modified | `discord-bot/README.md` |
| M | modified | `discord-bot/src/index.js` |
| M | modified | `docs/DISCORD_FINAL_BUILDOUT.md` |
| M | modified | `docs/REDDIT_PROFILE_AND_OUTREACH.md` |
| M | modified | `docs/X_OUTREACH_QUEUE.md` |
| M | modified | `src/communityHub.js` |
| M | modified | `src/communityHub.test.js` |
| ?? | untracked | `docs/DISCORD_ROLE_PICKER_AND_NITRO_BACK_POCKET.md` |
| ?? | untracked | `docs/social/2026-05-23-update-004-rollout-log.md` |
| ?? | untracked | `docs/social/2026-05-24-social-command-center.md` |
| ?? | untracked | `docs/social/COMMUNITY_MEMORY.md` |
| ?? | untracked | `docs/social/REDDIT_COMMENT_QUEUE_2026-05-23.md` |
| ?? | untracked | `docs/social/REPLY_ONLY_PLAYBOOK.md` |
| ?? | untracked | `docs/social/X_SIGNAL_WATCHLIST.md` |
| ?? | untracked | `docs/social/community-watchlist.json` |
| ?? | untracked | `src/socialMemory.js` |
| ?? | untracked | `src/socialMemory.test.js` |
| ?? | untracked | `tools/Update-CommunityMemory.mjs` |

### Product docs / roadmap

Architecture, roadmap, privacy, release notes, and public truth docs.

Count: 37

| Status | Kind | Path |
| --- | --- | --- |
| M | modified | `FILE_INVENTORY.md` |
| M | modified | `README.md` |
| M | modified | `docs/ARCHITECTURE.md` |
| M | modified | `docs/DRIVER_LAYER.md` |
| M | modified | `docs/HIGH_END_ANALYZER_PLAN.md` |
| M | modified | `docs/MASTER_PLAN.md` |
| M | modified | `docs/OPEN_TASK_QUEUE.md` |
| M | modified | `docs/PRIVACY.md` |
| M | modified | `docs/RELEASE_CHECKLIST.md` |
| M | modified | `docs/SOCIAL_POSTING_PLAN.md` |
| M | modified | `docs/research/audio-platform-notes.md` |
| ?? | untracked | `docs/ACCEPTANCE_CHECKLIST_v0.2.0.md` |
| ?? | untracked | `docs/AGENTS.md` |
| ?? | untracked | `docs/BUILD_QOL_AUTOMATION_RELEASE_QUEUE.md` |
| ?? | untracked | `docs/CUEFORGE_DIFFERENTIATOR.md` |
| ?? | untracked | `docs/IMPLEMENTATION_BACKLOG.md` |
| ?? | untracked | `docs/NATIVE_ENGINE_ROADMAP.md` |
| ?? | untracked | `docs/OPEN_SOURCE_STACK.md` |
| ?? | untracked | `docs/PRE_RELEASE_NOTE_CADENCE.md` |
| ?? | untracked | `docs/QA_EVIDENCE_PIPELINE.md` |
| ?? | untracked | `docs/RUNBOOK.md` |
| ?? | untracked | `docs/SECURITY_PRIVACY_RELEASE_GATE.md` |
| ?? | untracked | `docs/STATE_V2_CONTRACT.md` |
| ?? | untracked | `docs/TEST_MATRIX.md` |
| ?? | untracked | `docs/architecture/README.md` |
| ?? | untracked | `docs/architecture/REPO_LAYOUT.md` |
| ?? | untracked | `docs/prompts/CODEX_NEXT_STEPS.md` |
| ?? | untracked | `docs/prompts/GITHUB_COPILOT_DESKTOP_FOUNDATION.md` |
| ?? | untracked | `docs/qa/README.md` |
| ?? | untracked | `docs/research/COMMON_PROBLEMS_AND_BETTER_SOLUTIONS.md` |
| ?? | untracked | `docs/research/GAME_AUDIO_ENGINE_DEEP_DIVE.md` |
| ?? | untracked | `docs/research/STATE_OF_ART_GAP_ANALYSIS.md` |
| ?? | untracked | `docs/updates/2026-05-22-alpha-2-hardening.md` |
| ?? | untracked | `docs/updates/2026-05-22-update-003.md` |
| ?? | untracked | `docs/updates/2026-05-23-update-004-cueforge-brain.md` |
| ?? | untracked | `docs/updates/2026-05-23-v0.2.0-alpha.3.md` |
| ?? | untracked | `docs/updates/2026-05-24-update-005-chain-graph-proof.md` |

### Desktop / native bridge

Electron bridge, Windows scanner, native harness stubs, and desktop permission boundaries.

Count: 18

| Status | Kind | Path |
| --- | --- | --- |
| M | modified | `electron/main.mjs` |
| M | modified | `electron/preload.cjs` |
| M | modified | `tools/Scan-AudioSetup.ps1` |
| ?? | untracked | `native/README.md` |
| ?? | untracked | `native/windows/apo/README.md` |
| ?? | untracked | `native/windows/bridge/README.md` |
| ?? | untracked | `native/windows/probes/README.md` |
| ?? | untracked | `native/windows/wasapi-harness/README.md` |
| ?? | untracked | `src/desktopBridgePlan.js` |
| ?? | untracked | `src/desktopBridgePlan.test.js` |
| ?? | untracked | `src/native/electron/main.mjs` |
| ?? | untracked | `src/native/electron/preload.cjs` |
| ?? | untracked | `src/native/harness/nativeCaptureHarness.js` |
| ?? | untracked | `src/native/helper/collect-default-endpoints.ts` |
| ?? | untracked | `src/native/helper/collect-enhancements.ts` |
| ?? | untracked | `src/native/helper/collect-sessions.ts` |
| ?? | untracked | `src/native/helper/collect-wasapi.ts` |
| ?? | untracked | `src/native/helper/manifest-schema.json` |

### App product code

Main CueForge app, UI, state, analyzer, privacy, setup intelligence, tests, and feature modules.

Count: 217

| Status | Kind | Path |
| --- | --- | --- |
| M | modified | `.gitignore` |
| M | modified | `src/audioDna.js` |
| M | modified | `src/audioEvidence.js` |
| M | modified | `src/audioEvidence.test.js` |
| M | modified | `src/autoTune.js` |
| M | modified | `src/autoTune.test.js` |
| M | modified | `src/blindMatch.js` |
| M | modified | `src/blindMatch.test.js` |
| M | modified | `src/exportPack.js` |
| M | modified | `src/exportPack.test.js` |
| M | modified | `src/hearingModel.js` |
| M | modified | `src/hearingModel.test.js` |
| M | modified | `src/main.jsx` |
| M | modified | `src/reportPack.js` |
| M | modified | `src/reportPack.test.js` |
| M | modified | `src/styles.css` |
| M | modified | `src/uiFeedback.js` |
| M | modified | `src/uiFeedback.test.js` |
| ?? | untracked | `src/app/components/README.md` |
| ?? | untracked | `src/app/hooks/useCueForgeState.ts` |
| ?? | untracked | `src/app/routes/AutoDetectPage.tsx` |
| ?? | untracked | `src/app/routes/BlindMatchPage.tsx` |
| ?? | untracked | `src/app/routes/CommandCenter.tsx` |
| ?? | untracked | `src/app/routes/HearingPage.tsx` |
| ?? | untracked | `src/app/routes/MaskingLabPage.tsx` |
| ?? | untracked | `src/app/routes/PlayerTrialPage.tsx` |
| ?? | untracked | `src/app/routes/ReportLabPage.tsx` |
| ?? | untracked | `src/app/routes/SelfTestPage.tsx` |
| ?? | untracked | `src/appSettings.js` |
| ?? | untracked | `src/appSettings.test.js` |
| ?? | untracked | `src/audio-science/gameAudioProblems.js` |
| ?? | untracked | `src/audio-science/gameEngineMap.js` |
| ?? | untracked | `src/core/audioTargets.js` |
| ?? | untracked | `src/core/autoDetectReport.js` |
| ?? | untracked | `src/core/chain/buildChainGraph.ts` |
| ?? | untracked | `src/core/chain/evidence.ts` |
| ?? | untracked | `src/core/chain/evidenceGraph.ts` |
| ?? | untracked | `src/core/chain/inferReadiness.ts` |
| ?? | untracked | `src/core/chain/inferRouteWarnings.ts` |
| ?? | untracked | `src/core/chain/types.ts` |
| ?? | untracked | `src/core/chainGraph.js` |
| ?? | untracked | `src/core/commandCenterFlow.js` |
| ?? | untracked | `src/core/conflictDetector.js` |
| ?? | untracked | `src/core/cueforgeBrain.js` |
| ?? | untracked | `src/core/cueforgeState.js` |
| ?? | untracked | `src/core/evidencePrivacyPolicy.js` |
| ?? | untracked | `src/core/exportSchema.js` |
| ?? | untracked | `src/core/exports/exportPolicy.ts` |
| ?? | untracked | `src/core/exports/reportPack.ts` |
| ?? | untracked | `src/core/gameTaxonomy.js` |
| ?? | untracked | `src/core/hearingModelV2.js` |
| ?? | untracked | `src/core/manifests/nativeEngineManifest.schema.json` |
| ?? | untracked | `src/core/manifests/validateNativeEngineManifest.ts` |
| ?? | untracked | `src/core/personalizationLabInputs.js` |
| ?? | untracked | `src/core/preferenceModel.js` |
| ?? | untracked | `src/core/profileEngine.js` |
| ?? | untracked | `src/core/readinessScore.js` |
| ?? | untracked | `src/core/safetyRules.js` |
| ?? | untracked | `src/core/scopeGuard.js` |
| ?? | untracked | `src/core/scoring/confidence.ts` |
| ?? | untracked | `src/core/scoring/readinessV2.ts` |
| ?? | untracked | `src/core/setupAssessmentSnapshot.js` |
| ?? | untracked | `src/core/stateAdapters.js` |
| ?? | untracked | `src/data/companionRepoIntegration.js` |
| ?? | untracked | `src/data/genreProfiles.js` |
| ?? | untracked | `src/data/hardwareProfiles.js` |
| ?? | untracked | `src/data/implementationBacklog.js` |
| ?? | untracked | `src/data/knownCompanions.js` |
| ?? | untracked | `src/data/nativeEngineRoadmap.js` |
| ?? | untracked | `src/data/openSourceStack.js` |
| ?? | untracked | `src/data/releaseShipBars.js` |
| ?? | untracked | `src/data/releaseToolBacklog.js` |
| ?? | untracked | `src/data/setupPresets.js` |
| ?? | untracked | `src/data/testFixtures.js` |
| ?? | untracked | `src/detection/assessMachine.ts` |
| ?? | untracked | `src/detection/browser/collectBrowserAudioCaps.ts` |
| ?? | untracked | `src/detection/browser/collectBrowserDevices.ts` |
| ?? | untracked | `src/detection/heuristics/detectChatGameSplit.ts` |
| ?? | untracked | `src/detection/heuristics/detectDoubleEq.ts` |
| ?? | untracked | `src/detection/heuristics/detectWrongDefaultDevice.ts` |
| ?? | untracked | `src/detection/native/detectEqualizerLayers.ts` |
| ?? | untracked | `src/detection/native/detectVirtualRouting.ts` |
| ?? | untracked | `src/detection/native/mergeBridgeEvidence.ts` |
| ?? | untracked | `src/echoSceneInference.js` |
| ?? | untracked | `src/electronHardening.test.js` |
| ?? | untracked | `src/engine/audioMetricsEngine.js` |
| ?? | untracked | `src/engine/audioMetricsEngine.test.js` |
| ?? | untracked | `src/engine/benchmarkMetrics.js` |
| ?? | untracked | `src/engine/stateOfArtEvaluator.js` |
| ?? | untracked | `src/engine/stateOfArtEvaluator.test.js` |
| ?? | untracked | `src/engine/temporalEvidenceAccumulator.js` |
| ?? | untracked | `src/engines/dspPlan.js` |
| ?? | untracked | `src/engines/dynamicsPlan.js` |
| ?? | untracked | `src/engines/eqMath.js` |
| ?? | untracked | `src/engines/micPlan.js` |
| ?? | untracked | `src/engines/nativeEngineManifest.js` |
| ?? | untracked | `src/engines/spatialPlan.js` |
| ?? | untracked | `src/exportFingerprints.js` |
| ?? | untracked | `src/exportFingerprints.test.js` |
| ?? | untracked | `src/features/README.md` |
| ?? | untracked | `src/features/autodetect/README.md` |
| ?? | untracked | `src/features/autodetect/index.js` |
| ?? | untracked | `src/features/blind-match/README.md` |
| ?? | untracked | `src/features/blind-match/index.js` |
| ?? | untracked | `src/features/hearing/README.md` |
| ?? | untracked | `src/features/hearing/index.js` |
| ?? | untracked | `src/features/machine-play-lab-ui/README.md` |
| ?? | untracked | `src/features/machine-play-lab-ui/index.js` |
| ?? | untracked | `src/features/player-trial/README.md` |
| ?? | untracked | `src/features/player-trial/index.js` |
| ?? | untracked | `src/features/report-lab/README.md` |
| ?? | untracked | `src/features/report-lab/index.js` |
| ?? | untracked | `src/features/selftest/README.md` |
| ?? | untracked | `src/features/selftest/index.js` |
| ?? | untracked | `src/features/setup-command-center/README.md` |
| ?? | untracked | `src/features/setup-command-center/index.js` |
| ?? | untracked | `src/hardwareProof.js` |
| ?? | untracked | `src/hardwareProof.test.js` |
| ?? | untracked | `src/issuePatternMemory.js` |
| ?? | untracked | `src/issuePatternMemory.test.js` |
| ?? | untracked | `src/lab/fixtures/bridge/README.md` |
| ?? | untracked | `src/lab/fixtures/browser/README.md` |
| ?? | untracked | `src/lab/fixtures/chains/README.md` |
| ?? | untracked | `src/lab/fixtures/clips/README.md` |
| ?? | untracked | `src/lab/fixtures/hearing/README.md` |
| ?? | untracked | `src/lab/generators/commsBed.ts` |
| ?? | untracked | `src/lab/generators/explosionMasker.ts` |
| ?? | untracked | `src/lab/generators/footsteps.ts` |
| ?? | untracked | `src/lab/generators/pinkNoise.ts` |
| ?? | untracked | `src/lab/harness/renderOfflineFixture.ts` |
| ?? | untracked | `src/lab/harness/runBlindMatchFixture.ts` |
| ?? | untracked | `src/lab/harness/runMaskingFixture.ts` |
| ?? | untracked | `src/lab/harness/runSignalAnalysisFixture.ts` |
| ?? | untracked | `src/pandaNotesRepairRunner.js` |
| ?? | untracked | `src/pandaNotesRepairRunner.test.js` |
| ?? | untracked | `src/permissionRecovery.js` |
| ?? | untracked | `src/permissionRecovery.test.js` |
| ?? | untracked | `src/privacyAudit.js` |
| ?? | untracked | `src/privacyAudit.test.js` |
| ?? | untracked | `src/profileShare.js` |
| ?? | untracked | `src/profileShare.test.js` |
| ?? | untracked | `src/releaseQueue.js` |
| ?? | untracked | `src/releaseQueue.test.js` |
| ?? | untracked | `src/security/electronPolicy.js` |
| ?? | untracked | `src/securityPrivacyGate.js` |
| ?? | untracked | `src/securityPrivacyGate.test.js` |
| ?? | untracked | `src/setupIntelligence.js` |
| ?? | untracked | `src/setupIntelligence.test.js` |
| ?? | untracked | `src/shared/README.md` |
| ?? | untracked | `src/shared/audio/index.js` |
| ?? | untracked | `src/shared/privacy/index.js` |
| ?? | untracked | `src/shared/schemas/README.md` |
| ?? | untracked | `src/shared/schemas/audioRegressionPolicy.js` |
| ?? | untracked | `src/shared/schemas/hardwareProfile.js` |
| ?? | untracked | `src/shared/schemas/index.js` |
| ?? | untracked | `src/shared/schemas/labManifest.js` |
| ?? | untracked | `src/shared/schemas/swarmManifest.js` |
| ?? | untracked | `src/shared/state/index.js` |
| ?? | untracked | `src/shortcutVault.js` |
| ?? | untracked | `src/shortcutVault.test.js` |
| ?? | untracked | `src/stateConsumers.test.js` |
| ?? | untracked | `src/tests/architectureScaffold.test.js` |
| ?? | untracked | `src/tests/audioRegressionPolicy.test.js` |
| ?? | untracked | `src/tests/autoDetectReport.test.js` |
| ?? | untracked | `src/tests/chainGraph.test.js` |
| ?? | untracked | `src/tests/commandCenterFlow.test.js` |
| ?? | untracked | `src/tests/companionRepoIntegration.test.js` |
| ?? | untracked | `src/tests/conflictDetector.test.js` |
| ?? | untracked | `src/tests/contracts/README.md` |
| ?? | untracked | `src/tests/cueforgeBrain.test.js` |
| ?? | untracked | `src/tests/cueforgeState.test.js` |
| ?? | untracked | `src/tests/desktop/README.md` |
| ?? | untracked | `src/tests/evidencePrivacyPolicy.test.js` |
| ?? | untracked | `src/tests/exportSchema.test.js` |
| ?? | untracked | `src/tests/fixtures/README.md` |
| ?? | untracked | `src/tests/hardwareProfiles.test.js` |
| ?? | untracked | `src/tests/hearingModelV2.test.js` |
| ?? | untracked | `src/tests/implementationBacklog.test.js` |
| ?? | untracked | `src/tests/integration/README.md` |
| ?? | untracked | `src/tests/labManifests.test.js` |
| ?? | untracked | `src/tests/micPlan.test.js` |
| ?? | untracked | `src/tests/nativeCaptureHarness.test.js` |
| ?? | untracked | `src/tests/nativeEngineManifest.test.js` |
| ?? | untracked | `src/tests/nativeEngineRoadmap.test.js` |
| ?? | untracked | `src/tests/openSourceStack.test.js` |
| ?? | untracked | `src/tests/personalizationLabInputs.test.js` |
| ?? | untracked | `src/tests/preferenceModel.test.js` |
| ?? | untracked | `src/tests/profileEngine.test.js` |
| ?? | untracked | `src/tests/readinessScore.test.js` |
| ?? | untracked | `src/tests/releaseReadinessMatrix.test.js` |
| ?? | untracked | `src/tests/releaseScenarios.test.js` |
| ?? | untracked | `src/tests/releaseShipBars.test.js` |
| ?? | untracked | `src/tests/releaseToolBacklog.test.js` |
| ?? | untracked | `src/tests/repoLayout.test.js` |
| ?? | untracked | `src/tests/safetyRules.test.js` |
| ?? | untracked | `src/tests/scopeGuard.test.js` |
| ?? | untracked | `src/tests/setupAssessmentSnapshot.test.js` |
| ?? | untracked | `src/tests/spatialPlan.test.js` |
| ?? | untracked | `src/tests/swarmManifests.test.js` |
| ?? | untracked | `src/tests/uiAcceptanceCriteria.test.js` |
| ?? | untracked | `src/tests/unit/README.md` |
| ?? | untracked | `src/tests/v020Acceptance.test.js` |
| ?? | untracked | `src/tests/visual/README.md` |
| ?? | untracked | `src/ui/ChainGraphView.jsx` |
| ?? | untracked | `src/ui/ConflictFixPanel.jsx` |
| ?? | untracked | `src/ui/EnginePreviewPanel.jsx` |
| ?? | untracked | `src/ui/ProfileRecommendationCard.jsx` |
| ?? | untracked | `src/ui/ReadinessCard.jsx` |
| ?? | untracked | `src/ui/SetupCommandCenter.jsx` |
| ?? | untracked | `src/uiNotePosition.js` |
| ?? | untracked | `src/uiNotePosition.test.js` |
| ?? | untracked | `src/virtualBetaLab.js` |
| ?? | untracked | `src/virtualBetaLab.test.js` |
| ?? | untracked | `src/virtualMachinePlayerLab.js` |
| ?? | untracked | `src/virtualMachinePlayerLab.test.js` |
| ?? | untracked | `src/wavFeatureExtractor.js` |
| ?? | untracked | `src/wavFeatureExtractor.test.js` |

### Swarm / lab manifests

Checked-in persona routes, jobs, repair rules, and lab manifests.

Count: 15

| Status | Kind | Path |
| --- | --- | --- |
| ?? | untracked | `swarm/README.md` |
| ?? | untracked | `swarm/jobs/README.md` |
| ?? | untracked | `swarm/jobs/daily-smoke.job.json` |
| ?? | untracked | `swarm/jobs/nightly-audio-regression.job.json` |
| ?? | untracked | `swarm/jobs/release-candidate.job.json` |
| ?? | untracked | `swarm/repair/README.md` |
| ?? | untracked | `swarm/repair/panda-notes.repair.json` |
| ?? | untracked | `swarm/repair/route-regressions.repair.json` |
| ?? | untracked | `swarm/routes/README.md` |
| ?? | untracked | `swarm/routes/auto-detect.route.json` |
| ?? | untracked | `swarm/routes/report-lab.route.json` |
| ?? | untracked | `swarm/routes/self-test.route.json` |
| ?? | untracked | `swarm/routes/setup-command-center.route.json` |
| ?? | untracked | `tools/ffmpeg/README.md` |
| ?? | untracked | `tools/scripts/README.md` |

## Next Review

- Run `npm.cmd run repo:worktree-audit` after each cleanup pass.
- Before committing a lane, run the smallest relevant test gate plus `git diff --check`.
- Do not use `git reset --hard` or broad checkout commands on this sprint worktree.
