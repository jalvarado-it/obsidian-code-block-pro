import { isIgnoredLanguage } from './language';
import type { CodeBlockProSettings } from './settings';
import { countLines, createToolbar } from './toolbar';

const PREFIX = 'cbp';
const PROCESSED_ATTRIBUTE = 'data-code-block-pro';
const IGNORED_CONTAINERS = '.block-language-mermaid, .block-language-dataview, .block-language-dataviewjs, .block-language-query';

/**
 * Add a toolbar and optional line numbers to fenced code blocks in reading view.
 *
 * Obsidian calls post-processors again on every render, so blocks are marked
 * with an attribute to keep the decoration from being added twice.
 */
export function decorateCodeBlocks(container: HTMLElement, settings: CodeBlockProSettings): void {
	if (!settings.showCopyButton && !settings.showLanguageLabel && !settings.showLineNumbers) {
		return;
	}

	for (const code of container.querySelectorAll<HTMLElement>('pre > code')) {
		const pre = code.parentElement;
		const parent = pre?.parentElement;

		if (!pre || !parent || pre.hasAttribute(PROCESSED_ATTRIBUTE) || pre.closest(IGNORED_CONTAINERS)) {
			continue;
		}

		const language = getLanguage(code);
		if (isIgnoredLanguage(language)) {
			continue;
		}

		const codeText = code.textContent ?? '';
		let wrapper: HTMLElement | null = null;
		const toolbar = createToolbar({
			settings,
			language,
			codeText,
			collapsible: true,
			refreshable: settings.showLineNumbers,
			onRefresh: () => {
				if (wrapper) {
					refreshCodeBlockMetrics(wrapper);
				}
			},
		});

		if (!toolbar && !settings.showLineNumbers) {
			continue;
		}

		pre.setAttribute(PROCESSED_ATTRIBUTE, 'true');

		wrapper = parent.createDiv({ cls: `${PREFIX}-block` });
		wrapper.style.setProperty(`--${PREFIX}-collapsed-lines`, String(settings.collapsedLines));
		parent.insertBefore(wrapper, pre);

		if (toolbar) {
			wrapper.addClass(`${PREFIX}-has-toolbar`);
			wrapper.appendChild(toolbar);
		}

		if (settings.showCopyButton) {
			wrapper.addClass(`${PREFIX}-has-copy`);
		}

		const codeArea = wrapper.createDiv({ cls: `${PREFIX}-code-area` });
		let gutter: HTMLElement | null = null;

		if (settings.showLineNumbers) {
			wrapper.addClass(`${PREFIX}-with-line-numbers`);

			gutter = codeArea.createDiv({
				cls: `${PREFIX}-line-numbers`,
				attr: { 'aria-hidden': 'true' },
			});

			gutter.setText(buildLineNumbers(countLines(codeText)));
		}

		codeArea.appendChild(pre);
		syncCodeBlockMetrics(pre, code, gutter);
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
