import { App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type CodeBlockProPlugin from './main';

const MIN_LINE_SETTING = 1;
const MAX_LINE_SETTING = 1000;

export interface CodeBlockProSettings {
	showLineNumbers: boolean;
	collapseAfterLines: number;
	collapsedLines: number;
	showCopyButton: boolean;
	showLanguageLabel: boolean;
}

export const DEFAULT_SETTINGS: CodeBlockProSettings = {
	showLineNumbers: true,
	collapseAfterLines: 24,
	collapsedLines: 14,
	showCopyButton: true,
	showLanguageLabel: true,
};

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
		),
		collapsedLines: readInteger(record.collapsedLines, DEFAULT_SETTINGS.collapsedLines),
		showCopyButton: readBoolean(record.showCopyButton, DEFAULT_SETTINGS.showCopyButton),
		showLanguageLabel: readBoolean(record.showLanguageLabel, DEFAULT_SETTINGS.showLanguageLabel),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function readInteger(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback;
	}

	return clamp(Math.round(value), MIN_LINE_SETTING, MAX_LINE_SETTING);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function validateLineSetting(value: number): string | void {
	if (
		!Number.isFinite(value) ||
		!Number.isInteger(value) ||
		value < MIN_LINE_SETTING ||
		value > MAX_LINE_SETTING
	) {
		return `Enter a whole number between ${MIN_LINE_SETTING} and ${MAX_LINE_SETTING}.`;
	}
}

export class SettingTab extends PluginSettingTab {
	private readonly plugin: CodeBlockProPlugin;

	constructor(app: App, plugin: CodeBlockProPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Settings tab for Obsidian versions before 1.13.0, where the declarative
	 * settings API is not available.
	 */
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName('Appearance').setHeading();

		new Setting(containerEl)
			.setName('Line numbers')
			.setDesc('Show line numbers next to each code block.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showLineNumbers).onChange(async (value) => {
					await this.updateSetting('showLineNumbers', value);
				}),
			);

		this.addNumberSetting(
			containerEl,
			'collapseAfterLines',
			'Collapse after lines',
			'Show the collapse control for blocks with more lines than this.',
		);

		this.addNumberSetting(
			containerEl,
			'collapsedLines',
			'Collapsed lines',
			'Number of code lines visible while a block is collapsed.',
		);

		new Setting(containerEl)
			.setName('Copy button')
			.setDesc('Add a button to copy the code block to the clipboard.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showCopyButton).onChange(async (value) => {
					await this.updateSetting('showCopyButton', value);
				}),
			);

		new Setting(containerEl)
			.setName('Language label')
			.setDesc('Show the language declared in the code fence.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showLanguageLabel).onChange(async (value) => {
					await this.updateSetting('showLanguageLabel', value);
				}),
			);
	}

	/**
	 * Settings tab for Obsidian 1.13.0 and later, which renders definitions and
	 * makes settings available to global search.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Appearance',
				items: [
					{
						name: 'Line numbers',
						desc: 'Show line numbers next to each code block.',
						control: {
							type: 'toggle',
							key: 'showLineNumbers',
							defaultValue: DEFAULT_SETTINGS.showLineNumbers,
						},
					},
					{
						name: 'Collapse after lines',
						desc: 'Show the collapse control for blocks with more lines than this.',
						control: {
							type: 'number',
							key: 'collapseAfterLines',
							defaultValue: DEFAULT_SETTINGS.collapseAfterLines,
							min: MIN_LINE_SETTING,
							max: MAX_LINE_SETTING,
							step: 1,
							validate: validateLineSetting,
						},
					},
					{
						name: 'Collapsed lines',
						desc: 'Number of code lines visible while a block is collapsed.',
						control: {
							type: 'number',
							key: 'collapsedLines',
							defaultValue: DEFAULT_SETTINGS.collapsedLines,
							min: MIN_LINE_SETTING,
							max: MAX_LINE_SETTING,
							step: 1,
							validate: validateLineSetting,
						},
					},
					{
						name: 'Copy button',
						desc: 'Add a button to copy the code block to the clipboard.',
						control: {
							type: 'toggle',
							key: 'showCopyButton',
							defaultValue: DEFAULT_SETTINGS.showCopyButton,
						},
					},
					{
						name: 'Language label',
						desc: 'Show the language declared in the code fence.',
						control: {
							type: 'toggle',
							key: 'showLanguageLabel',
							defaultValue: DEFAULT_SETTINGS.showLanguageLabel,
						},
					},
				],
			},
		];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'collapseAfterLines' || key === 'collapsedLines') {
			const numeric =
				typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

			if (!Number.isFinite(numeric)) {
				return;
			}

			this.plugin.settings[key] = clamp(
				Math.round(numeric),
				MIN_LINE_SETTING,
				MAX_LINE_SETTING,
			);
			await this.plugin.saveSettings();
			this.plugin.refreshViews();
			return;
		}

		if (key !== 'showLineNumbers' && key !== 'showCopyButton' && key !== 'showLanguageLabel') {
			return;
		}

		if (typeof value !== 'boolean') {
			return;
		}

		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
		this.plugin.refreshViews();
	}

	private addNumberSetting(
		containerEl: HTMLElement,
		key: 'collapseAfterLines' | 'collapsedLines',
		name: string,
		desc: string,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text.inputEl.type = 'number';
				text.inputEl.min = String(MIN_LINE_SETTING);
				text.inputEl.max = String(MAX_LINE_SETTING);
				text.inputEl.step = '1';
				text.inputEl.addClass('cbp-settings-number');
				text.inputEl.setAttribute('aria-label', name);
				text.setValue(String(this.plugin.settings[key]));

				text.onChange(async (value) => {
					const parsed = Number.parseInt(value, 10);

					if (!Number.isFinite(parsed)) {
						return;
					}

					this.plugin.settings[key] = clamp(
						parsed,
						MIN_LINE_SETTING,
						MAX_LINE_SETTING,
					);
					await this.plugin.saveSettings();
				});

				text.inputEl.addEventListener('blur', () => {
					text.setValue(String(this.plugin.settings[key]));
					this.plugin.refreshViews();
				});

				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						text.inputEl.blur();
					}
				});
			});
	}

	private async updateSetting<K extends keyof CodeBlockProSettings>(
		key: K,
		value: CodeBlockProSettings[K],
	): Promise<void> {
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
		this.plugin.refreshViews();
	}
}
