import { normalizeLanguage } from './language';

const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)(?:\s+(.*))?$/;

export interface FenceInfo {
	fence: string;
	language: string;
	title: string;
}

export interface FenceTitleMatch {
	found: boolean;
	title: string;
}

export type FenceTitleIndex = Map<string, string>;

interface ScannedFence {
	language: string;
	title: string;
	code: string;
}

export function parseFenceLine(line: string): FenceInfo | null {
	const match = FENCE_OPEN_PATTERN.exec(line);
	const fence = match?.[1];

	if (!fence) {
		return null;
	}

	return {
		fence,
		language: match[2] ?? '',
		title: (match[3] ?? '').trim(),
	};
}

export function isClosingFence(line: string, fence: string): boolean {
	const trimmed = line.trim();

	if (trimmed.length < fence.length) {
		return false;
	}

	const char = fence.charAt(0);
	for (const value of trimmed) {
		if (value !== char) {
			return false;
		}
	}

	return true;
}

/**
 * Find the title of the fenced block that matches the rendered language and
 * code. Reading view only exposes the language class, so the source section is
 * matched by content.
 */
export function findFenceTitleMatch(
	source: string,
	language: string,
	codeText: string,
): FenceTitleMatch {
	const expectedCode = normalizeCode(codeText);
	let result: FenceTitleMatch = { found: false, title: '' };

	scanFences(source, normalizeLanguage(language), (fence) => {
		if (normalizeCode(fence.code) === expectedCode) {
			result = { found: true, title: fence.title };
			return true;
		}

		return false;
	});

	return result;
}

/**
 * Build a one-time lookup table for every fence in a source file. Reading view
 * can then resolve many blocks without rescanning the file for each one.
 */
export function buildFenceTitleIndex(source: string): FenceTitleIndex {
	const index: FenceTitleIndex = new Map();

	scanFences(source, undefined, (fence) => {
		const key = titleKey(fence.language, fence.code);

		if (!index.has(key)) {
			index.set(key, fence.title);
		}

		return false;
	});

	return index;
}

export function findIndexedTitle(
	index: FenceTitleIndex,
	language: string,
	codeText: string,
): FenceTitleMatch {
	const key = titleKey(language, codeText);

	if (!index.has(key)) {
		return { found: false, title: '' };
	}

	return { found: true, title: index.get(key) ?? '' };
}

function titleKey(language: string, codeText: string): string {
	return `${normalizeLanguage(language)}\u0000${normalizeCode(codeText)}`;
}

/**
 * Visit every fence in the source. When a language filter is provided, code is
 * only collected for fences with that language, avoiding unnecessary copies.
 */
function scanFences(
	source: string,
	languageFilter: string | undefined,
	visit: (fence: ScannedFence) => boolean | void,
): void {
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	let index = 0;

	while (index < lines.length) {
		const info = parseFenceLine(lines[index] ?? '');

		if (!info) {
			index++;
			continue;
		}

		const language = normalizeLanguage(info.language);
		const matchesLanguage = languageFilter === undefined || language === languageFilter;
		const codeLines: string[] = [];
		let end = index + 1;

		for (; end < lines.length; end++) {
			const line = lines[end] ?? '';

			if (isClosingFence(line, info.fence)) {
				break;
			}

			if (matchesLanguage) {
				codeLines.push(line);
			}
		}

		if (matchesLanguage) {
			const stop = visit({
				language,
				title: info.title,
				code: codeLines.join('\n'),
			});

			if (stop) {
				return;
			}
		}

		index = end + 1;
	}
}

function normalizeCode(text: string): string {
	return text
		.replace(/\r\n?/g, '\n')
		.replace(/\u00a0/g, ' ')
		.replace(/\t/g, '    ')
		.replace(/[ \t]+$/gm, '')
		.replace(/^\n+/, '')
		.replace(/\n+$/, '');
}
