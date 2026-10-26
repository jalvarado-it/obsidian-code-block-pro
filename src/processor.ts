import { TFile } from 'obsidian';
import type { App, MarkdownPostProcessorContext } from 'obsidian';
import {
	buildFenceTitleIndex,
	findFenceTitleMatch,
	findIndexedTitle,
	type FenceTitleIndex,
	type FenceTitleMatch,
} from './fence';
import { isIgnoredLanguage } from './language';
import type { CodeBlockProSettings } from './settings';
import { addToolbarTitle, countLines, createToolbar } from './toolbar';

const PREFIX = 'cbp';
const PROCESSED_ATTRIBUTE = 'data-code-block-pro';
const PENDING_ATTRIBUTE = 'data-code-block-pro-pending';
const IGNORED_CONTAINERS = '.block-language-mermaid, .block-language-dataview, .block-language-dataviewjs, .block-language-query';

interface CachedTitleIndex {
	mtime: number;
	size: number;
	promise: Promise<FenceTitleIndex>;
}

const titleIndexCache = new WeakMap<TFile, CachedTitleIndex>();

/**
 * Add a toolbar and optional line numbers to fenced code blocks in reading view.
 *
 * Obsidian calls post-processors again on every render, so blocks are marked
 * with an attribute to keep the decoration from being added twice.
 *
 * Titles resolved from the section are applied synchronously. When section
 * information is unavailable, the toolbar is created immediately and the title
 * is inserted later, so the block is not delayed by a source read.
 */
export async function decorateCodeBlocks(
	container: HTMLElement,
	settings: CodeBlockProSettings,
	context?: MarkdownPostProcessorContext,
	app?: App,
): Promise<void> {
	if (
		!settings.showCopyButton &&
		!settings.showDownloadButton &&
		!settings.showLanguageLabel &&
		!settings.showLineNumbers &&
		!settings.showBlockTitle
	) {
		return;
	}

	for (const code of container.querySelectorAll<HTMLElement>('pre > code')) {
		const pre = code.parentElement;
		const parent = pre?.parentElement;

		if (
			!pre ||
			!parent ||
			pre.hasAttribute(PROCESSED_ATTRIBUTE) ||
			pre.hasAttribute(PENDING_ATTRIBUTE) ||
			pre.closest(IGNORED_CONTAINERS)
		) {
			continue;
		}

		const language = getLanguage(code);
		if (isIgnoredLanguage(language)) {
			continue;
		}

		const codeText = code.textContent ?? '';
		const lineCount = countLines(codeText);
		let title = '';
		let titleResolved = false;

		if (settings.showBlockTitle) {
			const match = context
				? findSectionTitle(context, [parent, pre, container], language, codeText)
				: { found: false, title: '' };

			title = match.title;
			titleResolved = match.found;
		}

		const showCollapse =
			lineCount > settings.collapseAfterLines &&
			lineCount > settings.collapsedLines;
		const willDecorateWithoutTitle =
			settings.showCopyButton ||
			settings.showDownloadButton ||
			settings.showLanguageLabel ||
			settings.showLineNumbers ||
			showCollapse;
		let resolveTitleLater = false;

		if (settings.showBlockTitle && !titleResolved) {
			if (willDecorateWithoutTitle) {
				resolveTitleLater = true;
			} else {
				pre.setAttribute(PENDING_ATTRIBUTE, 'true');

				try {
					const match = await resolveIndexedTitle(context, app, language, codeText);
					title = match.title;
					titleResolved = match.found;
				} finally {
					pre.removeAttribute(PENDING_ATTRIBUTE);
				}

				if (!pre.isConnected) {
					continue;
				}
			}
		}

		let wrapper: HTMLElement | null = null;
		const refreshBlock = (): void => {
			if (wrapper) {
				refreshCodeBlockMetrics(wrapper);
			}
		};
		const toolbar = createToolbar({
			settings,
			language,
			codeText,
			title,
			lineCount,
			collapsible: true,
			refreshable: settings.showLineNumbers,
			onRefresh: refreshBlock,
		});

		if (!toolbar && !settings.showLineNumbers) {
			continue;
		}

		pre.setAttribute(PROCESSED_ATTRIBUTE, 'true');

		wrapper = parent.createDiv({ cls: `${PREFIX}-block` });
		const block = wrapper;
		block.style.setProperty(`--${PREFIX}-collapsed-lines`, String(settings.collapsedLines));

		const scrollLines =
			settings.scrollAfterLines > 0
				? Math.max(settings.scrollAfterLines, settings.collapsedLines)
				: 0;

		if (scrollLines > 0 && lineCount > scrollLines) {
			block.addClass(`${PREFIX}-scrollable`);
		}

		block.style.setProperty(`--${PREFIX}-scroll-lines`, String(scrollLines));
		parent.insertBefore(block, pre);

		if (toolbar) {
			block.addClass(`${PREFIX}-has-toolbar`);
			block.appendChild(toolbar);
		}

		if (settings.showCopyButton) {
			block.addClass(`${PREFIX}-has-copy`);
		}

		const codeArea = block.createDiv({ cls: `${PREFIX}-code-area` });
		let gutter: HTMLElement | null = null;

		if (settings.showLineNumbers) {
			block.addClass(`${PREFIX}-with-line-numbers`);

			gutter = codeArea.createDiv({
				cls: `${PREFIX}-line-numbers`,
				attr: { 'aria-hidden': 'true' },
			});

			gutter.setText(buildLineNumbers(lineCount));
		}

		codeArea.appendChild(pre);
		syncCodeBlockMetrics(pre, code, gutter);

		if (resolveTitleLater) {
			void resolveIndexedTitle(context, app, language, codeText).then((match) => {
				if (!block.isConnected || !match.found || !match.title) {
					return;
				}

				if (toolbar && toolbar.isConnected) {
					addToolbarTitle(toolbar, match.title);
					return;
				}

				const lateToolbar = createToolbar({
					settings,
					language,
					codeText,
					title: match.title,
					lineCount,
					collapsible: true,
					refreshable: settings.showLineNumbers,
					onRefresh: refreshBlock,
				});

				if (!lateToolbar) {
					return;
				}

				block.insertBefore(lateToolbar, codeArea);
				block.addClass(`${PREFIX}-has-toolbar`);
			});
		}
	}
}

/**
 * Match the gutter and collapsed height to the rendered code metrics.
 *
 * Themes can override the code font size or line-height independently from
 * Obsidian's global variables. Reading those values after insertion keeps every
 * number on the same baseline and makes the configured collapsed line count
 * independent of the theme.
 */
function syncCodeBlockMetrics(
	pre: HTMLElement,
	code: HTMLElement,
	gutter: HTMLElement | null,
): void {
	const apply = (): void => {
		const view = pre.ownerDocument.defaultView;
		const preStyle = view?.getComputedStyle(pre) ?? getComputedStyle(pre);
		const codeStyle = view?.getComputedStyle(code) ?? getComputedStyle(code);
		const top = parseLength(preStyle.borderTopWidth) + parseLength(preStyle.paddingTop);
		const bottom = parseLength(preStyle.borderBottomWidth) + parseLength(preStyle.paddingBottom);
		const lineHeight = Math.max(parseLength(preStyle.lineHeight), parseLength(codeStyle.lineHeight));
		const area = pre.parentElement;

		if (area) {
			area.style.setProperty(
				'--cbp-code-line-height',
				lineHeight > 0 ? `${lineHeight}px` : codeStyle.lineHeight,
			);
			area.style.setProperty('--cbp-code-padding', `${top + bottom}px`);
		}

		if (gutter?.isConnected) {
			gutter.style.setProperty(
				'--cbp-gutter-line-height',
				lineHeight > 0 ? `${lineHeight}px` : codeStyle.lineHeight,
			);
			gutter.style.setProperty('--cbp-gutter-font-size', codeStyle.fontSize);
			gutter.style.setProperty('--cbp-gutter-font-family', codeStyle.fontFamily);
			gutter.style.setProperty('--cbp-gutter-padding-top', `${top}px`);
			gutter.style.setProperty('--cbp-gutter-padding-bottom', `${bottom}px`);
		}
	};

	apply();

	// The first render can happen before the theme styles are fully resolved.
	// Re-measure on the next frame so a themed line-height or padding is applied.
	pre.ownerDocument.defaultView?.requestAnimationFrame(() => {
		if (pre.isConnected) {
			apply();
		}
	});
}

function parseLength(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Recalculate the line-number gutter after a theme, font, or CSS change.
 *
 * This updates the existing DOM instead of rebuilding the block, preserving
 * collapse state, selection, and the rest of the toolbar.
 */
export function refreshCodeBlockMetrics(block: HTMLElement): void {
	const pre = block.querySelector<HTMLElement>(`.${PREFIX}-code-area > pre`);
	const code = pre?.querySelector<HTMLElement>('code');
	const gutter = block.querySelector<HTMLElement>(`.${PREFIX}-line-numbers`);

	if (!pre || !code) {
		return;
	}

	if (gutter) {
		gutter.setText(buildLineNumbers(countLines(code.textContent ?? '')));
	}

	syncCodeBlockMetrics(pre, code, gutter);
}

function buildLineNumbers(lineCount: number): string {
	return Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n');
}

function getLanguage(code: HTMLElement): string {
	const match = /(?:^|\s)language-([^\s]+)/.exec(code.className);
	return match?.[1] ?? '';
}

function findSectionTitle(
	context: MarkdownPostProcessorContext,
	elements: Array<HTMLElement | null>,
	language: string,
	codeText: string,
): FenceTitleMatch {
	for (const element of elements) {
		if (!element) {
			continue;
		}

		const text = getSectionText(context, element);
		if (text === null) {
			continue;
		}

		const match = findFenceTitleMatch(text, language, codeText);
		if (match.found) {
			return match;
		}
	}

	return { found: false, title: '' };
}

function getSectionText(
	context: MarkdownPostProcessorContext,
	element: HTMLElement,
): string | null {
	try {
		return context.getSectionInfo(element)?.text ?? null;
	} catch {
		return null;
	}
}

/**
 * Build the title index once per file and reuse it across blocks and render
 * passes. The cached entry is invalidated by the file's mtime and size.
 */
function getTitleIndex(
	context: MarkdownPostProcessorContext | undefined,
	app: App | undefined,
): Promise<FenceTitleIndex> {
	if (!context || !app || !context.sourcePath) {
		return Promise.resolve(new Map<string, string>());
	}

	const file = app.vault.getAbstractFileByPath(context.sourcePath);
	if (!(file instanceof TFile)) {
		return Promise.resolve(new Map<string, string>());
	}

	const { mtime, size } = file.stat;
	const cached = titleIndexCache.get(file);
	if (cached && cached.mtime === mtime && cached.size === size) {
		return cached.promise;
	}

	const promise = app.vault
		.cachedRead(file)
		.then((source) => buildFenceTitleIndex(source))
		.catch(() => new Map<string, string>());

	titleIndexCache.set(file, { mtime, size, promise });
	return promise;
}

async function resolveIndexedTitle(
	context: MarkdownPostProcessorContext | undefined,
	app: App | undefined,
	language: string,
	codeText: string,
): Promise<FenceTitleMatch> {
	const index = await getTitleIndex(context, app);
	return findIndexedTitle(index, language, codeText);
}
