'use strict';

const { defineConfig, devices } = require('@playwright/test');

const disableShm = ['--disable-dev-shm-usage'];
const fakeCamera = [
	'--disable-dev-shm-usage',
	'--use-fake-ui-for-media-stream',
	'--use-fake-device-for-media-stream',
];

module.exports = defineConfig({
	testDir: '.',
	testMatch: '*.spec.js',
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: [
		['list'],
		['html', { open: 'never', outputFolder: 'playwright-report' }],
	],
	timeout: 30000,
	use: {
		...devices['Desktop Chrome'],
		ignoreHTTPSErrors: true,
	},
	projects: [
		{
			name: 'http',
			testIgnore: 'camera-secure.spec.js',
			use: {
				baseURL: process.env.BASE_URL || 'http://web:8081',
				launchOptions: { args: disableShm },
			},
		},
		{
			name: 'https',
			testMatch: 'camera-secure.spec.js',
			use: {
				baseURL: process.env.CAMERA_URL || 'https://web:8443',
				permissions: ['camera'],
				launchOptions: { args: fakeCamera },
			},
		},
	],
});
