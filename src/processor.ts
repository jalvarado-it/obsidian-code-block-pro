import type { CodeBlockProSettings } from './settings';
import { createToolbar } from './toolbar';

const PREFIX = 'cbp';
const PROCESSED_ATTRIBUTE = 'data-code-block-pro';

/**
 * Add a toolbar above each rendered fenced code block in reading view.
 *
 * Obsidian calls post-processors again on every render, so blocks are marked
 * with an attribute to keep the toolbar from being added twice.
 */
export function decorateCodeBlocks(container: HTMLElement, settings: CodeBlockProSettings): void {
	if (!settings.showCopyButton && !settings.showLanguageLabel) {
		return;
	}

	for (const code of container.querySelectorAll<HTMLElement>('pre > code')) {
		const pre = code.parentElement;
		const parent = pre?.parentElement;

		if (!pre || !parent || pre.hasAttribute(PROCESSED_ATTRIBUTE)) {
			continue;
		}

		const language = getLanguage(code);
		const toolbar = createToolbar(settings, language, code.textContent ?? '');

		if (!toolbar) {
			continue;
		}

		pre.setAttribute(PROCESSED_ATTRIBUTE, 'true');

		const wrapper = parent.createDiv({ cls: `${PREFIX}-block` });
		parent.insertBefore(wrapper, pre);
		wrapper.appendChild(pre);
		wrapper.insertBefore(toolbar, pre);
	}
}

function getLanguage(code: HTMLElement): string {
	const match = /(?:^|\s)language-([^\s]+)/.exec(code.className);
	return match?.[1] ?? '';
}
