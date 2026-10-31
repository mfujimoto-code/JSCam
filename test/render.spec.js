'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');
const { PIXEL_SRC } = require('./helpers/pixel-src');

const run = async (page, body) => {
	await page.goto('/');
	await waitForKick(page);
	return jscamEval(page, `(() => { ${PIXEL_SRC} ${body} })()`);
};

test.describe('render and Night Vision', () => {
	test('A11 buildImage Raw and GRAY', async ({ page }) => {
		const got = await run(page, `
			const im = solid(2, 2, 4, 5, 6, 255);
			const frame = new jsCam.Frame(im, 0);
			const finish = (name) => {
				jsCam.render.mode(name);
				jsCam.render.setupMode();
				const st = { frame: frame, stage: 0 };
				for (let i = 0; i < 8 && !st.image; ++i)
					jsCam.render.buildImage(st);
				const d = st.image && st.image.data;
				return d ? [d[0], d[1], d[2], d[3]] : null;
			};
			return { raw: finish('Raw(RGBA-byte)'), gray: finish('GRAY') };
		`);
		expect(got.raw).toEqual([4, 5, 6, 255]);
		expect(got.gray[0]).toBe(got.gray[1]);
		expect(got.gray[1]).toBe(got.gray[2]);
		expect(got.gray[3]).toBe(255);
		expect(got.gray[0]).toBeGreaterThan(0);
	});

	test('A12 Night Vision LUT uses innerNum', async ({ page }) => {
		const got = await run(page, `
			const im = solid(4, 4, 0, 0, 0, 255);
			const d = im.data;
			for (let y = 1; y < 3; ++y) {
				for (let x = 1; x < 3; ++x) {
					const i = (y * 4 + x) * 4;
					d[i] = d[i+1] = d[i+2] = 128;
				}
			}
			const frame = new jsCam.Frame(im, 1);
			const acc = new jsCam.Accum(false, true);
			acc.update(frame, 'yuv');
			const hist = frame.histogram('y-a');
			const ident = new Uint8ClampedArray(256);
			const wrong = new Uint8ClampedArray(256);
			jsCam.image.equalize.lut(ident, hist, frame.innerNum());
			jsCam.image.equalize.lut(wrong, hist, frame.num());
			jsCam.render.mode('Night Vision');
			jsCam.render.setupMode();
			const st = { frame: frame, stage: 0 };
			for (let i = 0; i < 8 && !st.image; ++i)
				jsCam.render.buildImage(st);
			return {
				inner: frame.innerNum(),
				ident128: ident[128],
				wrong128: wrong[128],
				hasImage: !!(st.image && st.image.data),
			};
		`);
		expect(got.inner).toBe(4);
		expect(got.ident128).toBe(128);
		expect(got.wrong128).not.toBe(128);
		expect(got.hasImage).toBe(true);
	});
});
