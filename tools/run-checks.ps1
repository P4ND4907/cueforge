$ErrorActionPreference = "Stop"

npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run validate:manifest
npm.cmd run validate:fixtures
npm.cmd run validate:swarm
npm.cmd run test:harness
npm.cmd run test:ui
npm.cmd run test:playwright:web
npm.cmd run desktop:dir
npm.cmd run test:desktop-smoke
npm.cmd audit --audit-level=moderate
npm.cmd run export:redaction-check
npm.cmd run qa:audio-fixture-regression
npm.cmd run qa:feedback-contract
npm.cmd run qa:release-readiness
npm.cmd run screenshots:update -- --if-needed
npm.cmd run qa:preflight
