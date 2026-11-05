'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');

test.describe('live boot', () => {
	test('loads scripts and kicks jsCam', async ({ page }) => {
		const failed = [];
		page.on('requestfailed', (req) => {
			failed.push(`${req.url()} ${req.failure() && req.failure().errorText}`);
		});
		page.on('pageerror', (err) => {
			failed.push(String(err));
		});

		const res = await page.goto('/');
		expect(res && res.ok()).toBeTruthy();

		await waitForKick(page);

		const live = await jscamEval(page, `(() => ({
			version: jsCam.version,
			hasImage: !!(jsCam.image && jsCam.image.convert),
			hasFrame: typeof jsCam.Frame === 'function',
			hasRender: !!(jsCam.render && jsCam.render.buildImage),
			hasSurface: typeof jsCam.Surface === 'function',
			hasDispatch: typeof jsCam.dispatch === 'function',
			rVFC: typeof document.getElementById('video').requestVideoFrameCallback,
			modes: jsCam.render.mode(),
		}))()`);

		expect(live.version).toMatch(/^\d{4}\.\d{2}\.\d{2}-/);
		expect(live.hasImage).toBe(true);
		expect(live.hasFrame).toBe(true);
		expect(live.hasRender).toBe(true);
		expect(live.hasSurface).toBe(true);
		expect(live.hasDispatch).toBe(true);
		expect(live.rVFC).toBe('function');
		expect(live.modes.length).toBeGreaterThan(0);
		expect(live.modes).toContain('NightVision');

		const selected = await page.locator('#image-mode').inputValue();
		expect(selected.length).toBeGreaterThan(0);

		const jsFailed = failed.filter((s) => /\.js(\s|$)/.test(s) || /failed to load/.test(s));
		expect(jsFailed, jsFailed.join('\n')).toEqual([]);
	});
});
