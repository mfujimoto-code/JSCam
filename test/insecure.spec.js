'use strict';

const { test, expect } = require('@playwright/test');
const { isFull } = require('./helpers/suite');
const { waitForKick } = require('./helpers/wait-kick');

test.describe('insecure HTTP origin', () => {
	test.skip(!isFull(), 'full auto (http://web) only');

	test('shows camera-help and is not a secure context', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		expect(await page.evaluate('window.isSecureContext')).toBe(false);
		await expect(page.locator('#camera-help')).toBeVisible();
		await expect(page.locator('.io-hud')).not.toHaveClass(/is-live/);
	});
});
