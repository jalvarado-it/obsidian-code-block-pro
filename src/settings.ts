import { App, PluginSettingTab } from 'obsidian';
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
		await super.setControlValue(key, value);
		this.plugin.refreshViews();
	}
}
