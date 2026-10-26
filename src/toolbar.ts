import { Notice, setIcon, setTooltip } from 'obsidian';
import type { CodeBlockProSettings } from './settings';

const PREFIX = 'cbp';
const COPIED_FEEDBACK_MS = 1500;

/**
 * Build the toolbar shown above a code block.
 *
 * Returns null when the current settings would render an empty toolbar, so
 * callers can skip the block entirely.
 */
export function createToolbar(
	settings: CodeBlockProSettings,
	language: string,
	codeText: string,
): HTMLElement | null {
	if (!settings.showCopyButton && !(settings.showLanguageLabel && language)) {
		return null;
	}

	const toolbar = createDiv({ cls: `${PREFIX}-toolbar` });

	if (settings.showLanguageLabel && language) {
		toolbar.addClass(`${PREFIX}-toolbar--with-language`);
		toolbar.createSpan({ cls: `${PREFIX}-language`, text: language });
	}

	if (settings.showCopyButton) {
		addCopyButton(toolbar, codeText, language);
	}

	return toolbar;
}

function addCopyButton(toolbar: HTMLElement, codeText: string, language: string): void {
	const actions = toolbar.createDiv({ cls: `${PREFIX}-actions` });
	const button = actions.createEl('button', {
		cls: `${PREFIX}-copy`,
		attr: { type: 'button' },
	});
	const status = actions.createSpan({
		cls: `${PREFIX}-status`,
		attr: {
			role: 'status',
			'aria-live': 'polite',
			'aria-atomic': 'true',
		},
	});

	const label = getCopyLabel(language);

	setIcon(button, 'copy');
	setTooltip(button, label);
	button.setAttribute('aria-label', label);

	button.addEventListener('click', () => {
		void copyCode(codeText, button, status, language);
	});
}

async function copyCode(
	codeText: string,
	button: HTMLButtonElement,
	status: HTMLElement,
	language: string,
): Promise<void> {
	try {
		await navigator.clipboard.writeText(codeText);
	} catch {
		new Notice('Could not copy the code block.');
		return;
	}

	button.addClass('is-copied');
	setIcon(button, 'check');
	setTooltip(button, 'Copied');
	button.setAttribute('aria-label', 'Copied');
	status.setText('Copied to clipboard');

	window.setTimeout(() => {
		button.removeClass('is-copied');
		setIcon(button, 'copy');
		setTooltip(button, getCopyLabel(language));
		button.setAttribute('aria-label', getCopyLabel(language));
		status.setText('');
	}, COPIED_FEEDBACK_MS);
}

function getCopyLabel(language: string): string {
	return language ? `Copy ${language} code block` : 'Copy code block';
}
