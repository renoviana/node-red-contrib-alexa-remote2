const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const path = require('node:path');

const account = require('../nodes/alexa-remote-account.js');
const tools = require('../lib/common.js');

const DAY = 24 * 60 * 60 * 1000;

test('refresh interval: normal values', () => {
	assert.strictEqual(account.parseRefreshInterval('3'), 3 * DAY);
	assert.strictEqual(account.parseRefreshInterval(0.5), 0.5 * DAY);
});

test('refresh interval: empty or invalid disables it', () => {
	for (const value of ['', ' ', undefined, null, '0', '-1', 'abc']) {
		assert.ok(Number.isNaN(account.parseRefreshInterval(value)), `value ${JSON.stringify(value)}`);
	}
});

test('refresh interval: long values are capped below the setTimeout limit', () => {
	const warnings = [];
	const ms = account.parseRefreshInterval('30', w => warnings.push(w));
	assert.strictEqual(ms, 14 * DAY);
	assert.ok(ms < 2 ** 31 - 1);
	assert.strictEqual(warnings.length, 1);
});

test('default cookie file lives in the Node-RED user dir', () => {
	const file = account.defaultCookieFile({ settings: { userDir: '/config' } }, 'abc.123/..');
	assert.strictEqual(file, path.join('/config', 'alexa-remote-cookie-abc123.json'));
});

test('portAvailable waits for a port that is being released', async () => {
	const server = net.createServer();
	await new Promise(resolve => server.listen(0, resolve));
	const port = server.address().port;

	await assert.rejects(tools.portAvailable(port), { code: 'EADDRINUSE' });

	setTimeout(() => server.close(), 200);
	await tools.portAvailable(port, 10, 100);
});
