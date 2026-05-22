# CueForge Open Task Queue

Last audited: May 22, 2026.

This queue is the checkpoint for requests that are not fully done yet. It pulls from the prompt audit, master plan, release checklist, analyzer plan, Discord docs, Reddit/X outreach docs, and current repo status.

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
| Q-004 | Run full release proof gate | Before inviting more testers, the release checklist should be green end to end | `docs/RELEASE_CHECKLIST.md` | Run `npm test`, `npm run build`, `npm audit --audit-level=moderate`, desktop smoke, manual browser smoke |
| Q-005 | Verify GitHub Pages public build after docs refresh | The public tester link must match the local build | `docs/MASTER_PLAN.md`, current Pages flow | Open public Pages URL, check brand strip, setup handoff, Mic Lab, Report Lab, Auto Detect |

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

## P2 - Brand, Media, And Tester Experience

| ID | Task | Why It Matters | Source | Next Action |
| --- | --- | --- | --- | --- |
| Q-013 | Photoreal panda bamboo pond cinematic | The director script exists, but the premium video asset is not wired in yet | `docs/PROMPT_BACKLOG_AUDIT.md`, `video-build/README.md` | Generate/render `webm`/`mp4`, add reduced-motion fallback, browser-test desktop/mobile |
| Q-014 | Setup Journey visual polish pass after video | The 3D fallback works, but final media should still feel smooth, readable, and fast | `video-build/README.md`, browser QA notes | Test video load, motion opt-out, text contrast, audio start gesture, mobile layout |
| Q-015 | Update screenshots after latest UI/brand changes | Social posts and docs should show the current Panda Lab brand strip and app state | current repo status | Capture fresh progress screenshots and replace stale assets when needed |
| Q-016 | Keep social roadmap posts app-focused | User asked roadmap/news to stay about app development and future ideas | `docs/SOCIAL_POSTING_PLAN.md`, `docs/MASTER_PLAN.md` | Draft Update 002/003 from shipped app changes only, then stage in Community Hub approval queue |

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

## Blocked Or Deliberately Not Queued

| Request Area | Decision | Reason |
| --- | --- | --- |
| Store passwords, DOB, phone numbers, recovery codes, or private account info in GitHub | Not queued | Unsafe and outside CueForge privacy rules |
| Create accounts or use saved passwords automatically | Not queued | Account creation and credential handling must stay user-controlled |
| Mass-post the same promo body into Reddit/X/Discord | Not queued | Spam risk and already caused Reddit filter trouble |
| Self-bots, auto-watchers, fake activity, reward farming | Not queued | Violates platform trust and CueForge community rules |
| Silent driver installs, silent Windows routing changes, hidden APO writes | Not queued | Native changes must be explicit, backed up, and reversible |
| Hidden telemetry or automatic raw audio upload | Not queued | CueForge stays local-first and opt-in |

## Current Loose Files To Review

These are currently untracked and should be decided separately:

```text
video-qa-current-desktop.png
video-qa-current-mobile.png
```

Do not delete them without checking whether they are useful evidence for Q-013 or Q-014.
