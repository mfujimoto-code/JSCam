'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');
const { PIXEL_SRC } = require('./helpers/pixel-src');

test.describe('Frame', () => {
	test('A6 innerNum, get(argb), histogram keys', async ({ page }) => {
		await page.goto('/');
		await waitForKick(page);
		const got = await jscamEval(page, `(() => { ${PIXEL_SRC}
			const im = solid(4, 4, 10, 20, 30, 255);
			const frame = new jsCam.Frame(im, 1);
			const argb = frame.get('argb');
			frame.get('gray');
			return {
				shape: frame.shape(),
				num: frame.num(),
				inner: frame.innerNum(),
				word: argb[0] >>> 0,
				len: argb.length,
				histKeys: frame.histogram().sort(),
			};
		})()`);
		expect(got.shape).toEqual([4, 4, 1]);
		expect(got.num).toBe(16);
		expect(got.inner).toBe(4);
		expect(got.len).toBe(16);
		expect(got.word).toBe(0xff0a141e);
		expect(got.histKeys).toEqual(['gray']);
	});
});
