// Safe persistence of the authentication result (cookie file).
// - writes go to a temp file that is renamed over the target, so a crash/power loss
//   mid-write never leaves a truncated file behind
// - the previous good file is kept as "<file>.bak" and used when the main file is unreadable
// - the file holds account tokens, so it is created readable by the owner only

const fs = require('fs');
const path = require('path');

const BACKUP_SUFFIX = '.bak';

function isValidCookieData(data) {
	return data !== null && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
}

function readJson(file) {
	const data = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (!isValidCookieData(data)) throw new Error(`"${file}" does not contain authentication data`);
	return data;
}

// returns { data, source } or { data: undefined } when neither file is usable
function readCookieFile(file, warn = () => { }) {
	const errors = [];
	for (const candidate of [file, file + BACKUP_SUFFIX]) {
		if (!fs.existsSync(candidate)) continue;
		try {
			const data = readJson(candidate);
			if (candidate !== file) warn(`cookie file "${file}" unreadable (${errors.join('; ')}), using backup "${candidate}"`);
			return { data, source: candidate };
		}
		catch (error) {
			errors.push(error.message);
		}
	}
	if (errors.length) warn(`could not read cookie file: ${errors.join('; ')}`);
	return { data: undefined };
}

function writeCookieFile(file, data) {
	if (!isValidCookieData(data)) throw new Error('refusing to save empty authentication data');

	fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });

	const json = JSON.stringify(data);
	const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
	const fd = fs.openSync(tmp, 'w', 0o600);
	try {
		fs.writeSync(fd, json);
		fs.fsyncSync(fd);
	}
	finally {
		fs.closeSync(fd);
	}

	try {
		// keep the last good file as backup (only if it is actually valid)
		if (fs.existsSync(file)) {
			try {
				readJson(file);
				fs.copyFileSync(file, file + BACKUP_SUFFIX);
				fs.chmodSync(file + BACKUP_SUFFIX, 0o600);
			}
			catch (_) { /* current file is broken, do not overwrite the backup with it */ }
		}
		fs.renameSync(tmp, file);
	}
	catch (error) {
		try { fs.unlinkSync(tmp); } catch (_) { }
		throw error;
	}
}

module.exports = { readCookieFile, writeCookieFile, isValidCookieData, BACKUP_SUFFIX };
