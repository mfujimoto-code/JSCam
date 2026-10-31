'use strict';

const { test, expect } = require('@playwright/test');
const { waitForKick } = require('./helpers/wait-kick');

test.describe('UI mode and flip', () => {
	test('A14 image-mode select and Flip checkbox', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);

		const mode = page.locator('#image-mode');
		await expect(mode).toContainText('GRAY');
		await mode.selectOption('GRAY');
		await expect(mode).toHaveValue('GRAY');

		const flip = page.locator('#flip-horizontal');
		await expect(flip).not.toBeChecked();
		await flip.check();
		await expect(flip).toBeChecked();
	});
});
