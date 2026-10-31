'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');

test.describe('Surface halo', () => {
	test('extract(border=1) replicates a 1px rim', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);

		const got = await jscamEval(page, `(() => {
			const s = new jsCam.Surface(null, [8, 8], true);
			s.gFillStyle('rgb(10,20,30)');
			s.gFillRect(0, 0, 8, 8);
			const im = s.extract(1, null, null, 1)[0];
			const at = (x, y) => {
				const i = (y * im.width + x) * 4;
				return [im.data[i], im.data[i+1], im.data[i+2], im.data[i+3]];
			};
			return {
				w: im.width,
				h: im.height,
				inner: at(4, 4),
				halo: at(0, 0),
			};
		})()`);

		expect(got.w).toBe(10);
		expect(got.h).toBe(10);
		expect(got.inner).toEqual([10, 20, 30, 255]);
		expect(got.halo).toEqual([10, 20, 30, 255]);
	});
});
