import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import type { EditorState, Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import type { CodeBlockProSettings } from './settings';
import { createToolbar } from './toolbar';

const PREFIX = 'cbp';
const LIVE_PREVIEW_CLASS = `${PREFIX}-live-preview`;
const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;

interface CodeBlock {
	language: string;
	code: string;
}

/** Forces a decoration rebuild after settings change. */
export const refreshDecorations = StateEffect.define<null>();

/**
 * Add the code block toolbar to Live Preview.
 *
 * Live Preview renders fenced code blocks with CodeMirror instead of `<pre>`,
 * so reading view post-processors never see them. Block widgets must come from
 * a state field, not a view plugin.
 */
export function createLivePreviewExtension(
	getSettings: () => CodeBlockProSettings,
	onViewChange?: (view: EditorView, active: boolean) => void,
): Extension {
	const decorationsField = StateField.define<DecorationSet>({
		create: (state) => buildDecorations(state, getSettings()),
		update: (decorations, transaction) => {
			const wasLive = transaction.startState.field(editorLivePreviewField, false) ?? false;
			const isLive = transaction.state.field(editorLivePreviewField, false) ?? false;
			const refreshRequested = transaction.effects.some((effect) => effect.is(refreshDecorations));

			if (transaction.docChanged || wasLive !== isLive || refreshRequested) {
				return isLive ? buildDecorations(transaction.state, getSettings()) : Decoration.none;
			}

			return decorations.map(transaction.changes);
		},
		provide: (field) => EditorView.decorations.from(field),
	});

	const classPlugin = ViewPlugin.fromClass(
		class {
			private readonly view: EditorView;

			constructor(view: EditorView) {
				this.view = view;
				syncEditorClass(view, getSettings());
				onViewChange?.(view, true);
			}

			update(update: ViewUpdate): void {
				syncEditorClass(update.view, getSettings());
			}

			destroy(): void {
				this.view.dom.classList.remove(LIVE_PREVIEW_CLASS);
				onViewChange?.(this.view, false);
			}
		},
	);

	return [decorationsField, classPlugin];
}

function buildDecorations(state: EditorState, settings: CodeBlockProSettings): DecorationSet {
	if (!settings.showCopyButton && !settings.showLanguageLabel) {
		return Decoration.none;
	}

	const { doc } = state;
	const builder = new RangeSetBuilder<Decoration>();
	let lineNumber = 1;

	while (lineNumber <= doc.lines) {
		const line = doc.line(lineNumber);
		const opening = FENCE_OPEN_PATTERN.exec(line.text);

		if (!opening) {
			lineNumber++;
			continue;
		}

		const fence = opening[1];
		if (!fence) {
			lineNumber++;
			continue;
		}

		const language = opening[2] ?? '';
		const codeLines: string[] = [];
		let endLineNumber = lineNumber + 1;

		for (; endLineNumber <= doc.lines; endLineNumber++) {
			const codeLine = doc.line(endLineNumber);

			if (isClosingFence(codeLine.text, fence)) {
				break;
			}

			codeLines.push(codeLine.text);
		}

		if (settings.showCopyButton || (settings.showLanguageLabel && language)) {
			builder.add(
				line.from,
				line.from,
				Decoration.widget({
					widget: new CodeBlockToolbarWidget({ language, code: codeLines.join('\n') }, settings),
					block: true,
					side: -1,
				}),
			);
		}

		lineNumber = endLineNumber + 1;
	}

	return builder.finish();
}

function syncEditorClass(view: EditorView, settings: CodeBlockProSettings): void {
	const enabled = settings.showCopyButton || settings.showLanguageLabel;
	const livePreview = view.state.field(editorLivePreviewField, false) ?? false;
	view.dom.classList.toggle(LIVE_PREVIEW_CLASS, enabled && livePreview);
}

function isClosingFence(line: string, fence: string): boolean {
	const trimmed = line.trim();

	if (trimmed.length < fence.length) {
		return false;
	}

	const char = fence.charAt(0);
	for (const value of trimmed) {
		if (value !== char) {
			return false;
		}
	}

	return true;
}

class CodeBlockToolbarWidget extends WidgetType {
	private readonly block: CodeBlock;
	private readonly settings: CodeBlockProSettings;

	constructor(block: CodeBlock, settings: CodeBlockProSettings) {
		super();
		this.block = block;
		// Snapshot the settings so `eq` compares values instead of the live object.
		this.settings = { ...settings };
	}

	eq(other: WidgetType): boolean {
		if (!(other instanceof CodeBlockToolbarWidget)) {
			return false;
		}

		return (
			other.block.language === this.block.language &&
			other.block.code === this.block.code &&
			other.settings.showCopyButton === this.settings.showCopyButton &&
			other.settings.showLanguageLabel === this.settings.showLanguageLabel
		);
	}

	toDOM(): HTMLElement {
		const wrapper = createDiv({ cls: `${PREFIX}-live-wrapper` });
		const toolbar = createToolbar(this.settings, this.block.language, this.block.code);

		if (!toolbar) {
			return wrapper;
		}

		toolbar.addClass(`${PREFIX}-toolbar--live`);
		wrapper.appendChild(toolbar);
		return wrapper;
	}
}
