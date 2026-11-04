// Runtime messages (node status, warnings, errors) in the language chosen in the account node.
// Node-RED's own runtime i18n follows the server's LANG variable, which is usually not set in
// containers like the Home Assistant add-on, so the account has an explicit "Messages" setting.

const catalogs = {
	'en-US': require('./locales/en-US.json'),
	'pt-BR': require('./locales/pt-BR.json'),
};
const DEFAULT_LANGUAGE = 'en-US';
const LANGUAGES = Object.keys(catalogs);

function lookup(catalog, key) {
	return key.split('.').reduce((obj, part) => (obj && typeof obj === 'object') ? obj[part] : undefined, catalog);
}

function normalizeLanguage(value) {
	const lang = String(value || '').trim().replace('_', '-').toLowerCase();
	if (!lang) return null;
	if (lang.startsWith('pt')) return 'pt-BR';
	if (lang.startsWith('en')) return 'en-US';
	return null;
}

// setting: 'auto' | 'en-US' | 'pt-BR'; auto uses Node-RED's "lang" setting, then the environment
function resolveLanguage(setting, RED, env = process.env) {
	if (setting && setting !== 'auto' && catalogs[setting]) return setting;
	const candidates = [RED && RED.settings && RED.settings.lang, env.LC_ALL, env.LC_MESSAGES, env.LANG];
	for (const candidate of candidates) {
		const lang = normalizeLanguage(candidate);
		if (lang) return lang;
	}
	return DEFAULT_LANGUAGE;
}

function translate(lang, key, vars = {}) {
	let text = lookup(catalogs[lang] || {}, key);
	if (typeof text !== 'string') text = lookup(catalogs[DEFAULT_LANGUAGE], key);
	if (typeof text !== 'string') return key;
	return text.replace(/__([a-zA-Z0-9_]+)__/g, (match, name) => vars[name] !== undefined ? String(vars[name]) : match);
}

// language of a node: the account's language, or the node's own (account nodes)
function languageOf(node) {
	if (!node) return DEFAULT_LANGUAGE;
	if (typeof node === 'string') return node;
	return node.language || (node.account && node.account.language) || DEFAULT_LANGUAGE;
}

function t(node, key, vars) {
	return translate(languageOf(node), key, vars);
}

module.exports = { t, translate, resolveLanguage, languageOf, LANGUAGES, DEFAULT_LANGUAGE, catalogs };
