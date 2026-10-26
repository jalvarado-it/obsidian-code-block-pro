import type { EditorView } from '@codemirror/view';
import { MarkdownView, Plugin } from 'obsidian';
import { createLivePreviewExtension, refreshDecorations } from './live-preview';
import { decorateCodeBlocks, refreshCodeBlockMetrics } from './processor';
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
		this.registerMarkdownPostProcessor((element, context) =>
			decorateCodeBlocks(element, this.settings, context, this.app),
		);

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

		// Themes, snippets, and font changes can alter the rendered code metrics.
		// Re-measure reading view gutters after Obsidian finishes applying CSS.
		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				window.requestAnimationFrame(() => {
					this.refreshReadingCodeBlocks();
				});
			}),
		);
	}

	private refreshReadingCodeBlocks(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			const { view } = leaf;
			if (!(view instanceof MarkdownView)) {
				return;
			}

			view.containerEl.querySelectorAll<HTMLElement>('.cbp-block').forEach((block) => {
				refreshCodeBlockMetrics(block);
			});
		});
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
