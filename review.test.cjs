// Optional review tool; the app itself has no package dependencies.
const { chromium } = require('./.review-tools/node_modules/playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = async (name, fn) => {
    try { await fn(); console.log(`PASS: ${name}`); }
    catch (error) { failures.push(name); console.log(`FAIL: ${name}: ${error.message}`); }
  };
  const count = () => page.locator('.task').count();
  const add = async (title, notes = '', priority = 'Medium') => {
    await page.locator('#title').fill(title);
    await page.locator('#notes').fill(notes);
    await page.locator('#priority').selectOption(priority);
    await page.locator('#save-button').click();
  };
  try {
    await page.goto(pathToFileURL(path.resolve('index.html')).href);
    await check('Add and view task with multiline notes and High priority', async () => {
      await add('Review assignment', 'First line\nSecond line', 'High');
      assert.equal(await count(), 1);
      assert.equal(await page.locator('.task h3').innerText(), 'Review assignment');
      assert.equal(await page.locator('.task-notes').innerText(), 'First line\nSecond line');
      assert.equal(await page.locator('.badge').innerText(), 'High priority');
    });
    await check('Edit name, notes, and priority without duplicating task', async () => {
      await page.getByRole('button', { name: 'Edit Review assignment', exact: true }).click();
      await add('Updated assignment', 'Updated note', 'Low');
      assert.equal(await count(), 1);
      assert.equal(await page.locator('.task h3').innerText(), 'Updated assignment');
      assert.equal(await page.locator('.task-notes').innerText(), 'Updated note');
      assert.equal(await page.locator('.badge').innerText(), 'Low priority');
    });
    await check('Complete task and filter completed/active tasks', async () => {
      await page.locator('.task input').check();
      assert.equal(await page.locator('.task.completed').count(), 1);
      await page.getByRole('button', { name: 'Active', exact: true }).click();
      assert.equal(await count(), 0);
      await page.getByRole('button', { name: 'Completed', exact: true }).click();
      assert.equal(await count(), 1);
    });
    await check('Refresh retains task, notes, priority, and completion', async () => {
      await page.reload();
      assert.equal(await count(), 1);
      assert.equal(await page.locator('.task input').isChecked(), true);
      assert.equal(await page.locator('.task h3').innerText(), 'Updated assignment');
      assert.equal(await page.locator('.task-notes').innerText(), 'Updated note');
      assert.equal(await page.locator('.badge').innerText(), 'Low priority');
    });
    await check('Mark completed task active again', async () => {
      await page.locator('.task input').uncheck();
      assert.equal(await page.locator('.task.completed').count(), 0);
    });
    await check('Cancel edit leaves task unchanged', async () => {
      await page.getByRole('button', { name: 'Edit Updated assignment', exact: true }).click();
      await page.locator('#title').fill('Do not save');
      await page.locator('#cancel-edit').click();
      assert.equal(await page.locator('.task h3').innerText(), 'Updated assignment');
    });
    await check('Blank and whitespace-only names are rejected', async () => {
      await add('');
      assert.equal(await count(), 1);
      await add('   ');
      assert.equal(await count(), 1);
    });
    await check('Editing after a rejected blank name can still save', async () => {
      await page.getByRole('button', { name: 'Edit Updated assignment', exact: true }).click();
      await page.locator('#notes').fill('Notes-only edit after validation');
      await page.locator('#save-button').click();
      assert.equal(await page.locator('.task-notes').innerText(), 'Notes-only edit after validation');
    });
    // Restore the form so a failed edge-case check cannot affect later checks.
    await page.reload();
    await check('Cancel clears a blank-name error before another edit', async () => {
      await page.getByRole('button', { name: 'Edit Updated assignment', exact: true }).click();
      await page.locator('#title').fill('   ');
      await page.locator('#save-button').click();
      await page.locator('#cancel-edit').click();
      assert.equal(await page.locator('#title').evaluate(input => input.validity.customError), false);
      await page.getByRole('button', { name: 'Edit Updated assignment', exact: true }).click();
      await page.locator('#notes').fill('Saved after cancel');
      await page.locator('#save-button').click();
      assert.equal(await page.locator('.task-notes').innerText(), 'Saved after cancel');
    });
    await check('Optional notes, Medium priority, and literal HTML text', async () => {
      await add('<b>Plain text task</b>');
      assert.equal(await count(), 2);
      assert.equal(await page.locator('.task').first().locator('h3').innerText(), '<b>Plain text task</b>');
      assert.equal(await page.locator('.task h3 b').count(), 0);
      assert.equal(await page.locator('.task').first().locator('.badge').innerText(), 'Medium priority');
      assert.equal(await page.locator('.task').first().locator('.task-notes').isVisible(), false);
    });
    await check('Cancel deletion preserves task; confirm removes it permanently', async () => {
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('.delete').first().click();
      assert.equal(await count(), 2);
      page.once('dialog', dialog => dialog.accept());
      await page.locator('.delete').first().click();
      assert.equal(await count(), 1);
      await page.reload();
      assert.equal(await count(), 1);
    });
    await add('Long task ' + 'x'.repeat(145), 'y'.repeat(500), 'High');
    for (const width of [320, 375, 390, 760, 768, 820, 1024, 1440]) {
      await check(`Responsive layout at ${width}px with long text`, async () => {
        await page.setViewportSize({ width, height: 900 });
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          contentWidth: document.documentElement.scrollWidth,
          form: document.querySelector('.composer').getBoundingClientRect().toJSON(),
          tasks: document.querySelector('.task-section').getBoundingClientRect().toJSON(),
        }));
        assert.ok(layout.contentWidth <= width, `Page overflows: ${layout.contentWidth}px > ${width}px`);
        if (width <= 760) assert.ok(layout.tasks.top >= layout.form.bottom, 'Phone sections should stack');
        else assert.ok(layout.tasks.left >= layout.form.right, 'Desktop sections should sit side by side');
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await check('Add, edit, complete, and delete at phone width', async () => {
      const before = await count();
      await add('Phone test', 'Phone note', 'Low');
      assert.equal(await count(), before + 1);
      await page.getByRole('button', { name: 'Edit Phone test', exact: true }).click();
      await add('Phone updated', 'Edited on phone', 'High');
      const phoneTask = page.locator('.task').filter({ hasText: 'Phone updated' });
      assert.equal(await phoneTask.locator('.task-notes').innerText(), 'Edited on phone');
      await phoneTask.locator('input').check();
      assert.equal(await page.locator('.task.completed').count(), 1);
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Delete Phone updated', exact: true }).click();
      assert.equal(await count(), before);
    });
    await page.screenshot({ path: '.review-tools/phone.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: '.review-tools/desktop.png', fullPage: true });
    await check('No browser JavaScript errors', async () => assert.deepEqual(errors, []));
    console.log(`\n${failures.length} failed checks.`);
    process.exitCode = failures.length ? 1 : 0;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
