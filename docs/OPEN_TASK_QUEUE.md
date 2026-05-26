# CueForge Open Task Queue

Last audited: May 22, 2026. Chat sweep included.

This queue is the checkpoint for requests that are not fully done yet. It pulls from the prompt audit, chat sweep, master plan, release checklist, analyzer plan, Discord docs, Reddit/X outreach docs, and current repo status.

The canonical implementation backlog for the current build path lives in `src/data/implementationBacklog.js` and `docs/IMPLEMENTATION_BACKLOG.md`. Use that file for the ordered engineering work; use this queue for broader product, social, and release follow-up.

## Queue Rules

- Keep player privacy first: no hidden uploads, no silent recording, no private account data in GitHub.
- Owned social accounts stay human-approved. No mass posting, repeated filtered Reddit posts, self-bots, or fake reward loops.
- Native desktop actions must be explicit, backed up, and reversible before touching real Windows or Equalizer APO locations.
- Every shipped feature needs at least one proof path: unit test, build, browser smoke, desktop smoke, or manual checklist evidence.

## P0 - Must Clear Before Wider Public Testing

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-001 | Smoke-test packaged Electron portable build | Players who need native scan/setup should use the desktop shell, not a fragile browser workaround | `docs/PROMPT_BACKLOG_AUDIT.md`, `docs/RELEASE_CHECKLIST.md` | Package/run desktop build, run Auto Detect Windows scan, verify APO draft save, record result |
| Q-002 | Run privacy/export audit after setup profile changes | New setup fields and reports must not leak raw device IDs, paths, emails, phone numbers, or private account data | `docs/PROMPT_BACKLOG_AUDIT.md`, `docs/PRIVACY.md` | In-app Privacy Export Audit is live and passed in Self Test; rerun before every release/update post |
| Q-003 | Reconcile Discord live-settings status | Docs disagree: final buildout says roles/read-only/onboarding are done, high-flow playbook still says they need approval | `docs/DISCORD_FINAL_BUILDOUT.md`, `docs/DISCORD_HIGH_FLOW_PLAYBOOK.md` | Recheck live Discord settings, then update both docs to one truth |
| Q-004 | Run full release proof gate | Before inviting more testers, the release checklist should be green end to end | `docs/RELEASE_CHECKLIST.md` | Done for `v0.1.0-alpha.2`; rerun before the next release |
| Q-005 | Verify GitHub Pages public build after docs refresh | The public tester link must match the local build | `docs/MASTER_PLAN.md`, current Pages flow | Verify after the release-link deploy finishes |
| Q-024 | Keep reusable responsive/UI smoke harness current | Chat repeatedly called out resizing, text, overflow, and "bulletproof when building" issues | chat sweep, `tools/Run-PreReleaseQa.mjs`, `qa/playwright/web/command-center-smoke.spec.mjs` | Playwright web smoke is live for desktop and compact Chrome. Keep adding human-found issues as named regression cases before each release |
| Q-025 | Permission-state recovery matrix | Mic permission was blocked in live testing, and browsers cannot auto-grant it | chat sweep | Recovery cards now exist in Setup Journey and Auto Detect; next pass should manually verify allow/block/skip/refresh in Chrome, Edge, and desktop shell |

## P1 - Product Depth

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-006 | High-end analyzer phase 2 | Current analyzer is useful, and the new WAV extractor gives it real file evidence; live capture still needs steadier sampling and reference validation | `docs/HIGH_END_ANALYZER_PLAN.md`, `src/wavFeatureExtractor.js` | Move signal math toward AudioWorklet, add dev-only Meyda comparison, add VAD gating |
| Q-007 | Desktop-only offline clip analysis | Real player evidence needs optional deeper analysis without uploading raw audio | `docs/HIGH_END_ANALYZER_PLAN.md` | Add FFmpeg `astats`/`ebur128`/`silencedetect` path for user-selected local clips |
| Q-008 | Analyzer-to-EQ preview handoff | The analyzer should turn evidence into an explainable preview before changing EQ Studio | `docs/HIGH_END_ANALYZER_PLAN.md` | Add `eqNudge` preview/apply control and test the exported APO text |
| Q-009 | Game-session diagnosis tags | Feedback should separate tuning problems from game mix, server/desync, Discord, Windows routing, and mic gain | `docs/MASTER_PLAN.md`, `docs/HIGH_END_ANALYZER_PLAN.md` | Add tags to Beta Check-in/Report Lab exports and Community Hub summaries |
| Q-010 | Native APO apply/backup/undo design | Direct writes are future work and must be safer than manual paste | `docs/ARCHITECTURE.md`, `docs/DRIVER_LAYER.md` | Design explicit write target picker, backup folder, dry-run diff, undo flow, and warning copy |
| Q-011 | Decide `setupReadiness.js` future | Old setup UI is gone, but readiness scoring may still be valuable as a backend helper | `docs/PROMPT_BACKLOG_AUDIT.md` | Trace current imports/tests, then keep, rename, or retire with tests |
| Q-012 | Performance mode validation during gameplay | Gameplay Save should not hurt RAM or performance while a match is running | user request, `docs/RELEASE_CHECKLIST.md` | Add/verify low-overhead snapshot caps, run browser performance smoke, document expected cost |
| Q-026 | Build Panda Notes developer inbox | Right-click notes exist, but the chat asked for retrievable developer-only tags and note review | chat sweep, `src/uiFeedback.js` | Inbox now supports repair packets, reviewed/fixed/needs-retest state, and fixed-note cleanup; later add sorting/filtering if note volume gets high |
| Q-027 | Build game-audio issue research tracker | User asked to study Tarkov, Siege, COD, Apex, Valorant, CS2 issues from communities and official channels | chat sweep, `docs/MASTER_PLAN.md` | Create a sourced matrix of game audio issues, official notes, player complaints, and how CueForge should diagnose each bucket |
| Q-028 | Harden auto-import setup kit | Chat repeatedly asked for auto-detect/import so testers can copy/paste setup quickly | chat sweep, `docs/REDDIT_PROFILE_AND_OUTREACH.md` | Redacted setup summary, Setup Intelligence, game/budget recommendations, and copy buttons are live in Auto Detect; next pass should add platform-specific copy variants only if testers ask |
| Q-029 | Add optional match clip import path | User asked whether gameplay/audio logs can be analyzed and tweaked after a match | chat sweep, `docs/HIGH_END_ANALYZER_PLAN.md`, `src/wavFeatureExtractor.js` | WAV feature extraction exists; add the user-facing import page and report UI without hidden recording or upload |
| Q-034 | Golden WAV benchmark set | Real WAV extraction needs labeled clips to measure precision, recall, false positives, and latency p95 | `docs/prompts/CODEX_NEXT_STEPS.md`, `src/engine/benchmarkMetrics.js` | Add ignored local clip folder plus committed JSON labels/fixtures and benchmark runner |
| Q-035 | Target-gated release queue | Future updates should unlock after tester targets and proof gates, not random hype | chat sweep, `src/releaseQueue.js`, `docs/BUILD_QOL_AUTOMATION_RELEASE_QUEUE.md` | Keep System Info release queue updated after each proof run and tester milestone |
| Q-036 | Auto-debug from learned patterns | User wants CueForge to learn repeated real-world issues and eventually self-repair safely | chat sweep, `src/issuePatternMemory.js` | Pattern Memory is live; next step is converting automation-ready patterns into reviewed repair tickets, never direct source edits without approval |
| Q-037 | Solo desktop foundation prompts | User wants GitHub/Copilot-ready prompts to build the desktop app foundation well | chat sweep, `.github/copilot-instructions.md`, `docs/prompts/GITHUB_COPILOT_DESKTOP_FOUNDATION.md` | Prompts are staged; next pass should execute Prompt 1 and add a desktop proof runner |
| Q-038 | Refactor monolith toward route modules | Future setup, report, and desktop work gets risky if everything stays in one huge app file | `docs/MASTER_PLAN.md`, `docs/QA_EVIDENCE_PIPELINE.md`, `src/app/routes/*` | Move one page at a time behind existing route wrappers, preserve current behavior, and require browser screenshot proof after each move |
| Q-039 | Formalize manifest and chain graph as source of truth | Detection should be graph/evidence-driven, not scattered product badges or string checks | `docs/QA_EVIDENCE_PIPELINE.md`, `src/core/chainGraph.js`, `src/core/chain/evidenceGraph.ts` | Keep UI, readiness, exports, and native helper code reading the same graph and manifest contracts |
| Q-040 | Expand fixture-driven harness tests | More realism needs repeatable failures before real users find them | `docs/QA_EVIDENCE_PIPELINE.md`, `src/lab/harness/*`, `src/tests/releaseReadinessMatrix.test.js` | Add fixtures for hidden labels, wrong endpoint, chat/game split, stacked processors, hearing inconsistency, and report replay |
| Q-041 | Keep visual and desktop CI release-blocking | The app already had human-found UI and desktop startup issues; CI must keep catching them | `docs/QA_EVIDENCE_PIPELINE.md`, `.github/workflows/release-gate.yml`, `tools/Run-ScreenshotUpdate.mjs` | GitHub CI now runs web build, Playwright web smoke, Windows desktop smoke, redaction, feedback contract, audio fixture regression, optional self-hosted route graph lab, and release readiness. Keep adding human-found failures as named regressions |
| Q-042 | Give Machine Play Lab a real owner command | The architecture is now clear, but it needs one repeatable local command/report instead of scattered proof scripts | `docs/ARCHITECTURE.md`, `docs/QA_EVIDENCE_PIPELINE.md` | Create a `machine-play-lab` runner that executes manifest fixtures, render-path checks, metrics, oracle decisions, redaction, and a markdown report |
| Q-043 | Add WASAPI loopback proof fixture to desktop bridge | Windows-first measurement is the next native proof step before any selective safe write work | `docs/ARCHITECTURE.md`, `docs/QA_EVIDENCE_PIPELINE.md`, `docs/NATIVE_ENGINE_ROADMAP.md` | Add desktop-only loopback capability detection and a no-recording smoke proof that reports availability, permission/blocked state, and endpoint identity through redacted manifest fields |
| Q-044 | Build Audio Metrics Engine contract | Recommendations need proof that changes improve clarity, not just loudness | `docs/QA_EVIDENCE_PIPELINE.md`, `src/engine/audioMetricsEngine.js`, `src/lab/harness/*` | Core contract is live with four buckets, FFmpeg/libebur128 reference plan, JS fallback metrics, before/after deltas, and harness tests. Next step: feed WAV import and native captures into it |
| Q-045 | Build Regression Oracle contract | CueForge needs an automated yes/no gate for whether a profile or fixture change is actually safer/better | `docs/QA_EVIDENCE_PIPELINE.md`, `tools/Run-PreReleaseQa.mjs` | Add oracle rules that fail louder-but-not-clearer changes, unsafe boost/headroom changes, redaction leaks, UI regressions, and desktop startup failures |
| Q-046 | Keep implementation backlog tested and current | The current build plan needs a single validated source of truth instead of scattered chat notes | `src/data/implementationBacklog.js`, `docs/IMPLEMENTATION_BACKLOG.md` | Update the backlog after each proof gate, and keep `src/tests/implementationBacklog.test.js` passing |

## P2 - Brand, Media, And Tester Experience

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-015 | Update screenshots after latest UI/brand changes | Social posts and docs should show the current Panda Lab brand strip and app state | current repo status | Capture fresh progress screenshots and replace stale assets when needed |
| Q-016 | Keep social roadmap posts app-focused | User asked roadmap/news to stay about app development and future ideas | `docs/SOCIAL_POSTING_PLAN.md`, `docs/MASTER_PLAN.md` | Draft Update 002/003 from shipped app changes only, then stage in Community Hub approval queue |
| Q-030 | Keep public copy human-owned after each release | User explicitly wanted no AI-trace language and project-owned wording | chat sweep, README/docs history | Run a plain-language pass on README, app copy, release notes, and social posts before public pushes |

## P3 - Community And Social Rollout

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-017 | Reddit profile-first recovery | A repeated/link-heavy post was filtered; recovery needs safer profile/modmail flow | `docs/REDDIT_PROFILE_AND_OUTREACH.md` | Retry only profile post or modmail/no-link strategy; document visible/blocked result |
| Q-018 | Reddit helpful-comment watch queue | Safer growth comes from useful comments in relevant audio/help threads | `docs/REDDIT_PROFILE_AND_OUTREACH.md` | Search one community at a time, save relevant threads, comment without links unless rules allow |
| Q-019 | X post cadence | X has a staged queue, but posts need rotation and human approval | `docs/X_OUTREACH_QUEUE.md`, `docs/SOCIAL_POSTING_PLAN.md` | Stage one post at a time with 2-4 tags and no generic official-account spam |
| Q-020 | Discord custom Panda Guide bot deployment | Bot strategy exists, but live deployment and permissions need verification | `docs/DISCORD_FINAL_BUILDOUT.md`, `discord-bot/README.md` | Review OAuth permissions, invite bot, test `/start`, `/checkin`, `/bug`, `/roles`, `/rollcall` |
| Q-021 | Discord role/channel audit screenshots | The server should prove read-only pages, onboarding, Chiefyy role, and mod boundaries | `docs/DISCORD_FINAL_BUILDOUT.md` | Capture/update evidence notes without exposing private Discord data |
| Q-022 | Optional trusted music/radio bot review | User wanted a lively server, but music bots need permission and copyright-safe handling | `docs/DISCORD_FINAL_BUILDOUT.md` | Pick one bot only if it solves a real gap; review permissions before invite |
| Q-023 | Public tester intake loop | Growth should feed back into app data, not just raw chatter | `docs/MASTER_PLAN.md` | Keep Discord as hub, stage all public copy in Community Hub, summarize signals weekly |
| Q-031 | Discord Nitro/boost decision | User asked whether Nitro is worth paying for | chat sweep, `docs/DISCORD_RESEARCH_NOTES.md` | Document free vs paid/server-boost benefits, what CueForge actually needs, and a no-purchase default |
| Q-032 | Social account/profile consistency audit | Chat asked to make Reddit, X, Discord, GitHub, and in-app branding feel connected | chat sweep | Verify avatar, banner, bio, links, display names, and current app social strip all match the Panda Lab identity |
| Q-033 | Community posting result ledger | Posts were removed/blocked in places, and future posting needs memory | chat sweep, `docs/REDDIT_PROFILE_AND_OUTREACH.md` | Track each post/modmail/profile update with date, destination, copy variant, result, and next safe action |

## Blocked Or Deliberately Not Queued

| Request Area | Decision | Reason |
| --- | --- | --- |
| Store passwords, DOB, phone numbers, recovery codes, or private account info in GitHub | Not queued | Unsafe and outside CueForge privacy rules |
| Create accounts or use saved passwords automatically | Not queued | Account creation and credential handling must stay user-controlled |
| Auto-grant browser microphone permissions | Not queued | Browser security requires the tester to grant permission; CueForge should guide and recover instead |
| Auto-join or auto-post inside third-party servers/subreddits | Not queued | Platform rules and account trust require user-visible joining and posting choices |
| Mass-post the same promo body into Reddit/X/Discord | Not queued | Spam risk and already caused Reddit filter trouble |
| Self-bots, auto-watchers, fake activity, reward farming | Not queued | Violates platform trust and CueForge community rules |
| Silent driver installs, silent Windows routing changes, hidden APO writes | Not queued | Native changes must be explicit, backed up, and reversible |
| Hidden telemetry or automatic raw audio upload | Not queued | CueForge stays local-first and opt-in |

## Private Local Work

Private concept media and draft-only build files stay out of the public repo until they are intentionally released.
