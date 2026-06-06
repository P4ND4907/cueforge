# CueForge v0.2.0-alpha.4

Pre-release Windows tester build.

## Highlights

- Auto Setup now centers the product loop around one guided proof path: scan evidence, game settings, Sound Match, safe recommendation, backup/undo, and match feedback.
- Sound Match now separates confidence levels:
  - 5 rounds: draft only
  - 9 rounds: save/export preview evidence
  - 15 rounds plus 4 clean repeat checks: direct apply can unlock
- Public web and desktop links now point at this tagged release instead of older alpha downloads.
- The GitHub Pages bundle was rebuilt from source so social links, release notes, and desktop alpha links match the current app.

## Safety Boundary

- Local-first behavior stays intact.
- No fake buttons.
- No hidden native routing.
- No silent driver changes.
- No unsafe preset behavior.
- Desktop alpha remains unsigned and should be described as a tester build.

## Windows Asset

- File: `CueForge-0.2.0-alpha.4-x64.exe`
- SHA256: `BB85C0A451DF9022FD7B1908DAA9A4D721B0F6E407641199535951D213DF97EB`

## Verified

- `npm test`
- `npm run validate:fixtures`
- `npm run validate:manifest`
- `npm run test:harness`
- `npm run test:ui`
- `npm run export:redaction-check`
- `npm run build`
- `npm run desktop:package`
