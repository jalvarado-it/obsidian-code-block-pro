#!/usr/bin/env node
/**
 * Install the built plugin into an Obsidian vault for local testing.
 *
 * Usage:
 *   npm run install:vault
 *   npm run install:vault -- /path/to/vault
 *   npm run install:vault -- /path/to/vault --copy
 *   OBSIDIAN_VAULT=/path/to/vault npm run install:vault
 *
 * Files are symlinked by default so rebuilds from `npm run dev` are picked up
 * without reinstalling. Pass --copy to write regular files instead.
 */
import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['main.js', 'manifest.json', 'styles.css'];
const KNOWN_FLAGS = new Set(['--copy', '--help', '-h']);
// Obsidian plugin ids are lowercase alphanumeric with dashes. Rejecting anything
// else keeps the id safe to use as a single path segment.
const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function printUsage() {
	console.log(`Install the built plugin into an Obsidian vault.

Usage:
  npm run install:vault
  npm run install:vault -- /path/to/vault
  npm run install:vault -- /path/to/vault --copy
  OBSIDIAN_VAULT=/path/to/vault npm run install:vault

Options:
  --copy   Copy the files instead of symlinking them.
  --help   Show this message.`);
}

function fail(message) {
	console.error(`\n\u2717 ${message}\n`);
	process.exit(1);
}

function expandTilde(input) {
	return input.replace(/^~(?=$|[/\\])/, process.env.HOME ?? '~');
}

/** True if the path exists, including as a (possibly broken) symlink. */
function pathExists(path) {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
}

async function resolveVault() {
	const args = process.argv.slice(2);

	if (args.includes('--help') || args.includes('-h')) {
		printUsage();
		process.exit(0);
	}

	const unknown = args.find((arg) => arg.startsWith('-') && !KNOWN_FLAGS.has(arg));
	if (unknown) {
		fail(`Unknown option: ${unknown}`);
	}

	const vaultArg = args.find((arg) => !arg.startsWith('-'));
	const vault = vaultArg ?? process.env.OBSIDIAN_VAULT;

	if (vault) {
		return vault;
	}

	if (!process.stdin.isTTY) {
		fail(
			'No vault provided.\n' +
				'  Usage: npm run install:vault -- /path/to/vault\n' +
				'  Or set the OBSIDIAN_VAULT environment variable.',
		);
	}

	const readline = createInterface({ input: process.stdin, output: process.stdout });

	let answer;
	try {
		answer = (await readline.question('Vault path: ')).trim();
	} catch {
		readline.close();
		console.error('\n\u2717 Installation cancelled.\n');
		process.exit(1);
	}

	readline.close();

	if (!answer) {
		fail('No vault provided.');
	}

	return answer;
}

function installFile(source, target, copy) {
	if (pathExists(target)) {
		// lstatSync does not follow symlinks, so a link to a directory is
		// replaced rather than treated as a real directory.
		if (lstatSync(target).isDirectory()) {
			fail(`"${target}" is a directory; remove it manually and try again.`);
		}
		rmSync(target, { force: true });
	}

	if (copy) {
		copyFileSync(source, target);
		return;
	}

	try {
		symlinkSync(source, target);
	} catch (error) {
		if (process.platform === 'win32') {
			copyFileSync(source, target);
			console.warn(`\u26a0 Could not symlink "${target}"; copied instead.`);
			return;
		}
		fail(`Could not link "${target}": ${error.message}\n  Re-run with --copy.`);
	}
}

const vaultInput = await resolveVault();
const vaultPath = resolve(expandTilde(vaultInput));
const copy = process.argv.includes('--copy');

if (!existsSync(join(vaultPath, '.obsidian'))) {
	fail(`Not an Obsidian vault (no ".obsidian" folder): ${vaultPath}`);
}

for (const file of FILES) {
	if (!existsSync(join(ROOT, file))) {
		fail(`Missing "${file}". Run "npm run build" first.`);
	}
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
if (typeof manifest.id !== 'string' || !PLUGIN_ID_PATTERN.test(manifest.id)) {
	fail(`Refusing to install unsafe plugin id: ${JSON.stringify(manifest.id)}`);
}

const destDir = join(vaultPath, '.obsidian', 'plugins', manifest.id);
mkdirSync(destDir, { recursive: true });

for (const file of FILES) {
	installFile(join(ROOT, file), join(destDir, file), copy);
}

console.log(`\u2713 ${copy ? 'Copied' : 'Linked'} ${manifest.id} v${manifest.version} to:\n  ${destDir}`);
if (!copy) {
	console.log('  Rebuilds from "npm run dev" are picked up automatically.');
}
console.log('  Reload Obsidian, then enable the plugin under Settings \u2192 Community plugins.');
