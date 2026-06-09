# CueForge v0.2.0-alpha.5

Pre-release Windows tester build focused on safer Auto Setup decisions and native spatial compatibility.

## Highlights

- Auto Setup now treats setup as one guided loop: scan evidence, game audio settings, Sound Match, safe recommendation, backup/undo, and match feedback.
- Added a native spatial compatibility gate for Windows APO/OEM spatial stacks, game HRTF, Windows spatial, headset spatial, and virtual mixer paths.
- Added Audioscenic/OEM spatial detection targets so CueForge can warn about platform-level spatial layers before recommending EQ or spatial changes.
- Sound Match keeps a 9-round preview checkpoint and requires the stronger 15-round adjustment path plus clean repeat checks before direct apply can unlock.
- Public web and desktop links now point at this tagged release instead of older alpha downloads.
- The GitHub Pages bundle was rebuilt from source so social links, release notes, and desktop alpha links match the current app.

## Safety Boundary

- Local-first behavior stays intact.
- No fake buttons.
- No hidden native routing.
- No silent driver changes.
- No unsafe preset behavior.
- No raw audio storage.
- Desktop alpha remains unsigned and should be described as a tester build.

## Windows Asset

- File: `CueForge-0.2.0-alpha.5-x64.exe`
- SHA256: `E1D2C7D2B5CF0B3F95C5EB59132CDDF56F7F8981EC50E8CFE1FF9F42F366962A`

## Verified

- `npm test`
- `npm run validate:fixtures`
- `npm run validate:manifest`
- `npm run test:harness`
- `npm run test:ui`
- `npm run export:redaction-check`
- `npm run build`
- `npm run test:playwright:web`
- `npm run desktop:package`
