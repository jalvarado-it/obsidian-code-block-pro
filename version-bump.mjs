import { readFileSync, writeFileSync } from 'node:fs';

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
	throw new Error('No version found. Run this script through npm version.');
}

// Read minAppVersion from manifest.json and bump the version to the target version.
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t') + '\n');

// Update versions.json with the target version and the minAppVersion from manifest.json.
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '\t') + '\n');
