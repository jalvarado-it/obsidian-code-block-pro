import { describe, expect, it, vi } from 'vitest';

vi.mock('obsidian', () => ({
	App: class {},
	PluginSettingTab: class {},
	Setting: class {},
}));

import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

describe('normalizeSettings', () => {
	it('returns defaults for missing or non-object data', () => {
		expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings('invalid')).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS);
	});

	it('preserves valid settings', () => {
		const value = {
			showLineNumbers: false,
			collapseAfterLines: 40,
			collapsedLines: 20,
			scrollAfterLines: 0,
			showCopyButton: false,
			showDownloadButton: false,
			showLanguageLabel: false,
			showBlockTitle: false,
		};

		expect(normalizeSettings(value)).toEqual(value);
	});

	it('falls back for invalid booleans', () => {
		const result = normalizeSettings({
			showLineNumbers: 'false',
			showCopyButton: 0,
			showDownloadButton: null,
			showLanguageLabel: 1,
			showBlockTitle: undefined,
		});

		expect(result.showLineNumbers).toBe(DEFAULT_SETTINGS.showLineNumbers);
		expect(result.showCopyButton).toBe(DEFAULT_SETTINGS.showCopyButton);
		expect(result.showDownloadButton).toBe(DEFAULT_SETTINGS.showDownloadButton);
		expect(result.showLanguageLabel).toBe(DEFAULT_SETTINGS.showLanguageLabel);
		expect(result.showBlockTitle).toBe(DEFAULT_SETTINGS.showBlockTitle);
	});

	it('rounds and clamps numeric settings', () => {
		const result = normalizeSettings({
			collapseAfterLines: 0,
			collapsedLines: 5000,
			scrollAfterLines: -10,
		});

		expect(result.collapseAfterLines).toBe(1);
		expect(result.collapsedLines).toBe(1000);
		expect(result.scrollAfterLines).toBe(0);
	});

	it('falls back for non-numeric and non-finite values', () => {
		const result = normalizeSettings({
			collapseAfterLines: '40',
			collapsedLines: Number.NaN,
			scrollAfterLines: Infinity,
		});

		expect(result.collapseAfterLines).toBe(DEFAULT_SETTINGS.collapseAfterLines);
		expect(result.collapsedLines).toBe(DEFAULT_SETTINGS.collapsedLines);
		expect(result.scrollAfterLines).toBe(DEFAULT_SETTINGS.scrollAfterLines);
	});

	it('ignores unknown keys and does not mutate the input', () => {
		const value = { showBlockTitle: false, unknown: 'value' };
		const result = normalizeSettings(value);

		expect(result.showBlockTitle).toBe(false);
		expect('unknown' in result).toBe(false);
		expect(value).toEqual({ showBlockTitle: false, unknown: 'value' });
	});

	it('does not read inherited values', () => {
		const value: unknown = JSON.parse('{"__proto__":{"showLineNumbers":false}}');
		expect(normalizeSettings(value).showLineNumbers).toBe(
			DEFAULT_SETTINGS.showLineNumbers,
		);
	});
});
