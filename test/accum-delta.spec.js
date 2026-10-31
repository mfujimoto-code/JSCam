'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');
const { PIXEL_SRC } = require('./helpers/pixel-src');

test.describe('Accum and delta', () => {
	test('A9 size change uses factor 1 and *-a is an outer copy', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		const got = await jscamEval(page, `(() => { ${PIXEL_SRC}
			const acc = new jsCam.Accum(false, true);
			acc.set('factor', 0.5);
			const a = new jsCam.Frame(solid(2, 2, 200, 0, 0, 255), 0);
			acc.update(a, 'gray');
			const first = acc.planes('gray')[0][0];
			const published = a.get('gray-a')[0];
			published[0] = 0;
			const innerAfterMut = acc.planes('gray')[0][0];
			const b = new jsCam.Frame(solid(3, 3, 0, 200, 0, 255), 0);
			acc.update(b, 'gray');
			const afterSize = [];
			for (let i = 0; i < 9; ++i) afterSize.push(acc.planes('gray')[0][i]);
			return { first, innerAfterMut, afterSize0: afterSize[0], len: afterSize.length };
		})()`);
		expect(got.first).toBeCloseTo(200 * 0.299, 5);
		expect(got.innerAfterMut).toBeCloseTo(got.first, 5);
		expect(got.len).toBe(9);
		expect(got.afterSize0).toBeCloseTo(200 * 0.587, 5);
	});

	test('A10 delta.get converts the current frame from argb', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		const got = await jscamEval(page, `(() => { ${PIXEL_SRC}
			const f1 = new jsCam.Frame(solid(2, 2, 10, 20, 30, 255), 0);
			const d1 = jsCam.delta.get(f1, 'gray');
			const first = [];
			for (let i = 0; i < 4; ++i) first.push(d1[i]);
			const f2 = new jsCam.Frame(solid(2, 2, 255, 0, 0, 255), 0);
			const d2 = jsCam.delta.get(f2, 'gray');
			const second = [];
			for (let i = 0; i < 4; ++i) second.push(d2[i]);
			return { first, second };
		})()`);
		expect(got.first.every((v) => v === 0)).toBe(true);
		expect(got.second[0]).toBeGreaterThan(0);
	});
});
