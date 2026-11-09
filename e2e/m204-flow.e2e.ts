import { expect, test, type Page } from '@playwright/test';

/**
 * One real user flow: M-204 from alert to saved finding.
 * Logic is tested at unit level. Do not add other end-to-end tests here without asking.
 */

const VIEWPORTS = [
  { name: '380', width: 380, height: 700 },
  { name: '768', width: 768, height: 1024 },
  { name: '1366', width: 1366, height: 768 },
];

async function expectHeading(page: Page, text: string) {
  await expect(page.getByRole('heading', { level: 1, name: text, exact: true })).toBeVisible();
}

/** Fails on horizontal overflow or a primary action outside the viewport, then saves the step. */
async function checkStep(page: Page, viewport: (typeof VIEWPORTS)[number], file: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${file}: horizontal overflow`).toBeLessThanOrEqual(clientWidth);

  const primary = page.locator('[data-primary]');
  await expect(primary).toHaveCount(1);
  const box = await primary.boundingBox();
  expect(box, `${file}: primary action has no box`).not.toBeNull();
  if (box) {
    expect(box.x, `${file}: primary action off the left`).toBeGreaterThanOrEqual(0);
    expect(box.y, `${file}: primary action above the viewport`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${file}: primary action off the right`).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, `${file}: primary action below the viewport`).toBeLessThanOrEqual(viewport.height);
  }

  await page.screenshot({ path: `evidence/${viewport.name}-${file}.png`, animations: 'disabled' });
}

for (const viewport of VIEWPORTS) {
  test(`M-204 flow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/');
    await expectHeading(page, 'Plant floor');
    await checkStep(page, viewport, '01-home');

    await page.getByRole('link', { name: 'Open M-204 alert' }).click();
    await expectHeading(page, 'Motor M-204');
    await checkStep(page, viewport, '02-machine');

    await page.getByRole('link', { name: 'Review evidence' }).click();
    await expectHeading(page, 'Evidence for M-204');
    await checkStep(page, viewport, '03-evidence');

    await page.getByRole('link', { name: 'Continue to inspection plan' }).click();
    await expectHeading(page, 'Review and save inspection plan');
    await checkStep(page, viewport, '04-plan');

    await page.getByRole('button', { name: 'Save inspection plan' }).click();
    await expectHeading(page, 'Record finding');
    await checkStep(page, viewport, '05-finding');

    await page.getByRole('button', { name: 'Bearing wear', exact: true }).click();
    await page.getByRole('button', { name: 'Save finding' }).click();
    await expectHeading(page, 'Bearing wear found. Repair needed.');
    await checkStep(page, viewport, '06-summary');

    await page.reload();
    await expectHeading(page, 'Bearing wear found. Repair needed.');
  });
}
