'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');
const { PIXEL_SRC } = require('./helpers/pixel-src');

const carry = `const carryAttach = (from, to) => {
	const a = from.attachment();
	jsCam.hash.keys(a).forEach((k) => to.attach(k, a[k]));
};`;

test.describe('Frame accum and delta', () => {
	test('A9 gray-a outer copy, size retarget, rgb/yuv atype', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		const got = await jscamEval(page, `(() => { ${PIXEL_SRC} ${carry}
			const a = new jsCam.Frame(solid(2, 2, 200, 0, 0, 255), 0);
			a.attach('afactor', 0.5);
			const published = a.get('gray-a');
			const first = published[0];
			published[0] = 0;
			const innerAfterMut = a.attachment().abuf[0];
			const b = new jsCam.Frame(solid(3, 3, 0, 200, 0, 255), 0);
			carryAttach(a, b);
			b.attach('afactor', 0.5);
			const after = b.get('gray-a');
			const c = new jsCam.Frame(solid(2, 2, 255, 0, 0, 255), 0);
			c.attach('afactor', 1);
			c.get('rgb-a');
			const rgbType = c.attachment().atype;
			c.get('yuv-a');
			const yuvType = c.attachment().atype;
			const y = c.get('yuv-a')[0][0];
			return {
				first,
				innerAfterMut,
				afterSize0: after[0],
				len: after.length,
				rgbType,
				yuvType,
				y,
			};
		})()`);
		expect(got.first).toBeCloseTo(200 * 0.299, 5);
		expect(got.innerAfterMut).toBeCloseTo(got.first, 5);
		expect(got.len).toBe(9);
		expect(got.afterSize0).toBeCloseTo(200 * 0.587, 5);
		expect(got.rgbType).toBe('rgb');
		expect(got.yuvType).toBe('yuv');
		expect(got.y).toBeCloseTo(255 * 0.299, 5);
	});

	test('A10 gray-d mixes the previous vis then diffs', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		const got = await jscamEval(page, `(() => { ${PIXEL_SRC} ${carry}
			const f1 = new jsCam.Frame(solid(2, 2, 10, 20, 30, 255), 0);
			f1.attach('afactor', 0.5);
			const d1 = f1.get('gray-d');
			const first = [];
			for (let i = 0; i < 4; ++i) first.push(d1[i]);
			const f2 = new jsCam.Frame(solid(2, 2, 255, 0, 0, 255), 0);
			carryAttach(f1, f2);
			f2.attach('afactor', 0.5);
			const d2 = f2.get('gray-d');
			const second = [];
			for (let i = 0; i < 4; ++i) second.push(d2[i]);
			return { first, second };
		})()`);
		expect(got.first.every((v) => v === 0)).toBe(true);
		expect(got.second[0]).toBeGreaterThan(0);
	});
});
