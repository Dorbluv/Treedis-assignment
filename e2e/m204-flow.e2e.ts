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

/** Fails on horizontal overflow or a primary action outside the viewport, then saves the stage. */
async function checkStage(page: Page, viewport: (typeof VIEWPORTS)[number], file: string) {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(size.scrollWidth, `${file}: horizontal overflow`).toBeLessThanOrEqual(size.clientWidth);
  if (viewport.width >= 1024) {
    expect(size.scrollHeight, `${file}: page scrolls on desktop`).toBeLessThanOrEqual(size.clientHeight);
  }

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
  test(`M-204 alert workspace at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/');
    await expectHeading(page, '3 active alerts');
    await checkStage(page, viewport, '01-home');

    await page.getByRole('link', { name: 'Open M-204 alert' }).click();
    await expectHeading(page, 'M-204 abnormal vibration');
    await expect(page.getByRole('tab', { name: 'Investigate' })).toHaveAttribute('aria-selected', 'true');
    await checkStage(page, viewport, '02-investigate');

    await page.getByRole('button', { name: 'Start inspection plan' }).click();
    await expect(page.getByRole('tab', { name: 'Inspection plan' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Inspection steps (5)')).toBeVisible();
    await checkStage(page, viewport, '03-plan');

    await page.getByRole('button', { name: 'Save inspection plan' }).click();
    await expect(page.getByRole('tab', { name: 'Finding' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Bearing wear', exact: true }).click();
    await checkStage(page, viewport, '04-finding');

    await page.getByRole('button', { name: 'Save finding' }).click();
    await expectHeading(page, 'Bearing wear found. Repair needed.');
    await expect(page.getByText('Readings stay high until repaired.')).toBeVisible();
    await checkStage(page, viewport, '05-saved');

    await page.reload();
    await expectHeading(page, 'Bearing wear found. Repair needed.');
  });
}
