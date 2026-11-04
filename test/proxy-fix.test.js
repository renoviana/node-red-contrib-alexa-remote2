const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { stripHeadersOnRequest, parseProxyLoginUrl, applyProxyFix } = require('../lib/proxy-fix.js');

function listen(handler) {
	return new Promise(resolve => {
		const server = http.createServer(handler);
		server.prependListener('request', stripHeadersOnRequest);
		server.listen(0, '127.0.0.1', () => resolve(server));
	});
}

function get(server) {
	return new Promise((resolve, reject) => {
		http.get(`http://127.0.0.1:${server.address().port}/`, res => {
			res.resume();
			res.on('end', () => resolve(res));
		}).on('error', reject);
	});
}

test('strips CSP and HSTS set with setHeader', async () => {
	const server = await listen((req, res) => {
		res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
		res.setHeader('content-security-policy-report-only', "default-src 'self'");
		res.setHeader('Strict-Transport-Security', 'max-age=1');
		res.setHeader('X-Keep', 'yes');
		res.end('ok');
	});
	try {
		const res = await get(server);
		assert.strictEqual(res.headers['content-security-policy'], undefined);
		assert.strictEqual(res.headers['content-security-policy-report-only'], undefined);
		assert.strictEqual(res.headers['strict-transport-security'], undefined);
		assert.strictEqual(res.headers['x-keep'], 'yes');
	}
	finally {
		server.close();
	}
});

test('strips CSP and HSTS passed to writeHead', async () => {
	const server = await listen((req, res) => {
		res.writeHead(200, 'OK', {
			'Content-Security-Policy': 'upgrade-insecure-requests',
			'Strict-Transport-Security': 'max-age=1',
			'X-Keep': 'yes',
		});
		res.end('ok');
	});
	try {
		const res = await get(server);
		assert.strictEqual(res.headers['content-security-policy'], undefined);
		assert.strictEqual(res.headers['strict-transport-security'], undefined);
		assert.strictEqual(res.headers['x-keep'], 'yes');
	}
	finally {
		server.close();
	}
});

test('patches the installed alexa-cookie2 proxy', () => {
	assert.strictEqual(applyProxyFix(), true);
	// applying twice must not wrap twice
	assert.strictEqual(applyProxyFix(), true);
});

test('parses the login url of alexa-cookie2 >= 5', () => {
	const message = 'Please open http://192.168.0.190:3456/ with your browser and login to Amazon. The cookie will be output here after successfull login.';
	assert.strictEqual(parseProxyLoginUrl(message), 'http://192.168.0.190:3456/');
});

test('parses the login url of alexa-cookie2 < 5', () => {
	const message = 'Login unsuccessfull. You can try to get the cookie manually by opening http://localhost:3456/ with your browser.';
	assert.strictEqual(parseProxyLoginUrl(message), 'http://localhost:3456/');
});

test('returns null for real errors', () => {
	assert.strictEqual(parseProxyLoginUrl('Login unsuccessfull. Please check credentials.'), null);
	assert.strictEqual(parseProxyLoginUrl(undefined), null);
});
