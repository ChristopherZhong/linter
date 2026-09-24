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

test('diff component scroll is synchronized between side A and side B', async ({ page }) => {
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

  // Scroll side A
  await page.evaluate(() => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    const scrollers = diffComp?.shadowRoot?.querySelectorAll('.cm-scroller');
    if (scrollers && scrollers.length >= 2) {
      scrollers[0].scrollTop = 300;
      scrollers[0].dispatchEvent(new Event('scroll'));
    }
  });

  // Wait briefly for scroll sync event handler
  await page.waitForTimeout(100);

  const scrollTopB = await page.evaluate(() => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    const scrollers = diffComp?.shadowRoot?.querySelectorAll('.cm-scroller');
    return scrollers && scrollers.length >= 2 ? scrollers[1].scrollTop : 0;
  });

  expect(scrollTopB).toBeCloseTo(300, -1);

  // Scroll side B
  await page.evaluate(() => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    const scrollers = diffComp?.shadowRoot?.querySelectorAll('.cm-scroller');
    if (scrollers && scrollers.length >= 2) {
      scrollers[1].scrollTop = 150;
      scrollers[1].dispatchEvent(new Event('scroll'));
    }
  });

  await page.waitForTimeout(100);

  const scrollTopA = await page.evaluate(() => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    const scrollers = diffComp?.shadowRoot?.querySelectorAll('.cm-scroller');
    return scrollers && scrollers.length >= 2 ? scrollers[0].scrollTop : 0;
  });

  expect(scrollTopA).toBeCloseTo(150, -1);
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

test('editing text in left view of compare window updates state and persists', async ({ page }) => {
  const compareTab = page.locator('.tab', { hasText: 'Compare' });
  await compareTab.click();

  // Focus and type text into left editor (side A)
  await page.evaluate(() => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    const scrollers = diffComp?.shadowRoot?.querySelectorAll('.cm-content');
    if (scrollers && scrollers.length >= 1) {
      (scrollers[0] as HTMLElement).focus();
    }
  });

  const editedText = '{"inserted": "left-side-test"}';
  await page.evaluate((text) => {
    const diffComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('diff-component');
    // Access CodeMirror view directly or dispatch doc change
    const mergeView = (diffComp as any)?.mergeView;
    if (mergeView?.a) {
      mergeView.a.dispatch({
        changes: { from: 0, to: mergeView.a.state.doc.length, insert: text }
      });
    }
  }, editedText);

  // Check localStorage was updated
  const stored = await page.evaluate(() => localStorage.getItem('linter-content'));
  expect(stored).toBe(editedText);

  // Switch back to Lint tab and verify editor content matches
  const lintTab = page.locator('.tab', { hasText: 'Lint' });
  await lintTab.click();

  const editorText = await page.evaluate(() => {
    const editorComp = document.querySelector('linter-app')?.shadowRoot?.querySelector('editor-component');
    const editorView = (editorComp as any)?.view;
    return editorView?.state.doc.toString();
  });

  expect(editorText).toBe(editedText);
});
