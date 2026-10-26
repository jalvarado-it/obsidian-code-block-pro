#!/usr/bin/env node
/**
 * Write a SHA256SUMS file for the release artifacts.
 *
 * The format matches `sha256sum` / `shasum -a 256`: `<hex>  <filename>`, so it
 * can be verified with `sha256sum -c SHA256SUMS` (Linux) or
 * `shasum -a 256 -c SHA256SUMS` (macOS).
 *
 * Run after `npm run build`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [
	'main.js',
	'manifest.json',
	'styles.css',
	'sbom.cdx.json',
	'sbom.runtime.cdx.json',
	'sbom.spdx.json',
];

for (const file of FILES) {
	if (!existsSync(join(ROOT, file))) {
		console.error(
			`\n\u2717 Missing "${file}". Run "npm run build" first.\n`,
		);
		process.exit(1);
	}
}

const lines = FILES.map((file) => {
	const hash = createHash('sha256')
		.update(readFileSync(join(ROOT, file)))
		.digest('hex');
	return `${hash}  ${file}`;
});

const output = lines.join('\n') + '\n';
writeFileSync(join(ROOT, 'SHA256SUMS'), output);
process.stdout.write(output);
