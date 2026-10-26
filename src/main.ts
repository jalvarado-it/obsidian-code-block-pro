import type { EditorView } from '@codemirror/view';
import { MarkdownView, Plugin } from 'obsidian';
import { createLivePreviewExtension, refreshDecorations } from './live-preview';
import { decorateCodeBlocks } from './processor';
import {
	DEFAULT_SETTINGS,
	SettingTab,
	normalizeSettings,
	type CodeBlockProSettings,
} from './settings';

export default class CodeBlockProPlugin extends Plugin {
	settings: CodeBlockProSettings = { ...DEFAULT_SETTINGS };
	private readonly editorViews = new Set<EditorView>();

	async onload(): Promise<void> {
		await this.loadSettings();

		// Reading view and rendered embeds.
		this.registerMarkdownPostProcessor((element) => {
			decorateCodeBlocks(element, this.settings);
		});

		// Live Preview, where code blocks are CodeMirror content instead of <pre>.
		this.registerEditorExtension(
			createLivePreviewExtension(
				() => this.settings,
				(view, active) => {
					if (active) {
						this.editorViews.add(view);
					} else {
						this.editorViews.delete(view);
					}
				},
			),
		);

		this.addSettingTab(new SettingTab(this.app, this));
	}

	/**
	 * Refresh open notes so display changes apply immediately.
	 */
	refreshViews(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			const { view } = leaf;
			if (view instanceof MarkdownView) {
				view.previewMode.rerender(true);
			}
		});

		for (const view of this.editorViews) {
			view.dispatch({ effects: refreshDecorations.of(null) });
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
