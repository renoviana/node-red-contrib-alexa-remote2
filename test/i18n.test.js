const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const i18n = require('../lib/i18n.js');

function keys(obj, prefix = '') {
	return Object.entries(obj).flatMap(([k, v]) => v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
}
function placeholders(text) {
	return (String(text).match(/__[a-zA-Z0-9_]+__/g) || []).sort();
}
function get(obj, key) {
	return key.split('.').reduce((o, k) => o && o[k], obj);
}
function assertSameShape(en, pt, label) {
	const enKeys = keys(en).sort();
	assert.deepStrictEqual(keys(pt).sort(), enKeys, `${label}: pt-BR and en-US must have the same keys`);
	for (const key of enKeys) {
		assert.deepStrictEqual(placeholders(get(pt, key)), placeholders(get(en, key)), `${label}: placeholders of "${key}"`);
	}
}

test('runtime catalogs: pt-BR has every en-US message with the same placeholders', () => {
	assertSameShape(i18n.catalogs['en-US'], i18n.catalogs['pt-BR'], 'runtime');
});

test('editor catalogs: pt-BR has every en-US message with the same placeholders', () => {
	const dir = path.join(__dirname, '..', 'nodes', 'locales');
	const files = fs.readdirSync(path.join(dir, 'en-US')).filter(f => f.endsWith('.json'));
	assert.ok(files.length >= 3);
	for (const file of files) {
		const en = JSON.parse(fs.readFileSync(path.join(dir, 'en-US', file), 'utf8'));
		const pt = JSON.parse(fs.readFileSync(path.join(dir, 'pt-BR', file), 'utf8'));
		assertSameShape(en, pt, file);
	}
});

test('every runtime key used in the code exists', () => {
	const roots = ['lib', 'nodes'].map(d => path.join(__dirname, '..', d));
	const used = new Set();
	for (const root of roots) {
		for (const file of fs.readdirSync(root).filter(f => f.endsWith('.js'))) {
			const src = fs.readFileSync(path.join(root, file), 'utf8');
			for (const m of src.matchAll(/(?:i18n\.t\([^,]+,|i18n\.translate\([^,]+,|this\.t\(|\btr\()\s*'([a-zA-Z]+\.[a-zA-Z.]+)'/g)) used.add(m[1]);
		}
	}
	assert.ok(used.size > 30, `found ${used.size} keys`);
	for (const key of used) {
		assert.strictEqual(typeof get(i18n.catalogs['en-US'], key), 'string', `missing key "${key}"`);
	}
});

test('translates with placeholders', () => {
	assert.strictEqual(i18n.translate('pt-BR', 'account.waitProxy', { url: 'http://x:3456/' }), 'abra http://x:3456/ no navegador');
	assert.strictEqual(i18n.translate('en-US', 'status.successful', { ok: 2, total: 3 }), '2/3 successful');
});

test('falls back to English, then to the key', () => {
	assert.strictEqual(i18n.translate('xx', 'status.ready'), 'ready');
	assert.strictEqual(i18n.translate('pt-BR', 'does.not.exist'), 'does.not.exist');
});

test('language of a node comes from its account', () => {
	assert.strictEqual(i18n.t({ account: { language: 'pt-BR' } }, 'status.ready'), 'pronto');
	assert.strictEqual(i18n.t({ language: 'pt-BR' }, 'status.ready'), 'pronto');
	assert.strictEqual(i18n.t({}, 'status.ready'), 'ready');
});

test('resolveLanguage: explicit setting wins, auto uses Node-RED then the environment', () => {
	assert.strictEqual(i18n.resolveLanguage('pt-BR', null, {}), 'pt-BR');
	assert.strictEqual(i18n.resolveLanguage('en-US', { settings: { lang: 'pt-BR' } }, {}), 'en-US');
	assert.strictEqual(i18n.resolveLanguage('auto', { settings: { lang: 'pt' } }, {}), 'pt-BR');
	assert.strictEqual(i18n.resolveLanguage('auto', { settings: {} }, { LANG: 'pt_BR.UTF-8' }), 'pt-BR');
	assert.strictEqual(i18n.resolveLanguage(undefined, { settings: {} }, { LANG: 'de_DE.UTF-8' }), 'en-US');
	assert.strictEqual(i18n.resolveLanguage('auto', null, {}), 'en-US');
});
