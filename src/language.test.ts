import { describe, expect, it } from 'vitest';
import {
	getLanguageBadge,
	getLanguageExtension,
	getLanguageIconId,
	getLanguageLabel,
	isIgnoredLanguage,
	normalizeLanguage,
} from './language';

describe('normalizeLanguage', () => {
	it('normalizes aliases and case', () => {
		expect(normalizeLanguage('JS')).toBe('javascript');
		expect(normalizeLanguage('sh')).toBe('shell');
		expect(normalizeLanguage('c#')).toBe('csharp');
		expect(normalizeLanguage('c++')).toBe('cpp');
		expect(normalizeLanguage('  YML  ')).toBe('yaml');
	});

	it('preserves unknown languages in lower case', () => {
		expect(normalizeLanguage('Foobar')).toBe('foobar');
	});
});

describe('isIgnoredLanguage', () => {
	it('ignores processor-owned languages', () => {
		expect(isIgnoredLanguage('mermaid')).toBe(true);
		expect(isIgnoredLanguage('dataviewjs')).toBe(true);
		expect(isIgnoredLanguage('javascript')).toBe(false);
	});
});

describe('language labels and badges', () => {
	it('falls back to text and TXT', () => {
		expect(getLanguageLabel('')).toBe('text');
		expect(getLanguageBadge('')).toBe('TXT');
		expect(getLanguageIconId('')).toBe('file-text');
	});

	it('uses explicit metadata', () => {
		expect(getLanguageLabel('js')).toBe('javascript');
		expect(getLanguageBadge('javascript')).toBe('JS');
		expect(getLanguageBadge('jsx')).toBe('JSX');
		expect(getLanguageIconId('javascript')).toBe('file-code-2');
		expect(getLanguageIconId('sql')).toBe('database');
	});

	it('falls back for unknown languages', () => {
		expect(getLanguageBadge('foobar')).toBe('FO');
		expect(getLanguageIconId('foobar')).toBe('code-2');
	});
});

describe('getLanguageExtension', () => {
	it('returns known extensions and aliases', () => {
		expect(getLanguageExtension('js')).toBe('js');
		expect(getLanguageExtension('typescript')).toBe('ts');
		expect(getLanguageExtension('yml')).toBe('yml');
		expect(getLanguageExtension('jsx')).toBe('jsx');
		expect(getLanguageExtension('tsx')).toBe('tsx');
	});

	it('falls back to txt', () => {
		expect(getLanguageExtension('')).toBe('txt');
		expect(getLanguageExtension('unknown-language')).toBe('txt');
	});
});
