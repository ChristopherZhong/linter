import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/Linter.ai/);
});

test('switching tabs', async ({ page }) => {
  const compareTab = page.locator('.tab', { hasText: 'Compare' });
  await compareTab.click();
  await expect(page.locator('diff-component')).toBeVisible();

  const lintTab = page.locator('.tab', { hasText: 'Lint' });
  await lintTab.click();
  await expect(page.locator('editor-component')).toBeVisible();
});

test('editor visibility', async ({ page }) => {
  const editor = page.locator('editor-component');
  await expect(editor).toBeVisible();
});

test('formatting functionality', async ({ page }) => {
  const formatBtn = page.getByRole('button', { name: 'Format' });
  await expect(formatBtn).toBeVisible();
  await formatBtn.click();
});

test('persistence', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('linter-content', '{"persisted": true}'));
  await page.reload();
  await expect(page.locator('editor-component')).toBeVisible();
});

test('editor scrolls when content exceeds screen height', async ({ page }) => {
  // Generate large JSON content (100 lines)
  const largeJson = JSON.stringify(
    Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })),
    null,
    2
  );

  await page.evaluate((json) => {
    localStorage.setItem('linter-content', json);
  }, largeJson);

  await page.reload();

  const metrics = await page.evaluate(() => {
    const editorComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('editor-component');
    const cmScroller = editorComp?.shadowRoot?.querySelector('.cm-scroller');
    const cmEditor = editorComp?.shadowRoot?.querySelector('.cm-editor');
    const app = document.querySelector('linter-app');
    return {
      appHeight: app?.clientHeight,
      editorCompHeight: editorComp?.clientHeight,
      cmEditorHeight: cmEditor?.clientHeight,
      scrollerHeight: cmScroller?.clientHeight,
      scrollerScrollHeight: cmScroller?.scrollHeight
    };
  });

  console.log('metrics:', metrics);

  expect(metrics.scrollerScrollHeight).toBeGreaterThan(metrics.scrollerHeight || 0);
});

test('diff component scrolls when content exceeds screen height', async ({ page }) => {
  const largeJson = JSON.stringify(
    Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })),
    null,
    2
  );

  await page.evaluate((json) => {
    localStorage.setItem('linter-content', json);
  }, largeJson);

  await page.reload();

  const compareTab = page.locator('.tab', { hasText: 'Compare' });
  await compareTab.click();

  const isScrollable = await page.evaluate(() => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    const cmScroller = diffComp?.shadowRoot?.querySelector('.cm-scroller');
    if (!cmScroller) return false;
    return cmScroller.scrollHeight > cmScroller.clientHeight;
  });

  expect(isScrollable).toBe(true);
});

test('theme toggle', async ({ page }) => {
  const themeToggle = page.locator('.theme-toggle');
  await expect(themeToggle).toBeVisible();

  const lightBtn = page.getByRole('radio', { name: 'Light Theme' });
  const darkBtn = page.getByRole('radio', { name: 'Dark Theme' });
  const systemBtn = page.getByRole('radio', { name: 'System Theme' });

  // Click Light
  await lightBtn.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  // Click Dark
  await darkBtn.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Click System
  await systemBtn.click();
  // Resolved theme for system might be light or dark, but data-theme attribute should reflect it.
  const theme = await page.locator('html').getAttribute('data-theme');
  expect(['light', 'dark']).toContain(theme);

  // Check persistence
  await darkBtn.click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
