'use strict';

const { test, expect } = require('@playwright/test');
const { isFull } = require('./helpers/suite');
const { waitForKick } = require('./helpers/wait-kick');

test.describe('nginx delivery', () => {
	test.skip(!isFull(), 'full auto (image COPY) only');

	test('healthz and live assets are 200', async ({ page, request, baseURL }) => {
		const health = await request.get('/healthz');
		expect(health.status()).toBe(200);
		expect((await health.text()).trim()).toBe('ok');

		const res = await page.goto('/');
		expect(res && res.ok()).toBeTruthy();
		const headers = res.headers();
		expect(headers['cache-control']).toMatch(/no-store/);
		expect(headers['permissions-policy']).toMatch(/camera/);

		await waitForKick(page);

		const srcs = await page.$$eval('script[src], link[rel="stylesheet"]', (els) =>
			els.map((el) => el.getAttribute('href') || el.getAttribute('src'))
		);
		expect(srcs.length).toBeGreaterThan(0);
		for (let i = 0; i < srcs.length; ++i) {
			const url = new URL(srcs[i], baseURL).href;
			const asset = await request.get(url);
			expect(asset.status(), url).toBe(200);
		}
	});
});
