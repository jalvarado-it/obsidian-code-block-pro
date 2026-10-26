#!/usr/bin/env node
/**
 * Build release-notes.md from the current version's CHANGELOG section.
 *
 * Run after the manifest version has been bumped. The output is used by the
 * release workflow as the GitHub release body.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
const heading = `## [${version}]`;
const start = changelog.indexOf(heading);

if (start === -1) {
	console.error(`\n\u2717 CHANGELOG.md has no "${heading}" section.\n`);
	process.exit(1);
}

const next = changelog.indexOf('\n## [', start + heading.length);
const section = changelog.slice(start, next === -1 ? undefined : next).trim();
const body = section.split('\n').slice(1).join('\n').trim();
const output = `# Code Block Pro ${version}\n\n${body}\n`;

writeFileSync(join(ROOT, 'release-notes.md'), output);
process.stdout.write(output);
