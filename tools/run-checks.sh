#!/usr/bin/env sh
set -eu

npm ci
npm test
npm run build
npm run validate:manifest
npm run validate:fixtures
npm run validate:swarm
npm run test:harness
npm run test:ui
npm run test:playwright:web
npm audit --audit-level=moderate
npm run export:redaction-check
npm run qa:audio-fixture-regression
npm run qa:feedback-contract
npm run qa:release-readiness
npm run screenshots:update -- --if-needed
npm run qa:preflight
