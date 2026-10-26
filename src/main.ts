import { MarkdownView, Plugin } from 'obsidian';
import { decorateCodeBlocks } from './processor';
import { DEFAULT_SETTINGS, SettingTab, type CodeBlockProSettings } from './settings';

export default class CodeBlockProPlugin extends Plugin {
	settings: CodeBlockProSettings = Object.assign({}, DEFAULT_SETTINGS);

	async onload(): Promise<void> {
		await this.loadSettings();

		// Reading view and Live Preview both run markdown post-processors.
		this.registerMarkdownPostProcessor((element) => {
			decorateCodeBlocks(element, this.settings);
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	/**
	 * Reload styles for the open notes so display changes apply immediately.
	 */
	refreshViews(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			const { view } = leaf;
			if (view instanceof MarkdownView) {
				view.previewMode.rerender(true);
			}
		});
	}

	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as Partial<CodeBlockProSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
