import { Notice, setIcon, setTooltip } from 'obsidian';
import {
	getLanguageBadge,
	getLanguageExtension,
	getLanguageIconId,
	getLanguageLabel,
	normalizeLanguage,
} from './language';
import type { CodeBlockProSettings } from './settings';

const PREFIX = 'cbp';
const COPIED_FEEDBACK_MS = 1500;

interface CopyFeedbackState {
	timer?: number;
}

export interface ToolbarOptions {
	settings: CodeBlockProSettings;
	language: string;
	codeText: string;
	title?: string;
	lineCount?: number;
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
	const showDownload = settings.showDownloadButton;
	const displayTitle = settings.showBlockTitle ? (options.title ?? '').trim() : '';
	const lineCount = options.lineCount ?? (collapsible ? countLines(codeText) : 0);
	const showCollapse =
		collapsible &&
		lineCount > settings.collapseAfterLines &&
		lineCount > settings.collapsedLines;
	const refresh = options.onRefresh;
	const showRefresh =
		options.refreshable === true &&
		typeof refresh === 'function' &&
		(settings.showCopyButton || showLanguage || showCollapse || showDownload || !!displayTitle);

	if (
		!settings.showCopyButton &&
		!showLanguage &&
		!showCollapse &&
		!showDownload &&
		!displayTitle
	) {
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

	if (displayTitle) {
		addToolbarTitle(toolbar, displayTitle);
	}

	if (settings.showCopyButton || showCollapse || showRefresh || showDownload) {
		const actions = toolbar.createDiv({ cls: `${PREFIX}-actions` });

		if (showRefresh && refresh) {
			addRefreshButton(actions, refresh);
		}

		if (settings.showCopyButton) {
			addCopyButton(actions, codeText, displayLanguage);
		}

		if (showDownload) {
			addDownloadButton(actions, codeText, options.language);
		}

		if (showCollapse) {
			addCollapseButton(actions);
		}
	}

	return toolbar;
}

/**
 * Add the optional block title after the language pill and before the actions.
 * Used both when the toolbar is created and when a deferred title resolves.
 */
export function addToolbarTitle(toolbar: HTMLElement, title: string): void {
	const displayTitle = title.trim();

	if (!displayTitle || toolbar.querySelector(`.${PREFIX}-title`)) {
		return;
	}

	const titleEl = toolbar.createDiv({ cls: `${PREFIX}-title`, text: displayTitle });
	const actions = toolbar.querySelector(`.${PREFIX}-actions`);

	setTooltip(titleEl, displayTitle);

	if (actions) {
		toolbar.insertBefore(titleEl, actions);
	}
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
	const feedback: CopyFeedbackState = {};
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
		void copyCode(codeText, button, iconEl, status, language, feedback);
	});
}

function addDownloadButton(actions: HTMLElement, codeText: string, language: string): void {
	const button = createIconButton(actions, `${PREFIX}-download`, 'download', 'Download code');

	button.addEventListener('click', () => {
		downloadCode(codeText, language, button.ownerDocument);
	});
}

function downloadCode(codeText: string, language: string, doc: Document): void {
	const filename = `code.${getLanguageExtension(language)}`;
	const blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' });
	const urlApi = doc.defaultView?.URL ?? URL;
	const url = urlApi.createObjectURL(blob);
	const anchor = doc.body.createEl('a', {
		attr: {
			href: url,
			download: filename,
			hidden: '',
		},
	});

	anchor.click();
	anchor.remove();

	window.setTimeout(() => {
		urlApi.revokeObjectURL(url);
	}, 0);
}

function addCollapseButton(actions: HTMLElement): void {
	const button = createIconButton(
		actions,
		`${PREFIX}-collapse`,
		'chevron-down',
		'Collapse code block',
	);

	button.setAttribute('aria-expanded', 'true');

	button.addEventListener('click', () => {
		const block = button.closest<HTMLElement>(`.${PREFIX}-block`);

		if (!block) {
			return;
		}

		setCollapsed(block, !block.classList.contains('is-collapsed'));
	});
}

/**
 * Apply a collapse state to an existing block and keep its control in sync.
 * Shared by the collapse button and the state restoration after a rerender.
 */
export function setCollapsed(block: HTMLElement, collapsed: boolean): void {
	block.classList.toggle('is-collapsed', collapsed);

	const area = block.querySelector<HTMLElement>(`.${PREFIX}-code-area`);

	if (area) {
		area.scrollTop = 0;
	}

	const button = block.querySelector<HTMLButtonElement>(`.${PREFIX}-collapse`);

	if (!button) {
		return;
	}

	const label = collapsed ? 'Expand code block' : 'Collapse code block';

	setIcon(button, collapsed ? 'chevron-up' : 'chevron-down');
	setTooltip(button, label);
	button.setAttribute('aria-label', label);
	button.setAttribute('aria-expanded', String(!collapsed));
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
	status: HTMLElement,
	language: string,
	feedback: CopyFeedbackState,
): Promise<void> {
	try {
		await navigator.clipboard.writeText(codeText);
	} catch {
		new Notice('Could not copy the code block.');
		return;
	}

	button.addClass('is-copied');
	setIcon(iconEl, 'check');
	setTooltip(button, 'Copied');
	button.setAttribute('aria-label', 'Copied');
	status.setText('Copied to clipboard');

	if (feedback.timer !== undefined) {
		window.clearTimeout(feedback.timer);
	}

	feedback.timer = window.setTimeout(() => {
		const label = getCopyLabel(language);

		button.removeClass('is-copied');
		setIcon(iconEl, 'copy');
		setTooltip(button, label);
		button.setAttribute('aria-label', label);
		status.setText('');
		feedback.timer = undefined;
	}, COPIED_FEEDBACK_MS);
}

function getCopyLabel(language: string): string {
	return language === 'text' ? 'Copy code block' : `Copy ${language} code block`;
}
