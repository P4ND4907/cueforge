# CueForge Build, QOL, Automation, And Release Queue

Last updated: May 22, 2026.

This is the master queue for making CueForge easier to use, easier to test, and harder to break. The rule is simple: build fast, but release only when the tester target and proof gates agree.

## Product Rule

CueForge should feel like a player tool, not a homework assignment.

Every update should do at least one of these:

- Save the tester time.
- Make setup less confusing.
- Turn feedback into something replayable.
- Prove that an audio change helped or did not help.
- Reduce privacy, performance, or driver-risk.
- Make the next community update easier to explain.

## Simplicity Rules

- One obvious next action per page.
- Copy buttons for anything a tester may need to paste into Discord, Reddit, GitHub, or a report.
- No hidden recording, uploads, driver installs, Windows routing changes, or APO writes.
- Advanced data can exist, but the player-facing result should say what to try next.
- If CueForge cannot know something, say so plainly.
- No release note claims unless a proof gate backs them.

## Build/QOL Queue

### First-Run QOL

- Setup summary from browser scan plus optional desktop bridge data. `Live in Alpha 2 hardening.`
- Permission recovery for mic allowed, blocked, skipped, refreshed, and browser-limited states. `Live in Setup Journey and Auto Detect.`
- Gear profile import that names the chain without leaking private IDs.
- Clear rerun setup path from System Info.
- Copy buttons for setup summary, Discord check-in, GitHub issue, and Reddit-safe comment. `Setup summary copy is live; platform-specific variants stay queued.`

### Tester Feedback QOL

- Panda Notes inbox with tag, page, target area, severity, and fixed/needs-retest status. `Live in System Info.`
- Report status labels: `new`, `replayed`, `fixed`, `needs tester retest`, `blocked by permission`, `not app issue`.
- One button to export fix packet and one button to clear verified notes.
- "What changed since last build" inside the app.
- Tester packet preview before export.
- Issue Pattern Memory that groups recurring tester problems into local debug playbooks before auto-debugging is allowed.

### Analyzer QOL

- WAV import page that explains raw audio stays local.
- Analyzer-to-EQ preview with apply/ignore instead of surprise changes.
- Source bucket labels: tuning, game mix, server timing, Discord, Windows routing, mic gain, hardware fit, fatigue.
- Confidence language that stays honest about post-mix inference.
- Golden clip benchmark report so detection quality can be measured.
- Repeated-issue learning across redacted reports, Panda Notes, self-test warnings, check-ins, and community signals.

### Desktop QOL

- Desktop shell packaged and smoke-tested.
- Native bridge scan from inside CueForge.
- Desktop Bridge Fix Path that explains the browser warning and the exact desktop proof path.
- APO draft folder, backup folder, dry-run diff, and undo plan.
- Performance mode with capped saves and low RAM use.
- Clear warning when a native step needs explicit user action.

### Community QOL

- Discord stays the main hub.
- Reddit stays comment-first and no-link unless asked.
- X follows are signal sources, not spam targets.
- Social drafts are generated from actual product progress and watchlist learnings.
- Community memory tracks where conversations happened and what needs a reply.

## Automation Queue

### Now

- Six-hour pre-release note draft before planned public updates. `Active: weekdays at noon for a 6 PM update window. Drafts only; user approval before public posting.`
- Responsive UI smoke script for desktop, tablet, and mobile widths.
- Export/privacy audit for reports, packets, setup summaries, and export packs. `Live in Self Test and System Info; 25 files / 76 tests passed.`
- Issue Pattern Memory for recurring setup, mic, routing, game/session, masking, IEM fatigue, UI, privacy, and performance issues. `Live in System Info; 25 files / 76 tests passed.`
- GitHub Copilot desktop foundation prompts for the solo desktop build path.
- Daily social draft heartbeat tied to actual app progress.
- Community memory updater for saved Reddit/X/Discord threads.
- Release queue inside System Info.

### Next

- Full release proof runner: test, build, audit, smoke, docs check.
- Screenshot freshness check for README, GitHub release, Discord, and social cards.
- Golden WAV benchmark runner with false-positive and latency metrics.
- Desktop package smoke script.
- Weekly signal digest from Discord, Reddit, X, GitHub issues, and tester packets.

### Later

- Discord bot commands for `/start`, `/checkin`, `/bug`, `/roles`, and `/rollcall`.
- Trusted bot permissions audit before any invite.
- GitHub issue template generation from redacted reports.
- Release-note generator from completed proof gates only.
- Watchlist monitor that drafts observations, never posts automatically.

## Target-Gated Release Ladder

### Version Ship Bars

These are the minimum product bars. Tester counts are still useful, but a version label does not ship unless the product proof matches the theme.

| Release | Theme | Minimum ship bar |
| --- | --- | --- |
| v0.2.0 | Foundations | Setup Command Center becomes default, feature modules are extracted, Playwright web + Electron smoke are added, hardware profile manifests are added, and route graph schema is added. |
| v0.3.0 | Proof | WASAPI loopback helper is live, FFmpeg/libebur128 regression job is live, conflict detector is live, latency/phase tests are live, and feedback ingestion is wired. |
| v0.4.0 | Production readiness | Nightly machine lab runs on real Windows hardware, release gating is enforced, swarm manifests are checked in, redaction is audited, and user-facing assessment summaries are trustworthy. |

### 5 Tester Signals - Alpha 2 Hardening

Ship:

- Setup summary.
- Permission recovery.
- Panda Notes inbox.
- Privacy export audit.

Release when:

- 5 real testers can complete setup, one match check-in, and one report without direct help.

### 10 Tester Signals - Alpha 3 Evidence Loop

Ship:

- WAV import UI.
- Analyzer-to-EQ preview.
- Game/session diagnosis tags.
- Cleaner redacted tester packets.

Release when:

- 10 tester packets exist, with at least 3 gear chains and 3 imported/replayed reports.

### 25 Tester Signals - Beta 1 Desktop Proof

Ship:

- Packaged desktop shell proof.
- Native bridge scan inside CueForge.
- Explicit APO draft/backup/undo flow.
- Performance mode validation.

Release when:

- 25 testers, no critical first-run bugs, no known private-data leaks, and desktop bridge proof recorded.

### 50 Tester Signals - Beta 2 Community Loop

Ship:

- Discord bot commands.
- Game-specific testing pages.
- Community signal tracker.
- Weekly tester digest.

Release when:

- 50 testers, 10 replayed reports, and feedback from at least 5 FPS games.

### 100 Tester Signals - Public 1.0 Candidate

Ship:

- Stable privacy policy.
- Known-limits page.
- Polished docs site.
- Release notes from completed gates only.
- Locked desktop/apply decision.

Release when:

- 100 testers or 25 clean end-to-end packets with no critical app, privacy, or first-run failure.

## "Ready Ready" Proof Gate

Before any milestone release:

```text
npm test
npm run build
privacy/export audit
responsive smoke
permission recovery smoke
desktop smoke if native code changed
public copy plain-language pass
GitHub release notes checked
Discord update draft staged
Reddit/X update kept safe and human
```

## What Gets Queued After Each Target

After every tester target:

1. Freeze random new features.
2. Fix the highest-frequency tester pain first.
3. Run the proof gate.
4. Draft a six-hour pre-release note from what is expected to pass.
5. Mark anything that misses the window as next-update priority.
6. Draft the final update from what actually passed.
7. Release only the tested build.
8. Move failed or unfinished ideas to the next milestone.
9. Ask testers to retest the exact fixed flow.

That is the loop: tester signal, fix, proof, update, release, retest.
