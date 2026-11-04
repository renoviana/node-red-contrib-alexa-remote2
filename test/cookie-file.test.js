const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readCookieFile, writeCookieFile } = require('../lib/cookie-file.js');

function tempFile() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alexa-cookie-test-'));
	return path.join(dir, 'sub', 'cookie.json');
}

test('writes and reads back, creating the directory', () => {
	const file = tempFile();
	writeCookieFile(file, { loginCookie: 'a', tokenDate: 1 });
	assert.deepStrictEqual(readCookieFile(file).data, { loginCookie: 'a', tokenDate: 1 });
	assert.deepStrictEqual(fs.readdirSync(path.dirname(file)), ['cookie.json'], 'no temp files left behind');
});

test('keeps the previous file as backup', () => {
	const file = tempFile();
	writeCookieFile(file, { loginCookie: 'old' });
	writeCookieFile(file, { loginCookie: 'new' });
	assert.deepStrictEqual(JSON.parse(fs.readFileSync(file + '.bak', 'utf8')), { loginCookie: 'old' });
	assert.deepStrictEqual(readCookieFile(file).data, { loginCookie: 'new' });
});

test('falls back to the backup when the main file is corrupted', () => {
	const file = tempFile();
	writeCookieFile(file, { loginCookie: 'old' });
	writeCookieFile(file, { loginCookie: 'new' });
	fs.writeFileSync(file, '{"loginCo'); // truncated write

	const warnings = [];
	const result = readCookieFile(file, w => warnings.push(w));
	assert.deepStrictEqual(result.data, { loginCookie: 'old' });
	assert.strictEqual(result.source, file + '.bak');
	assert.strictEqual(warnings.length, 1);
});

test('a corrupted main file does not overwrite a good backup', () => {
	const file = tempFile();
	writeCookieFile(file, { loginCookie: 'good' });
	writeCookieFile(file, { loginCookie: 'good2' });
	fs.writeFileSync(file, 'garbage');
	writeCookieFile(file, { loginCookie: 'fresh' });
	assert.deepStrictEqual(JSON.parse(fs.readFileSync(file + '.bak', 'utf8')), { loginCookie: 'good' });
});

test('missing file returns no data without warnings', () => {
	const warnings = [];
	assert.strictEqual(readCookieFile(tempFile(), w => warnings.push(w)).data, undefined);
	assert.deepStrictEqual(warnings, []);
});

test('refuses to save empty data', () => {
	const file = tempFile();
	assert.throws(() => writeCookieFile(file, undefined));
	assert.throws(() => writeCookieFile(file, {}));
	assert.strictEqual(fs.existsSync(file), false);
});
