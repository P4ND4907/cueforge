# CueForge Open Task Queue

Last audited: May 22, 2026. Chat sweep included.

This queue is the checkpoint for requests that are not fully done yet. It pulls from the prompt audit, chat sweep, master plan, release checklist, analyzer plan, Discord docs, Reddit/X outreach docs, and current repo status.

## Queue Rules

- Keep player privacy first: no hidden uploads, no silent recording, no private account data in GitHub.
- Owned social accounts stay human-approved. No mass posting, repeated filtered Reddit posts, self-bots, or fake reward loops.
- Native desktop actions must be explicit, backed up, and reversible before touching real Windows or Equalizer APO locations.
- Every shipped feature needs at least one proof path: unit test, build, browser smoke, desktop smoke, or manual checklist evidence.

## P0 - Must Clear Before Wider Public Testing

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-001 | Smoke-test packaged Electron portable build | Players who need native scan/setup should use the desktop shell, not a fragile browser workaround | `docs/PROMPT_BACKLOG_AUDIT.md`, `docs/RELEASE_CHECKLIST.md` | Package/run desktop build, run Auto Detect Windows scan, verify APO draft save, record result |
| Q-002 | Run privacy/export audit after setup profile changes | New setup fields and reports must not leak raw device IDs, paths, emails, phone numbers, or private account data | `docs/PROMPT_BACKLOG_AUDIT.md`, `docs/PRIVACY.md` | Export report, beta packet, setup summary, approval queue, and pack; inspect redaction |
| Q-003 | Reconcile Discord live-settings status | Docs disagree: final buildout says roles/read-only/onboarding are done, high-flow playbook still says they need approval | `docs/DISCORD_FINAL_BUILDOUT.md`, `docs/DISCORD_HIGH_FLOW_PLAYBOOK.md` | Recheck live Discord settings, then update both docs to one truth |
| Q-004 | Run full release proof gate | Before inviting more testers, the release checklist should be green end to end | `docs/RELEASE_CHECKLIST.md` | Done for `v0.1.0-alpha.1`; rerun before the next release |
| Q-005 | Verify GitHub Pages public build after docs refresh | The public tester link must match the local build | `docs/MASTER_PLAN.md`, current Pages flow | Verify after the release-link deploy finishes |
| Q-024 | Add reusable responsive/UI smoke harness | Chat repeatedly called out resizing, text, overflow, and "bulletproof when building" issues | chat sweep | Create a Playwright/browser QA script for key pages at desktop/tablet/mobile, checking overflow, console errors, clipped text, and basic interactions |
| Q-025 | Permission-state recovery matrix | Mic permission was blocked in live testing, and browsers cannot auto-grant it | chat sweep | Test allow/block/skip/refresh flows for Setup Journey, Self Test, Auto Detect, Mic Lab, and evidence recording; update recovery copy where needed |

## P1 - Product Depth

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-006 | High-end analyzer phase 2 | Current analyzer is useful, but the serious version needs steadier sampling and reference validation | `docs/HIGH_END_ANALYZER_PLAN.md` | Move signal math toward AudioWorklet, add dev-only Meyda comparison, add VAD gating |
| Q-007 | Desktop-only offline clip analysis | Real player evidence needs optional deeper analysis without uploading raw audio | `docs/HIGH_END_ANALYZER_PLAN.md` | Add FFmpeg `astats`/`ebur128`/`silencedetect` path for user-selected local clips |
| Q-008 | Analyzer-to-EQ preview handoff | The analyzer should turn evidence into an explainable preview before changing EQ Studio | `docs/HIGH_END_ANALYZER_PLAN.md` | Add `eqNudge` preview/apply control and test the exported APO text |
| Q-009 | Game-session diagnosis tags | Feedback should separate tuning problems from game mix, server/desync, Discord, Windows routing, and mic gain | `docs/MASTER_PLAN.md`, `docs/HIGH_END_ANALYZER_PLAN.md` | Add tags to Beta Check-in/Report Lab exports and Community Hub summaries |
| Q-010 | Native APO apply/backup/undo design | Direct writes are future work and must be safer than manual paste | `docs/ARCHITECTURE.md`, `docs/DRIVER_LAYER.md` | Design explicit write target picker, backup folder, dry-run diff, undo flow, and warning copy |
| Q-011 | Decide `setupReadiness.js` future | Old setup UI is gone, but readiness scoring may still be valuable as a backend helper | `docs/PROMPT_BACKLOG_AUDIT.md` | Trace current imports/tests, then keep, rename, or retire with tests |
| Q-012 | Performance mode validation during gameplay | Gameplay Save should not hurt RAM or performance while a match is running | user request, `docs/RELEASE_CHECKLIST.md` | Add/verify low-overhead snapshot caps, run browser performance smoke, document expected cost |
| Q-026 | Build Panda Notes developer inbox | Right-click notes exist, but the chat asked for retrievable developer-only tags and note review | chat sweep, `src/uiFeedback.js` | Add a sortable/filterable notes inbox with tag/page/area filters, export/attach controls, and local-only privacy copy |
| Q-027 | Build game-audio issue research tracker | User asked to study Tarkov, Siege, COD, Apex, Valorant, CS2 issues from communities and official channels | chat sweep, `docs/MASTER_PLAN.md` | Create a sourced matrix of game audio issues, official notes, player complaints, and how CueForge should diagnose each bucket |
| Q-028 | Harden auto-import setup kit | Chat repeatedly asked for auto-detect/import so testers can copy/paste setup quickly | chat sweep, `docs/REDDIT_PROFILE_AND_OUTREACH.md` | Make one clear setup summary from browser scan plus desktop bridge data, with redacted copy buttons for Discord, Reddit, GitHub, and reports |
| Q-029 | Add optional match clip import path | User asked whether gameplay/audio logs can be analyzed and tweaked after a match | chat sweep, `docs/HIGH_END_ANALYZER_PLAN.md` | Let users manually import local clips or exported evidence files for offline analysis without hidden recording or upload |

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
