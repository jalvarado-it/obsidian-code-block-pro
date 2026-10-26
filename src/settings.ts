import { App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type CodeBlockProPlugin from './main';

export interface CodeBlockProSettings {
	showCopyButton: boolean;
	showLanguageLabel: boolean;
}

export const DEFAULT_SETTINGS: CodeBlockProSettings = {
	showCopyButton: true,
	showLanguageLabel: true,
};

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
		if (key !== 'showCopyButton' && key !== 'showLanguageLabel') {
			return;
		}

		if (typeof value !== 'boolean') {
			return;
		}

		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
		this.plugin.refreshViews();
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
