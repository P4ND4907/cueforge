import { expect, test } from '@playwright/test';

const quietSettings = {
  interfaceMode: 'simple',
  quietMode: true,
  backgroundAudio: false,
  cinematicVideoAudio: false,
  uiNotesEnabled: true,
  desktopBridgeHints: true
};

test('first-run onboarding can hand off into the app without surprise audio', async ({ page }) => {
  await seedApp(page, { setupComplete: 'no' });
  await page.goto('/?qa=playwright-onboarding-smoke', { waitUntil: 'networkidle' });

  await expect(page.locator('.setup-journey-shell')).toBeVisible();
  await expect(page.getByText(/Bamboo soundwalk|first run is a guided soundwalk/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Background audio off|Start soundwalk/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Skip for now/i })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'setup journey');

  await page.getByRole('button', { name: /Skip for now/i }).click();
  await expect(page.getByRole('heading', { name: 'Setup Command Center' }).first()).toBeVisible();
  await expect(page.getByText('Audio chain verifier + personal sound engine').first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'post-onboarding command center');
});

test('guided web flow renders, navigates, and avoids runtime/layout failures', async ({ page }, testInfo) => {
  await seedApp(page);
  await mockAudioDevices(page);

  const runtimeFailures = [];
  page.on('pageerror', (error) => runtimeFailures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeFailures.push(`console: ${message.text()}`);
  });

  await page.goto('/?qa=playwright-web-smoke', { waitUntil: 'networkidle' });

  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Setup Command Center' }).first()).toBeVisible();
  await expect(page.getByText('Audio chain verifier + personal sound engine').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Run setup scan/i })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'command center');

  await openSimpleRoute(page, 'detect', 'Auto Detect');
  await expect(page.getByText(/Browser-only partial evidence|Auto Detect v2 Report/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Scan audio devices|Copy v2 report|Export JSON/i }).first()).toBeVisible();
  await expect(page.getByText(/USB Test Mic|USB Test DAC|audio input|audio output/i).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'auto detect');

  await openSimpleRoute(page, 'mic', 'Mic Lab');
  await page.getByLabel('What happened?').fill('USB mic, Discord, teammates say my mic is boomy but game audio is fine.');
  await page.getByRole('button', { name: /Run analysis/i }).click();
  await expect(page.getByText('Voice clarity').first()).toBeVisible();
  await expect(page.getByText(/Discord auto gain|Mic floor|lower gain/i).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'mic lab');

  await openSimpleRoute(page, 'trial', 'Player Trial');
  await expect(page.getByText(/Guided Match Script|Post-match feedback/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Export tester packet/i })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'player trial');

  await openSimpleRoute(page, 'reports', 'Report Lab');
  await expect(page.getByRole('button', { name: /Create redacted report/i })).toBeVisible();
  await page.getByRole('button', { name: /Create redacted report/i }).click();
  await expect(page.getByText(/Report Preview|Redacted Player Report/i).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'report lab');

  await openSimpleRoute(page, 'settings', 'Settings');
  await expect(page.getByText('Quiet mode').first()).toBeVisible();
  await expect(page.getByText('Allow background soundwalk').first()).toBeVisible();
  await expect(page.getByText('Allow cinematic video audio').first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'settings');

  if (runtimeFailures.length) {
    await testInfo.attach('runtime-failures', {
      body: runtimeFailures.join('\n'),
      contentType: 'text/plain'
    });
  }
  expect(runtimeFailures).toEqual([]);
});

async function seedApp(page, { setupComplete = 'yes', settings = quietSettings } = {}) {
  await page.addInitScript(({ nextSettings, nextSetupComplete }) => {
    localStorage.setItem('cueforge-setup-complete', 'yes');
    localStorage.setItem('cueforge-setup-complete', nextSetupComplete);
    localStorage.setItem('cueforge-user-settings', JSON.stringify(nextSettings));
  }, { nextSettings: settings, nextSetupComplete: setupComplete });
}

async function mockAudioDevices(page) {
  await page.addInitScript(() => {
    const devices = [
      { kind: 'audioinput', deviceId: 'mock-input', groupId: 'mock-group', label: 'USB Test Mic' },
      { kind: 'audiooutput', deviceId: 'mock-output', groupId: 'mock-group', label: 'USB Test DAC Headphones' }
    ];
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: async () => devices,
        getUserMedia: async () => {
          throw new DOMException('Mocked mic permission is not granted in CI.', 'NotAllowedError');
        }
      }
    });
  });
}

async function openSimpleRoute(page, id, title) {
  await page.locator(`[data-qa-nav="${id}"]`).click();
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible();
}

async function expectNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0
    );
    return Math.ceil(documentWidth - window.innerWidth);
  });
  expect(overflow, `${label} horizontal overflow`).toBeLessThanOrEqual(2);
}
