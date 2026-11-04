// Amazon's new login pages (e.g. /ax/claim) send "Content-Security-Policy: upgrade-insecure-requests"
// and HSTS headers. alexa-cookie2's login proxy forwards them unchanged, so the browser rewrites every
// http://<proxyOwnIp>:<proxyPort>/... URL on the page to https:// and the plain-http proxy fails with
// SSL_ERROR_RX_RECORD_TOO_LONG right after the email step.
// We strip those headers, but only on responses served by the login proxy's own HTTP server.

const path = require('path');

const BLOCKED_HEADERS = new Set([
	'content-security-policy',
	'content-security-policy-report-only',
	'strict-transport-security',
]);

function filterHeaderObject(headers) {
	if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return headers;
	const filtered = {};
	for (const [name, value] of Object.entries(headers)) {
		if (!BLOCKED_HEADERS.has(name.toLowerCase())) filtered[name] = value;
	}
	return filtered;
}

function stripHeadersOnRequest(req, res) {
	const setHeader = res.setHeader;
	res.setHeader = function (name, value) {
		if (typeof name === 'string' && BLOCKED_HEADERS.has(name.toLowerCase())) return this;
		return setHeader.call(this, name, value);
	};

	const writeHead = res.writeHead;
	res.writeHead = function (statusCode, ...args) {
		for (const name of BLOCKED_HEADERS) this.removeHeader(name);
		// writeHead(statusCode[, statusMessage][, headers])
		const last = args.length - 1;
		if (last >= 0) args[last] = filterHeaderObject(args[last]);
		return writeHead.call(this, statusCode, ...args);
	};
}

function resolveProxyModule() {
	// alexa-cookie2 may be hoisted or nested below alexa-remote2
	const remoteDir = path.dirname(require.resolve('alexa-remote2'));
	return require.resolve('alexa-cookie2/lib/proxy.js', { paths: [remoteDir, __dirname] });
}

function applyProxyFix(logWarn = () => { }) {
	let amazonProxy;
	try {
		amazonProxy = require(resolveProxyModule());
	}
	catch (error) {
		logWarn(`login proxy fix not applied: ${error.message}`);
		return false;
	}

	if (!amazonProxy || typeof amazonProxy.initAmazonProxy !== 'function') {
		logWarn('login proxy fix not applied: alexa-cookie2 proxy has an unexpected shape');
		return false;
	}
	if (amazonProxy.initAmazonProxy.__alexaRemote2HeaderFix) return true;

	const original = amazonProxy.initAmazonProxy;
	const patched = function (options, callbackCookie, callbackListening) {
		return original.call(this, options, callbackCookie, function (server) {
			if (server && typeof server.prependListener === 'function') {
				server.prependListener('request', stripHeadersOnRequest);
			}
			return callbackListening && callbackListening.apply(this, arguments);
		});
	};
	patched.__alexaRemote2HeaderFix = true;
	amazonProxy.initAmazonProxy = patched;
	return true;
}

// The proxy reports its URL through an error message (it is not an actual error):
// alexa-cookie2 < 5:  "... You can try to get the cookie manually by opening http://ip:port/ with your browser."
// alexa-cookie2 >= 5: "... Please open http://ip:port/ with your browser and login to Amazon. ..."
function parseProxyLoginUrl(message) {
	const match = /open(?:ing)? (https?:\/\/\S+?) with your browser/.exec(String(message || ''));
	return match ? match[1] : null;
}

module.exports = { applyProxyFix, stripHeadersOnRequest, parseProxyLoginUrl, BLOCKED_HEADERS };
