import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import type { EditorState, Extension, Line } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { isClosingFence, parseFenceLine } from './fence';
import { isIgnoredLanguage } from './language';
import type { CodeBlockProSettings } from './settings';
import { createToolbar } from './toolbar';

const PREFIX = 'cbp';
const LIVE_PREVIEW_CLASS = `${PREFIX}-live-preview`;
const LINE_NUMBERS_CLASS = `${PREFIX}-live-numbers`;

interface CodeBlock {
	language: string;
	code: string;
	title: string;
}

interface Range {
	from: number;
	to: number;
}

/** Forces a decoration rebuild after settings change. */
export const refreshDecorations = StateEffect.define<null>();

/**
 * Add the code block toolbar and line numbers to Live Preview.
 *
 * Live Preview renders fenced code blocks with CodeMirror instead of `<pre>`,
 * so reading view post-processors never see them. Toolbars use block widgets
 * from a state field; line numbers use line decorations from a view plugin.
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

	const viewExtension = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private readonly view: EditorView;

			constructor(view: EditorView) {
				this.view = view;
				this.decorations = buildLineDecorations(view, getSettings());
				syncEditorClasses(view, getSettings());
				onViewChange?.(view, true);
			}

			update(update: ViewUpdate): void {
				this.decorations = buildLineDecorations(update.view, getSettings());
				syncEditorClasses(update.view, getSettings());
			}

			destroy(): void {
				this.view.dom.classList.remove(LIVE_PREVIEW_CLASS);
				this.view.dom.classList.remove(LINE_NUMBERS_CLASS);
				onViewChange?.(this.view, false);
			}
		},
		{
			decorations: (plugin) => plugin.decorations,
		},
	);

	return [decorationsField, viewExtension];
}

function buildDecorations(state: EditorState, settings: CodeBlockProSettings): DecorationSet {
	const hasControls =
		settings.showCopyButton || settings.showDownloadButton || settings.showLanguageLabel;

	if (!hasControls && !settings.showBlockTitle) {
		return Decoration.none;
	}

	const { doc } = state;
	const builder = new RangeSetBuilder<Decoration>();
	let lineNumber = 1;

	while (lineNumber <= doc.lines) {
		const line = doc.line(lineNumber);
		const opening = parseFenceLine(line.text);

		if (!opening) {
			lineNumber++;
			continue;
		}

		const { fence, language, title } = opening;
		const ignored = isIgnoredLanguage(language);
		const showTitle = settings.showBlockTitle && title !== '';
		const codeLines: string[] = [];
		let endLineNumber = lineNumber + 1;

		for (; endLineNumber <= doc.lines; endLineNumber++) {
			const codeLine = doc.line(endLineNumber);

			if (isClosingFence(codeLine.text, fence)) {
				break;
			}

			codeLines.push(codeLine.text);
		}

		if (!ignored && (hasControls || showTitle)) {
			builder.add(
				line.from,
				line.from,
				Decoration.widget({
					widget: new CodeBlockToolbarWidget(
						{ language, code: codeLines.join('\n'), title },
						settings,
					),
					block: true,
					side: -1,
				}),
			);
		}

		lineNumber = endLineNumber + 1;
	}

	return builder.finish();
}

function buildLineDecorations(view: EditorView, settings: CodeBlockProSettings): DecorationSet {
	const hasControls =
		settings.showCopyButton || settings.showDownloadButton || settings.showLanguageLabel;

	if (!hasControls && !settings.showLineNumbers && !settings.showBlockTitle) {
		return Decoration.none;
	}

	if (!view.state.field(editorLivePreviewField, false)) {
		return Decoration.none;
	}

	const visibleRanges = view.visibleRanges;
	if (visibleRanges.length === 0) {
		return Decoration.none;
	}

	const { doc } = view.state;
	const builder = new RangeSetBuilder<Decoration>();
	let scanLine = 1;

	while (scanLine <= doc.lines) {
		const line = doc.line(scanLine);
		const opening = parseFenceLine(line.text);

		if (!opening) {
			scanLine++;
			continue;
		}

		const { fence, language, title } = opening;
		const ignored = isIgnoredLanguage(language);
		const showTitle = settings.showBlockTitle && title !== '';
		const showToolbar = !ignored && (hasControls || showTitle);
		const showBlock = !ignored && (settings.showLineNumbers || showToolbar);
		let displayLine = 1;
		let endLineNumber = scanLine + 1;
		let endLine: Line | null = null;

		if (showBlock && isLineVisible(line.from, line.to, visibleRanges)) {
			const attributes: Record<string, string> = { 'data-cbp-block': 'true' };

			if (showToolbar) {
				attributes['data-cbp-toolbar'] = 'true';
			}

			if (settings.showCopyButton) {
				attributes['data-cbp-copy'] = 'true';
			}

			builder.add(line.from, line.from, Decoration.line({ attributes }));
		}

		for (; endLineNumber <= doc.lines; endLineNumber++) {
			const codeLine = doc.line(endLineNumber);

			if (isClosingFence(codeLine.text, fence)) {
				endLine = codeLine;
				break;
			}

			if (showBlock && isLineVisible(codeLine.from, codeLine.to, visibleRanges)) {
				const attributes: Record<string, string> = { 'data-cbp-block': 'true' };

				if (settings.showLineNumbers) {
					attributes['data-cbp-line'] = String(displayLine);
				}

				builder.add(codeLine.from, codeLine.from, Decoration.line({ attributes }));
			}

			displayLine++;
		}

		if (showBlock && endLine && isLineVisible(endLine.from, endLine.to, visibleRanges)) {
			builder.add(
				endLine.from,
				endLine.from,
				Decoration.line({ attributes: { 'data-cbp-block': 'true' } }),
			);
		}

		scanLine = endLineNumber + 1;
	}

	return builder.finish();
}

function isLineVisible(from: number, to: number, ranges: readonly Range[]): boolean {
	return ranges.some((range) => range.from <= to && range.to >= from);
}

function syncEditorClasses(view: EditorView, settings: CodeBlockProSettings): void {
	const livePreview = view.state.field(editorLivePreviewField, false) ?? false;
	const toolbarEnabled =
		settings.showCopyButton ||
		settings.showDownloadButton ||
		settings.showLanguageLabel ||
		settings.showBlockTitle;

	view.dom.classList.toggle(LIVE_PREVIEW_CLASS, livePreview && toolbarEnabled);
	view.dom.classList.toggle(LINE_NUMBERS_CLASS, livePreview && settings.showLineNumbers);
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
			other.block.title === this.block.title &&
			other.settings.showCopyButton === this.settings.showCopyButton &&
			other.settings.showLanguageLabel === this.settings.showLanguageLabel &&
			other.settings.showBlockTitle === this.settings.showBlockTitle
		);
	}

	toDOM(): HTMLElement {
		const wrapper = createDiv({ cls: `${PREFIX}-live-wrapper` });
		const toolbar = createToolbar({
			settings: this.settings,
			language: this.block.language,
			codeText: this.block.code,
			title: this.block.title,
		});

		if (!toolbar) {
			return wrapper;
		}

		toolbar.addClass(`${PREFIX}-toolbar--live`);
		wrapper.appendChild(toolbar);
		return wrapper;
	}
}
