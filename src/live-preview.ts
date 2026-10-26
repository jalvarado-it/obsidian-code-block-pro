import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import type { EditorState, Extension, Text } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { isClosingFence, parseFenceLine } from './fence';
import { isIgnoredLanguage } from './language';
import { DEFAULT_SETTINGS } from './settings';
import type { CodeBlockProSettings } from './settings';
import { createToolbar } from './toolbar';

const PREFIX = 'cbp';
const LIVE_PREVIEW_CLASS = `${PREFIX}-live-preview`;
const LINE_NUMBERS_CLASS = `${PREFIX}-live-numbers`;
const EMPTY_BLOCKS: readonly FenceBlock[] = [];

interface FenceBlock {
	language: string;
	title: string;
	ignored: boolean;
	openLine: number;
	openFrom: number;
	closeLine: number | null;
	blockEndLine: number;
	codeStartLine: number;
	codeEndLine: number;
	codeFrom: number;
	codeTo: number;
}

interface ToolbarBlock {
	language: string;
	title: string;
	from: number;
	to: number;
	doc: Text;
}

interface VisibleLineRange {
	from: number;
	to: number;
}

/** Forces a decoration rebuild after settings change. */
export const refreshDecorations = StateEffect.define<null>();

/**
 * Parse the document once per change. Both toolbars and line numbers use this
 * shared list, so cursor movement does not rescan the document.
 */
const blocksField = StateField.define<readonly FenceBlock[]>({
	create: (state) => (isLivePreview(state) ? scanFenceBlocks(state) : EMPTY_BLOCKS),
	update: (blocks, transaction) => {
		const wasLive = isLivePreview(transaction.startState);
		const isLive = isLivePreview(transaction.state);

		if (!isLive) {
			return EMPTY_BLOCKS;
		}

		if (transaction.docChanged || !wasLive) {
			return scanFenceBlocks(transaction.state);
		}

		return blocks;
	},
});

/**
 * Add the code block toolbar and line numbers to Live Preview.
 *
 * Live Preview renders fenced code blocks with CodeMirror instead of `<pre>`,
 * so reading view post-processors never see them. The fence list is parsed once
 * per document change; toolbars and line numbers are derived from that shared
 * list instead of scanning the document twice.
 */
export function createLivePreviewExtension(
	getSettings: () => CodeBlockProSettings,
	onViewChange?: (view: EditorView, active: boolean) => void,
): Extension {
	const decorationsField = StateField.define<DecorationSet>({
		create: (state) => buildDecorations(state, getSettings()),
		update: (decorations, transaction) => {
			const wasLive = isLivePreview(transaction.startState);
			const isLive = isLivePreview(transaction.state);
			const refreshRequested = transaction.effects.some((effect) =>
				effect.is(refreshDecorations),
			);

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
				const wasLive = isLivePreview(update.startState);
				const isLive = isLivePreview(update.state);
				const refreshRequested = update.transactions.some((transaction) =>
					transaction.effects.some((effect) => effect.is(refreshDecorations)),
				);

				if (
					update.docChanged ||
					update.viewportChanged ||
					wasLive !== isLive ||
					refreshRequested
				) {
					this.decorations = buildLineDecorations(update.view, getSettings());
				}

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

	return [blocksField, decorationsField, viewExtension];
}

function buildDecorations(state: EditorState, settings: CodeBlockProSettings): DecorationSet {
	const blocks = state.field(blocksField, false) ?? EMPTY_BLOCKS;
	const controls = hasToolbarControls(settings);

	if (!controls && !settings.showBlockTitle) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();

	for (const block of blocks) {
		if (block.ignored) {
			continue;
		}

		const showTitle = settings.showBlockTitle && block.title !== '';
		if (!controls && !showTitle) {
			continue;
		}

		builder.add(
			block.openFrom,
			block.openFrom,
			Decoration.widget({
				widget: new CodeBlockToolbarWidget(
					{
						language: block.language,
						title: block.title,
						from: block.codeFrom,
						to: block.codeTo,
						doc: state.doc,
					},
					settings,
				),
				block: true,
				side: -1,
			}),
		);
	}

	return builder.finish();
}

function buildLineDecorations(view: EditorView, settings: CodeBlockProSettings): DecorationSet {
	const controls = hasToolbarControls(settings);

	if (!controls && !settings.showLineNumbers && !settings.showBlockTitle) {
		return Decoration.none;
	}

	if (!isLivePreview(view.state)) {
		return Decoration.none;
	}

	const blocks = view.state.field(blocksField, false) ?? EMPTY_BLOCKS;
	const visibleLineRanges = getVisibleLineRanges(view);

	if (blocks.length === 0 || visibleLineRanges.length === 0) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	let blockIndex = 0;

	for (const range of visibleLineRanges) {
		for (let lineNumber = range.from; lineNumber <= range.to; lineNumber++) {
			while (
				blockIndex < blocks.length &&
				blocks[blockIndex]!.blockEndLine < lineNumber
			) {
				blockIndex++;
			}

			const block = blocks[blockIndex];

			if (!block || block.openLine > lineNumber || block.ignored) {
				continue;
			}

			const showTitle = settings.showBlockTitle && block.title !== '';
			const showToolbar = controls || showTitle;
			const showBlock = settings.showLineNumbers || showToolbar;

			if (!showBlock) {
				continue;
			}

			const line = view.state.doc.line(lineNumber);
			const attributes: Record<string, string> = { 'data-cbp-block': 'true' };

			if (lineNumber === block.openLine) {
				if (showToolbar) {
					attributes['data-cbp-toolbar'] = 'true';
				}

				if (settings.showCopyButton) {
					attributes['data-cbp-copy'] = 'true';
				}
			} else if (block.closeLine === null || lineNumber !== block.closeLine) {
				if (settings.showLineNumbers) {
					attributes['data-cbp-line'] = String(
						lineNumber - block.codeStartLine + 1,
					);
				}
			}

			builder.add(line.from, line.from, Decoration.line({ attributes }));
		}
	}

	return builder.finish();
}

function scanFenceBlocks(state: EditorState): FenceBlock[] {
	const { doc } = state;
	const blocks: FenceBlock[] = [];
	let lineNumber = 1;

	while (lineNumber <= doc.lines) {
		const line = doc.line(lineNumber);
		const opening = parseFenceLine(line.text);

		if (!opening) {
			lineNumber++;
			continue;
		}

		const { fence, language, title } = opening;
		let endLineNumber = lineNumber + 1;

		for (; endLineNumber <= doc.lines; endLineNumber++) {
			if (isClosingFence(doc.line(endLineNumber).text, fence)) {
				break;
			}
		}

		const hasClosing = endLineNumber <= doc.lines;
		const closeLine = hasClosing ? endLineNumber : null;
		const codeStartLine = lineNumber + 1;
		const codeEndLine = hasClosing ? endLineNumber - 1 : doc.lines;
		const hasCode = codeStartLine <= codeEndLine;
		const codeFrom = hasCode ? doc.line(codeStartLine).from : line.to;
		const codeTo = hasCode ? doc.line(codeEndLine).to : codeFrom;

		blocks.push({
			language,
			title,
			ignored: isIgnoredLanguage(language),
			openLine: lineNumber,
			openFrom: line.from,
			closeLine,
			blockEndLine: closeLine ?? doc.lines,
			codeStartLine,
			codeEndLine,
			codeFrom,
			codeTo,
		});

		lineNumber = (hasClosing ? endLineNumber : doc.lines) + 1;
	}

	return blocks;
}

function getVisibleLineRanges(view: EditorView): VisibleLineRange[] {
	const { doc } = view.state;
	const ranges: VisibleLineRange[] = [];

	for (const range of view.visibleRanges) {
		const from = doc.lineAt(range.from).number;
		const to = doc.lineAt(range.to).number;
		const previous = ranges[ranges.length - 1];

		if (previous && from <= previous.to + 1) {
			previous.to = Math.max(previous.to, to);
		} else {
			ranges.push({ from, to });
		}
	}

	return ranges;
}

function hasToolbarControls(settings: CodeBlockProSettings): boolean {
	return settings.showCopyButton || settings.showDownloadButton || settings.showLanguageLabel;
}

function isLivePreview(state: EditorState): boolean {
	return state.field(editorLivePreviewField, false) ?? false;
}

function syncEditorClasses(view: EditorView, settings: CodeBlockProSettings): void {
	const livePreview = isLivePreview(view.state);
	const toolbarEnabled = hasToolbarControls(settings) || settings.showBlockTitle;

	view.dom.classList.toggle(LIVE_PREVIEW_CLASS, livePreview && toolbarEnabled);
	view.dom.classList.toggle(LINE_NUMBERS_CLASS, livePreview && settings.showLineNumbers);
}

class CodeBlockToolbarWidget extends WidgetType {
	private readonly block: ToolbarBlock;
	private readonly settings: CodeBlockProSettings;

	constructor(block: ToolbarBlock, settings: CodeBlockProSettings) {
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
			other.block.title === this.block.title &&
			other.block.from === this.block.from &&
			other.block.to === this.block.to &&
			other.block.doc === this.block.doc &&
			settingsEqual(other.settings, this.settings)
		);
	}

	toDOM(): HTMLElement {
		const wrapper = createDiv({ cls: `${PREFIX}-live-wrapper` });
		const toolbar = createToolbar({
			settings: this.settings,
			language: this.block.language,
			codeText: this.block.doc.sliceString(this.block.from, this.block.to),
			title: this.block.title,
		});

		if (!toolbar) {
			return wrapper;
		}

		wrapper.appendChild(toolbar);
		return wrapper;
	}
}

function settingsEqual(a: CodeBlockProSettings, b: CodeBlockProSettings): boolean {
	return (Object.keys(DEFAULT_SETTINGS) as Array<keyof CodeBlockProSettings>).every(
		(key) => a[key] === b[key],
	);
}
