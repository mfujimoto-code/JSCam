'use strict';

const { expect } = require('@playwright/test');

const waitForKick = (page) =>
	expect(page.locator('#app-version')).not.toHaveText('', { timeout: 15000 });

module.exports = { waitForKick };
