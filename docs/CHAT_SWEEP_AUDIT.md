# CueForge Chat Sweep Audit

Date: May 22, 2026.

This audit captures requests that appeared in chat but were easy to miss if we only read repo docs and logs.

## Newly Queued From Chat

These were added to `docs/OPEN_TASK_QUEUE.md` during the chat sweep:

| Queue ID | Chat Request Area | Queue Outcome |
| --- | --- | --- |
| Q-024 | "Check UI auto resizing issues" and make building bulletproof | Reusable responsive/UI smoke harness |
| Q-025 | Mic permission blocked, "always grant permissions" | Permission-state recovery matrix, with browser boundaries kept clear |
| Q-026 | Right-click notes with retrievable tags only devs can see | Panda Notes developer inbox |
| Q-027 | Research FPS game audio problems from communities and official channels | Game-audio issue research tracker |
| Q-028 | Auto-detect/import setup so testers can copy/paste quickly | Hardened setup import/share kit |
| Q-029 | Analyze match/audio evidence after gameplay | Optional local clip import path |
| Q-030 | Remove AI-sounding copy and keep the project voice human | Human-owned public copy pass |
| Q-031 | "Do we pay for Nitro?" | Nitro/server boost decision note |
| Q-032 | Align Reddit, X, Discord, GitHub, and app profile visuals | Social account/profile consistency audit |
| Q-033 | Some posts were removed and need safer tracking | Community posting result ledger |

## Already Covered Before This Sweep

- Live mic feedback and headphone/IEM tests.
- Auto Detect, setup import, and Windows bridge scanner.
- Self Test and optional Setup Journey.
- Personal Hearing Model, Auto Calibration, Blind Match, Masking Lab, Audio DNA, Player Trial, Gameplay Save, Report Lab, Community Hub, and Panda Notes.
- Local opt-in audio evidence recording without hidden uploads.
- Desktop shell direction for native scan/APO draft support.
- Discord planning, roles, onboarding, bot strategy, and safe outreach docs.
- Reddit-safe recovery plan after filtered posts.
- X tag/mention strategy.
- Panda Lab social identity in the app logo area.

## Not Queued On Purpose

- Storing passwords, DOB, phone numbers, recovery codes, or private account information in GitHub.
- Auto-creating accounts or silently using saved passwords.
- Auto-granting browser microphone permissions.
- Silent driver installs, silent Windows routing changes, or hidden Equalizer APO writes.
- Auto-joining communities, self-bots, auto-watchers, fake rewards, or spam posting.
- Hidden telemetry or raw audio upload.

## Follow-Up Rule

When a new chat request sounds like "make it bulletproof," "go back through everything," or "do not skip anything," add it to `docs/OPEN_TASK_QUEUE.md` unless it is already covered, impossible in the browser, or blocked by privacy/platform rules.
