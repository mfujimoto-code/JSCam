'use strict';

const { test, expect } = require('@playwright/test');
const { waitForKick } = require('./helpers/wait-kick');

test.describe('secure fake camera', () => {
	test('attaches a stream and switches HUD to live', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		expect(await page.evaluate('window.isSecureContext')).toBe(true);
		await expect(page.locator('.io-hud')).toHaveClass(/is-live/, {
			timeout: 20000,
		});
		await expect(page.locator('#camera-overlay')).toHaveClass(/is-live/);
		const hasStream = await page.evaluate(
			'!!document.getElementById("video").srcObject'
		);
		expect(hasStream).toBe(true);
	});
});
