import { Notice, setIcon, setTooltip } from 'obsidian';
import {
	getLanguageBadge,
	getLanguageIconId,
	getLanguageLabel,
	normalizeLanguage,
} from './language';
import type { CodeBlockProSettings } from './settings';

const PREFIX = 'cbp';
const COPIED_FEEDBACK_MS = 1500;
const COLLAPSE_LINE_THRESHOLD = 24;

export interface ToolbarOptions {
	settings: CodeBlockProSettings;
	language: string;
	codeText: string;
	collapsible?: boolean;
	refreshable?: boolean;
	onRefresh?: () => void;
}

/**
 * Build the toolbar shown above a code block.
 *
 * Returns null when the current settings would render an empty toolbar, so
 * callers can skip the block entirely.
 */
export function createToolbar(options: ToolbarOptions): HTMLElement | null {
	const { settings, codeText, collapsible = false } = options;
	const displayLanguage = getLanguageLabel(options.language);
	const normalizedLanguage = normalizeLanguage(options.language) || 'text';
	const showLanguage = settings.showLanguageLabel;
	const showCollapse = collapsible && countLines(codeText) > COLLAPSE_LINE_THRESHOLD;
	const refresh = options.onRefresh;
	const showRefresh =
		options.refreshable === true &&
		typeof refresh === 'function' &&
		(settings.showCopyButton || showLanguage || showCollapse);

	if (!settings.showCopyButton && !showLanguage && !showCollapse) {
		return null;
	}

	const toolbar = createDiv({ cls: `${PREFIX}-toolbar` });

	if (showLanguage) {
		const languageEl = toolbar.createDiv({ cls: `${PREFIX}-language` });

		languageEl.createSpan({
			cls: `${PREFIX}-language-badge`,
			text: getLanguageBadge(options.language),
			attr: {
				'aria-hidden': 'true',
				'data-language': normalizedLanguage,
			},
		});

		const pill = languageEl.createDiv({ cls: `${PREFIX}-language-pill` });
		const iconEl = pill.createSpan({
			cls: `${PREFIX}-language-icon`,
			attr: { 'aria-hidden': 'true' },
		});

		setLanguageIcon(iconEl, displayLanguage);
		pill.createSpan({ cls: `${PREFIX}-language-label`, text: displayLanguage });
	}

	if (settings.showCopyButton || showCollapse || showRefresh) {
		const actions = toolbar.createDiv({ cls: `${PREFIX}-actions` });

		if (showRefresh && refresh) {
			addRefreshButton(actions, refresh);
		}

		if (settings.showCopyButton) {
			addCopyButton(actions, codeText, displayLanguage);
		}

		if (showCollapse) {
			addCollapseButton(actions);
		}
	}

	return toolbar;
}

export function countLines(codeText: string): number {
	const trimmed = codeText.endsWith('\n') ? codeText.slice(0, -1) : codeText;
	return Math.max(1, trimmed.split('\n').length);
}

function setLanguageIcon(iconEl: HTMLElement, language: string): void {
	setIcon(iconEl, getLanguageIconId(language));

	if (!iconEl.querySelector('svg')) {
		setIcon(iconEl, 'code-2');
	}

	if (!iconEl.querySelector('svg')) {
		iconEl.setText('</>');
	}
}

function addRefreshButton(actions: HTMLElement, onRefresh: () => void): void {
	const label = 'Refresh line numbers';
	const button = createIconButton(actions, `${PREFIX}-refresh`, 'refresh-cw', label);
	let feedbackTimer: number | undefined;

	button.addEventListener('click', () => {
		onRefresh();
		button.addClass('is-refreshing');

		if (feedbackTimer !== undefined) {
			window.clearTimeout(feedbackTimer);
		}

		feedbackTimer = window.setTimeout(() => {
			button.removeClass('is-refreshing');
			feedbackTimer = undefined;
		}, 450);
	});
}

function addCopyButton(actions: HTMLElement, codeText: string, language: string): void {
	const label = getCopyLabel(language);
	const button = actions.createEl('button', {
		cls: `${PREFIX}-icon-button ${PREFIX}-copy`,
		attr: {
			type: 'button',
			'aria-label': label,
		},
	});
	const iconEl = button.createSpan({
		cls: `${PREFIX}-button-icon`,
		attr: { 'aria-hidden': 'true' },
	});
	const labelEl = button.createSpan({ cls: `${PREFIX}-button-label`, text: 'Copy' });
	const status = actions.createSpan({
		cls: `${PREFIX}-status`,
		attr: {
			role: 'status',
			'aria-live': 'polite',
			'aria-atomic': 'true',
		},
	});

	setIcon(iconEl, 'copy');
	setTooltip(button, label);

	button.addEventListener('click', () => {
		void copyCode(codeText, button, iconEl, labelEl, status, language);
	});
}

function addCollapseButton(actions: HTMLElement): void {
	const label = 'Collapse code block';
	const button = createIconButton(actions, `${PREFIX}-collapse`, 'chevron-down', label);

	button.setAttribute('aria-expanded', 'true');

	button.addEventListener('click', () => {
		const block = button.closest(`.${PREFIX}-block`);

		if (!block) {
			return;
		}

		const collapsed = block.classList.toggle('is-collapsed');
		const nextLabel = collapsed ? 'Expand code block' : label;

		setIcon(button, collapsed ? 'chevron-up' : 'chevron-down');
		setTooltip(button, nextLabel);
		button.setAttribute('aria-label', nextLabel);
		button.setAttribute('aria-expanded', String(!collapsed));
	});
}

function createIconButton(
	parent: HTMLElement,
	className: string,
	icon: string,
	label: string,
): HTMLButtonElement {
	const button = parent.createEl('button', {
		cls: `${PREFIX}-icon-button ${className}`,
		attr: {
			type: 'button',
			'aria-label': label,
		},
	});

	setIcon(button, icon);
	setTooltip(button, label);
	return button;
}

async function copyCode(
	codeText: string,
	button: HTMLButtonElement,
	iconEl: HTMLElement,
	labelEl: HTMLElement,
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
	setIcon(iconEl, 'check');
	labelEl.setText('Copied');
	setTooltip(button, 'Copied');
	button.setAttribute('aria-label', 'Copied');
	status.setText('Copied to clipboard');

	window.setTimeout(() => {
		const label = getCopyLabel(language);

		button.removeClass('is-copied');
		setIcon(iconEl, 'copy');
		labelEl.setText('Copy');
		setTooltip(button, label);
		button.setAttribute('aria-label', label);
		status.setText('');
	}, COPIED_FEEDBACK_MS);
}

function getCopyLabel(language: string): string {
	return language === 'text' ? 'Copy code block' : `Copy ${language} code block`;
}
