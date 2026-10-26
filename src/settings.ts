import { App, PluginSettingTab } from 'obsidian';
import type { SettingDefinition, SettingDefinitionItem } from 'obsidian';
import type CodeBlockProPlugin from './main';

const MIN_LINE_SETTING = 1;
const MIN_SCROLL_SETTING = 0;
const MAX_LINE_SETTING = 1000;
const DEFAULT_COLLAPSE_AFTER_LINES = 24;
const DEFAULT_COLLAPSED_LINES = 14;
const DEFAULT_SCROLL_AFTER_LINES = DEFAULT_COLLAPSE_AFTER_LINES;

export interface CodeBlockProSettings {
	showLineNumbers: boolean;
	collapseAfterLines: number;
	collapsedLines: number;
	scrollAfterLines: number;
	showCopyButton: boolean;
	showDownloadButton: boolean;
	showLanguageLabel: boolean;
	showBlockTitle: boolean;
}

export const DEFAULT_SETTINGS: CodeBlockProSettings = {
	showLineNumbers: true,
	collapseAfterLines: DEFAULT_COLLAPSE_AFTER_LINES,
	collapsedLines: DEFAULT_COLLAPSED_LINES,
	scrollAfterLines: DEFAULT_SCROLL_AFTER_LINES,
	showCopyButton: true,
	showDownloadButton: true,
	showLanguageLabel: true,
	showBlockTitle: true,
};

type ToggleSettingKey =
	| 'showLineNumbers'
	| 'showCopyButton'
	| 'showDownloadButton'
	| 'showLanguageLabel'
	| 'showBlockTitle';

type NumberSettingKey = 'collapseAfterLines' | 'collapsedLines' | 'scrollAfterLines';

interface ToggleSettingMetadata {
	type: 'toggle';
	key: ToggleSettingKey;
	name: string;
	desc: string;
}

interface NumberSettingMetadata {
	type: 'number';
	key: NumberSettingKey;
	name: string;
	desc: string;
	min: number;
	max: number;
	validate: (value: number) => string | void;
}

type SettingMetadata = ToggleSettingMetadata | NumberSettingMetadata;

/**
 * Load only known settings with validated types and ranges.
 *
 * data.json lives in the vault and can be edited by other tools. Reading known
 * keys explicitly avoids prototype pollution and type confusion from malformed
 * or hostile settings files.
 */
export function normalizeSettings(value: unknown): CodeBlockProSettings {
	const record = isRecord(value) ? value : {};

	return {
		showLineNumbers: readBoolean(record.showLineNumbers, DEFAULT_SETTINGS.showLineNumbers),
		collapseAfterLines: readInteger(
			record.collapseAfterLines,
			DEFAULT_SETTINGS.collapseAfterLines,
			MIN_LINE_SETTING,
			MAX_LINE_SETTING,
		),
		collapsedLines: readInteger(
			record.collapsedLines,
			DEFAULT_SETTINGS.collapsedLines,
			MIN_LINE_SETTING,
			MAX_LINE_SETTING,
		),
		scrollAfterLines: readInteger(
			record.scrollAfterLines,
			DEFAULT_SETTINGS.scrollAfterLines,
			MIN_SCROLL_SETTING,
			MAX_LINE_SETTING,
		),
		showCopyButton: readBoolean(record.showCopyButton, DEFAULT_SETTINGS.showCopyButton),
		showDownloadButton: readBoolean(
			record.showDownloadButton,
			DEFAULT_SETTINGS.showDownloadButton,
		),
		showLanguageLabel: readBoolean(record.showLanguageLabel, DEFAULT_SETTINGS.showLanguageLabel),
		showBlockTitle: readBoolean(record.showBlockTitle, DEFAULT_SETTINGS.showBlockTitle),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function readInteger(value: unknown, fallback: number, min: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback;
	}

	return clamp(Math.round(value), min, max);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function validateRange(min: number, max: number): (value: number) => string | void {
	return (value) => {
		if (
			!Number.isFinite(value) ||
			!Number.isInteger(value) ||
			value < min ||
			value > max
		) {
			return `Enter a whole number between ${min} and ${max}.`;
		}

		return;
	};
}

const validateLineSetting = validateRange(MIN_LINE_SETTING, MAX_LINE_SETTING);
const validateScrollSetting = validateRange(MIN_SCROLL_SETTING, MAX_LINE_SETTING);

const SETTING_METADATA: readonly SettingMetadata[] = [
	{
		type: 'toggle',
		key: 'showLineNumbers',
		name: 'Line numbers',
		desc: 'Show line numbers next to each code block.',
	},
	{
		type: 'number',
		key: 'collapseAfterLines',
		name: 'Collapse after lines',
		desc: 'Show the collapse control for blocks with more lines than this.',
		min: MIN_LINE_SETTING,
		max: MAX_LINE_SETTING,
		validate: validateLineSetting,
	},
	{
		type: 'number',
		key: 'collapsedLines',
		name: 'Collapsed lines',
		desc: 'Number of code lines visible while a block is collapsed.',
		min: MIN_LINE_SETTING,
		max: MAX_LINE_SETTING,
		validate: validateLineSetting,
	},
	{
		type: 'number',
		key: 'scrollAfterLines',
		name: 'Scroll after lines',
		desc: 'Add a vertical scrollbar after this many lines. 0 disables it.',
		min: MIN_SCROLL_SETTING,
		max: MAX_LINE_SETTING,
		validate: validateScrollSetting,
	},
	{
		type: 'toggle',
		key: 'showCopyButton',
		name: 'Copy button',
		desc: 'Add a button to copy the code block to the clipboard.',
	},
	{
		type: 'toggle',
		key: 'showDownloadButton',
		name: 'Download button',
		desc: 'Add a button to download the code block as a file.',
	},
	{
		type: 'toggle',
		key: 'showLanguageLabel',
		name: 'Language label',
		desc: 'Show the language declared in the code fence.',
	},
	{
		type: 'toggle',
		key: 'showBlockTitle',
		name: 'Block title',
		desc: 'Show the text after the language in the code fence as the block title.',
	},
];

function toSettingDefinition(entry: SettingMetadata): SettingDefinition {
	if (entry.type === 'toggle') {
		return {
			name: entry.name,
			desc: entry.desc,
			control: {
				type: 'toggle',
				key: entry.key,
				defaultValue: DEFAULT_SETTINGS[entry.key],
			},
		};
	}

	return {
		name: entry.name,
		desc: entry.desc,
		control: {
			type: 'number',
			key: entry.key,
			defaultValue: DEFAULT_SETTINGS[entry.key],
			min: entry.min,
			max: entry.max,
			step: 1,
			validate: entry.validate,
		},
	};
}

export class SettingTab extends PluginSettingTab {
	private readonly plugin: CodeBlockProPlugin;

	constructor(app: App, plugin: CodeBlockProPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Obsidian 1.13.0+ renders the settings declaratively and makes them
	 * available to global search.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Appearance',
				items: SETTING_METADATA.map(toSettingDefinition),
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof CodeBlockProSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const entry = SETTING_METADATA.find((item) => item.key === key);

		if (!entry) {
			return;
		}

		if (entry.type === 'toggle') {
			if (typeof value !== 'boolean') {
				return;
			}

			this.plugin.settings[entry.key] = value;
		} else {
			const numeric =
				typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

			if (!Number.isFinite(numeric)) {
				return;
			}

			this.plugin.settings[entry.key] = clamp(Math.round(numeric), entry.min, entry.max);
		}

		await this.plugin.saveSettings();
		this.plugin.refreshViews();
	}
}
