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

/** Every evidence section open and the panel scrolled to its end: the action must stay in view. */
async function checkActionBarStaysInView(page: Page, viewport: (typeof VIEWPORTS)[number]) {
  await page.evaluate(() => {
    document.querySelectorAll('.panel-body details').forEach((item) => item.setAttribute('open', ''));
    const scroller = document.querySelector('.panel-scroll') as HTMLElement;
    scroller.scrollTop = scroller.scrollHeight;
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(page.locator('.panel-body details:not([open])')).toHaveCount(0);

  const bar = await page.locator('.action-bar').boundingBox();
  const button = await page.locator('[data-primary]').boundingBox();
  expect(bar, 'action bar has no box').not.toBeNull();
  expect(button, 'primary action has no box').not.toBeNull();
  if (bar && button) {
    expect(bar.y, 'action bar above the viewport').toBeGreaterThanOrEqual(0);
    expect(bar.y + bar.height, 'action bar below the viewport').toBeLessThanOrEqual(viewport.height);
    expect(button.height, 'primary action height').toBeGreaterThanOrEqual(48);
    const contentEnd = await page.evaluate(() => (document.querySelector('.panel-content') as HTMLElement).getBoundingClientRect().bottom);
    expect(contentEnd, 'action bar covers the end of the content').toBeLessThanOrEqual(bar.y + 1);
  }
  await page.screenshot({ path: `evidence/${viewport.name}-02b-expanded.png`, animations: 'disabled' });

  await page.evaluate(() => {
    document.querySelectorAll('.panel-body details').forEach((item) => item.removeAttribute('open'));
    (document.querySelector('.panel-scroll') as HTMLElement).scrollTop = 0;
    window.scrollTo(0, 0);
  });
}

for (const viewport of VIEWPORTS) {
  test(`M-204 alert workspace at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Held open so the loading state can be measured, then failed so no real model is called.
    let releaseSummary = () => {};
    const summaryHeld = new Promise<void>((resolve) => { releaseSummary = resolve; });
    await page.route('**/api/summary', async (route) => {
      await summaryHeld;
      await route.abort();
    });

    await page.goto('/');
    await expectHeading(page, '3 active alerts');
    await checkStage(page, viewport, '01-home');

    await page.getByRole('link', { name: 'Open M-204 alert' }).click();
    await expectHeading(page, 'M-204 abnormal vibration');
    await expect(page.getByRole('tab', { name: 'Investigate' })).toHaveAttribute('aria-selected', 'true');
    const summary = page.locator('.summary');
    await expect(summary).toHaveAttribute('aria-busy', 'true');
    const loading = await summary.boundingBox();
    releaseSummary();
    await expect(page.locator('.summary-label')).toHaveText('Prepared summary, AI unavailable');
    expect((await summary.boundingBox())?.height, 'summary height jumped').toBe(loading?.height);
    await checkStage(page, viewport, '02-investigate');
    await checkActionBarStaysInView(page, viewport);

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
    await expect(page.locator('.action-next')).toHaveText('Next: repair needed');
    await checkStage(page, viewport, '05-saved');

    await page.reload();
    await expectHeading(page, 'Bearing wear found. Repair needed.');
  });
}
