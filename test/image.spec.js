'use strict';

const { test, expect } = require('@playwright/test');
const { jscamEval } = require('./helpers/jscam-eval');
const { waitForKick } = require('./helpers/wait-kick');
const { PIXEL_SRC } = require('./helpers/pixel-src');

const evalAfterKick = async (page, body) => {
	await page.goto('/');
	await waitForKick(page);
	return jscamEval(page, `(() => { ${PIXEL_SRC} ${body} })()`);
};

test.describe('image.convert / stat / kernels', () => {
	test('A3 rgba to argb is 0xAARRGGBB per pixel', async ({ page }) => {
		const got = await evalAfterKick(page, `
			const rgba = new Uint8ClampedArray([1, 2, 3, 255, 10, 20, 30, 128]);
			const argb = new Uint32Array(2);
			jsCam.image.convert(['rgba', rgba], ['argb', argb]);
			return [argb[0] >>> 0, argb[1] >>> 0];
		`);
		expect(got).toEqual([0xff010203, 0x800a141e]);
	});

	test('A4 gray yuv r g b from argb and rgba from planes', async ({ page }) => {
		const got = await evalAfterKick(page, `
			const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
			const argb = new Uint32Array(1);
			jsCam.image.convert(['rgba', rgba], ['argb', argb]);
			const y = new Uint8ClampedArray(1);
			const r = new Uint8ClampedArray(1);
			const g = new Uint8ClampedArray(1);
			const b = new Uint8ClampedArray(1);
			const yuv = [new Uint8ClampedArray(1), new Float32Array(1), new Float32Array(1)];
			jsCam.image.convert(['argb', argb], ['gray', y]);
			jsCam.image.convert(['argb', argb], ['r', r]);
			jsCam.image.convert(['argb', argb], ['g', g]);
			jsCam.image.convert(['argb', argb], ['b', b]);
			jsCam.image.convert(['argb', argb], ['yuv', yuv]);
			const back = new Uint8ClampedArray(4);
			jsCam.image.convert(['gray', y], ['rgba', back]);
			const fromRgb = new Uint8ClampedArray(4);
			jsCam.image.convert(['rgb', [
				new Uint8ClampedArray([9]),
				new Uint8ClampedArray([8]),
				new Uint8ClampedArray([7]),
			]], ['rgba', fromRgb]);
			return {
				y: y[0], r: r[0], g: g[0], b: b[0],
				Y: yuv[0][0], U: yuv[1][0], V: yuv[2][0],
				back: [back[0], back[1], back[2], back[3]],
				fromRgb: [fromRgb[0], fromRgb[1], fromRgb[2], fromRgb[3]],
			};
		`);
		expect(got.r).toBe(255);
		expect(got.g).toBe(0);
		expect(got.b).toBe(0);
		expect(got.y).toBe(got.Y);
		expect(got.y).toBe(76);
		expect(got.U).toBeCloseTo(-0.169 * 255, 0);
		expect(got.V).toBeCloseTo(0.5 * 255, 0);
		expect(got.back).toEqual([76, 76, 76, 255]);
		expect(got.fromRgb).toEqual([9, 8, 7, 255]);
	});

	test('A5 stat with shape bins inner only using width as stride', async ({ page }) => {
		const got = await evalAfterKick(page, `
			const src = new Uint8ClampedArray(16);
			src.fill(1);
			src[5] = 50; src[6] = 60;
			src[9] = 70; src[10] = 80;
			const h = new Uint32Array(256);
			const lum = [0];
			jsCam.image.stat([h], lum, [src], [4, 4, 1]);
			let sum = 0;
			for (let i = 0; i < 256; ++i) sum += h[i];
			return { sum, h50: h[50], h60: h[60], h70: h[70], h80: h[80], h1: h[1], lum: lum[0] };
		`);
		expect(got.sum).toBe(4);
		expect(got.h50).toBe(1);
		expect(got.h60).toBe(1);
		expect(got.h70).toBe(1);
		expect(got.h80).toBe(1);
		expect(got.h1).toBe(0);
		expect(got.lum).toBe(50 + 60 + 70 + 80);
	});

	test('A7 equalize.lut uses innerNum as Nl', async ({ page }) => {
		const got = await evalAfterKick(page, `
			const im = solid(4, 4, 0, 0, 0, 255);
			const d = im.data;
			for (let y = 1; y < 3; ++y) {
				for (let x = 1; x < 3; ++x) {
					const i = (y * 4 + x) * 4;
					d[i] = d[i+1] = d[i+2] = 128;
				}
			}
			const frame = new jsCam.Frame(im, 1);
			frame.get('gray');
			const hist = frame.histogram('gray');
			const ident = new Uint8ClampedArray(256);
			const stretched = new Uint8ClampedArray(256);
			jsCam.image.equalize.lut(ident, hist, frame.innerNum());
			jsCam.image.equalize.lut(stretched, hist, frame.num());
			return { inner: frame.innerNum(), ident128: ident[128], stretched128: stretched[128] };
		`);
		expect(got.inner).toBe(4);
		expect(got.ident128).toBe(128);
		expect(got.stretched128).not.toBe(128);
	});

	test('A8 sobel and laplacian use 3x3 neighborhood with stride', async ({ page }) => {
		const got = await evalAfterKick(page, `
			const stride = 5;
			const src = new Uint8ClampedArray(25);
			for (let y = 0; y < 5; ++y) {
				for (let x = 0; x < 5; ++x)
					src[y * 5 + x] = x >= 2 ? 255 : 0;
			}
			const sob = new Uint8ClampedArray(25);
			const lap = new Uint8ClampedArray(25);
			jsCam.image.sobel(sob, src, stride);
			jsCam.image.laplacian(lap, src, stride);
			const flat = new Uint8ClampedArray(25);
			flat.fill(40);
			const lapFlat = new Uint8ClampedArray(25);
			lapFlat.fill(9);
			jsCam.image.laplacian(lapFlat, flat, stride);
			return { corner: sob[0], center: sob[12], lapFlat: lapFlat[12], lapCorner: lap[0] };
		`);
		expect(got.corner).toBe(0);
		expect(got.center).toBe(255);
		expect(got.lapFlat).toBe(0);
		expect(got.lapCorner).toBe(0);
	});

	test('A13 unknown convert throws', async ({ page }) => {
		const got = await evalAfterKick(page, `
			try {
				jsCam.image.convert(['nope', new Uint8Array(1)], ['rgba', new Uint8Array(4)]);
				return { threw: false };
			} catch (e) {
				return { threw: true, msg: String(e.message || e) };
			}
		`);
		expect(got.threw).toBe(true);
		expect(got.msg).toMatch(/not supported/);
	});
});
