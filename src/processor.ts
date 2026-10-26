import type { CodeBlockProSettings } from './settings';
import { createToolbar } from './toolbar';

const PREFIX = 'cbp';
const PROCESSED_ATTRIBUTE = 'data-code-block-pro';

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

		if (!pre || !parent || pre.hasAttribute(PROCESSED_ATTRIBUTE)) {
			continue;
		}

		const codeText = code.textContent ?? '';
		const language = getLanguage(code);
		const toolbar = createToolbar(settings, language, codeText);

		if (!toolbar && !settings.showLineNumbers) {
			continue;
		}

		pre.setAttribute(PROCESSED_ATTRIBUTE, 'true');

		const wrapper = parent.createDiv({ cls: `${PREFIX}-block` });
		parent.insertBefore(wrapper, pre);

		if (toolbar) {
			wrapper.addClass(`${PREFIX}-has-toolbar`);
			wrapper.appendChild(toolbar);
		}

		if (settings.showLineNumbers) {
			wrapper.addClass(`${PREFIX}-with-line-numbers`);

			const codeArea = wrapper.createDiv({ cls: `${PREFIX}-code-area` });
			const gutter = codeArea.createDiv({
				cls: `${PREFIX}-line-numbers`,
				attr: { 'aria-hidden': 'true' },
			});

			gutter.setText(buildLineNumbers(codeText));
			codeArea.appendChild(pre);
		} else {
			wrapper.appendChild(pre);
		}
	}
}

function buildLineNumbers(codeText: string): string {
	const trimmed = codeText.endsWith('\n') ? codeText.slice(0, -1) : codeText;
	const lineCount = Math.max(1, trimmed.split('\n').length);
	return Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n');
}

function getLanguage(code: HTMLElement): string {
	const match = /(?:^|\s)language-([^\s]+)/.exec(code.className);
	return match?.[1] ?? '';
}
