import { Notice } from 'obsidian';
import type { CodeBlockProSettings } from './settings';

const PREFIX = 'cbp';
const PROCESSED_ATTRIBUTE = 'data-code-block-pro';

/**
 * Add a toolbar above each rendered fenced code block.
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

		pre.setAttribute(PROCESSED_ATTRIBUTE, 'true');

		const wrapper = parent.createDiv({ cls: `${PREFIX}-block` });
		parent.insertBefore(wrapper, pre);
		wrapper.appendChild(pre);

		const toolbar = wrapper.createDiv({ cls: `${PREFIX}-toolbar` });
		wrapper.insertBefore(toolbar, pre);

		const language = getLanguage(code);

		if (settings.showLanguageLabel && language) {
			toolbar.createSpan({ cls: `${PREFIX}-language`, text: language });
		}

		if (settings.showCopyButton) {
			addCopyButton(toolbar, code, language);
		}
	}
}

function getLanguage(code: HTMLElement): string {
	const match = /(?:^|\s)language-([^\s]+)/.exec(code.className);
	return match?.[1] ?? '';
}

function addCopyButton(toolbar: HTMLElement, code: HTMLElement, language: string): void {
	const button = toolbar.createEl('button', {
		cls: `${PREFIX}-copy`,
		text: 'Copy',
		attr: {
			type: 'button',
			'aria-label': getCopyLabel(language),
		},
	});

	button.addEventListener('click', () => {
		void copyCode(code, button, language);
	});
}

async function copyCode(code: HTMLElement, button: HTMLButtonElement, language: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(code.textContent ?? '');
	} catch {
		new Notice('Could not copy the code block.');
		return;
	}

	button.setText('Copied');

	window.setTimeout(() => {
		button.setText('Copy');
		button.setAttribute('aria-label', getCopyLabel(language));
	}, 1500);
}

function getCopyLabel(language: string): string {
	return language ? `Copy ${language} code block` : 'Copy code block';
}
