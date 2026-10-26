import { normalizeLanguage } from './language';

const FENCE_OPEN_PATTERN = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)(?:\s+(.*))?$/;

export interface FenceInfo {
	fence: string;
	language: string;
	title: string;
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
export interface FenceTitleMatch {
	found: boolean;
	title: string;
}

export function findFenceTitleMatch(
	source: string,
	language: string,
	codeText: string,
): FenceTitleMatch {
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	const expectedLanguage = normalizeLanguage(language);
	const expectedCode = normalizeCode(codeText);
	let index = 0;

	while (index < lines.length) {
		const info = parseFenceLine(lines[index] ?? '');

		if (!info) {
			index++;
			continue;
		}

		const codeLines: string[] = [];
		let end = index + 1;

		for (; end < lines.length; end++) {
			const line = lines[end] ?? '';

			if (isClosingFence(line, info.fence)) {
				break;
			}

			codeLines.push(line);
		}

		if (
			normalizeLanguage(info.language) === expectedLanguage &&
			normalizeCode(codeLines.join('\n')) === expectedCode
		) {
			return { found: true, title: info.title };
		}

		index = end + 1;
	}

	return { found: false, title: '' };
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
