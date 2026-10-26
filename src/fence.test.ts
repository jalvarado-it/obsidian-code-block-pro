import { describe, expect, it } from 'vitest';
import {
	buildFenceTitleIndex,
	findFenceTitleMatch,
	findIndexedTitle,
	isClosingFence,
	parseFenceLine,
	parseSourceFenceLine,
	stripFencePrefix,
} from './fence';

function source(lines: string[]): string {
	return lines.join('\n');
}

describe('parseFenceLine', () => {
	it('parses a language and title', () => {
		expect(parseFenceLine('```javascript TITULO DEL BLOQUE')).toEqual({
			prefix: '',
			fence: '```',
			language: 'javascript',
			title: 'TITULO DEL BLOQUE',
		});
	});

	it('keeps the leading indentation as the prefix', () => {
		expect(parseFenceLine('  ```ts')).toEqual({
			prefix: '  ',
			fence: '```',
			language: 'ts',
			title: '',
		});
	});

	it('returns an empty language and title for a bare fence', () => {
		expect(parseFenceLine('```')).toEqual({
			prefix: '',
			fence: '```',
			language: '',
			title: '',
		});
	});

	it('ignores non-fence lines', () => {
		expect(parseFenceLine('not a fence')).toBeNull();
	});
});

describe('parseSourceFenceLine', () => {
	it('parses blockquote fences', () => {
		expect(parseSourceFenceLine('> ```css QUOTE TITLE')).toEqual({
			prefix: '> ',
			fence: '```',
			language: 'css',
			title: 'QUOTE TITLE',
		});
	});

	it('parses indented list fences', () => {
		expect(parseSourceFenceLine('    ```python LIST TITLE')).toEqual({
			prefix: '    ',
			fence: '```',
			language: 'python',
			title: 'LIST TITLE',
		});
	});
});

describe('isClosingFence', () => {
	it('accepts a fence of the same or greater length', () => {
		expect(isClosingFence('```', '```')).toBe(true);
		expect(isClosingFence('````', '```')).toBe(true);
	});

	it('rejects shorter fences, info strings, and other fence characters', () => {
		expect(isClosingFence('``', '```')).toBe(false);
		expect(isClosingFence('```js', '```')).toBe(false);
		expect(isClosingFence('~~~', '```')).toBe(false);
	});
});

describe('stripFencePrefix', () => {
	it('strips blockquote and list prefixes', () => {
		expect(stripFencePrefix('> const value = 1;', '> ')).toBe('const value = 1;');
		expect(stripFencePrefix('    print(1)', '    ')).toBe('print(1)');
	});

	it('handles empty blockquote lines and preserved extra indentation', () => {
		expect(stripFencePrefix('>', '> ')).toBe('');
		expect(stripFencePrefix('>     indented', '> ')).toBe('    indented');
	});

	it('leaves lines that do not have the prefix unchanged', () => {
		expect(stripFencePrefix('const value = 1;', '  ')).toBe('const value = 1;');
	});
});

describe('findFenceTitleMatch', () => {
	const block = source(['```javascript PRUEBA', 'const value = 1;', '```']);

	it('finds a title by language and code', () => {
		expect(findFenceTitleMatch(block, 'javascript', 'const value = 1;')).toEqual({
			found: true,
			title: 'PRUEBA',
		});
	});

	it('normalizes trailing newlines and CRLF', () => {
		expect(findFenceTitleMatch(block, 'javascript', 'const value = 1;\n')).toEqual({
			found: true,
			title: 'PRUEBA',
		});

		const crlf = block.replace(/\n/g, '\r\n');
		expect(findFenceTitleMatch(crlf, 'javascript', 'const value = 1;')).toEqual({
			found: true,
			title: 'PRUEBA',
		});
	});

	it('matches aliases and code with tabs', () => {
		const tabbed = source(['```js TAB TITLE', '\tconst value = 1;', '```']);
		expect(findFenceTitleMatch(tabbed, 'javascript', '\tconst value = 1;')).toEqual({
			found: true,
			title: 'TAB TITLE',
		});
	});

	it('matches blocks inside blockquotes', () => {
		const quote = source(['> ```css QUOTE TITLE', '> body { color: red; }', '> ```']);
		expect(findFenceTitleMatch(quote, 'css', 'body { color: red; }')).toEqual({
			found: true,
			title: 'QUOTE TITLE',
		});
	});

	it('matches blocks inside indented lists', () => {
		const list = source([
			'1. item',
			'',
			'    ```python LIST TITLE',
			'    print(1)',
			'    ```',
		]);
		expect(findFenceTitleMatch(list, 'python', 'print(1)')).toEqual({
			found: true,
			title: 'LIST TITLE',
		});
	});

	it('reports a matching block with no title', () => {
		const untitled = source(['```javascript', 'const value = 1;', '```']);
		expect(findFenceTitleMatch(untitled, 'javascript', 'const value = 1;')).toEqual({
			found: true,
			title: '',
		});
	});

	it('reports no match when the content differs', () => {
		expect(findFenceTitleMatch(block, 'javascript', 'const other = 2;')).toEqual({
			found: false,
			title: '',
		});
	});

	it('returns the first title for duplicate blocks', () => {
		const duplicate = source([
			'```javascript PRIMERO',
			'const value = 1;',
			'```',
			'',
			'```javascript SEGUNDO',
			'const value = 1;',
			'```',
		]);
		expect(findFenceTitleMatch(duplicate, 'javascript', 'const value = 1;')).toEqual({
			found: true,
			title: 'PRIMERO',
		});
	});
});

describe('fence title index', () => {
	const blocks = source([
		'```javascript PRIMERO',
		'const one = 1;',
		'```',
		'',
		'```typescript SEGUNDO',
		'const two = 2;',
		'```',
		'',
		'```python',
		'print(3)',
		'```',
	]);

	it('indexes every fence once', () => {
		const index = buildFenceTitleIndex(blocks);
		expect(index.size).toBe(3);
	});

	it('resolves titles and empty titles', () => {
		const index = buildFenceTitleIndex(blocks);
		expect(findIndexedTitle(index, 'js', 'const one = 1;')).toEqual({
			found: true,
			title: 'PRIMERO',
		});
		expect(findIndexedTitle(index, 'typescript', 'const two = 2;')).toEqual({
			found: true,
			title: 'SEGUNDO',
		});
		expect(findIndexedTitle(index, 'python', 'print(3)')).toEqual({
			found: true,
			title: '',
		});
	});

	it('reports an unknown block', () => {
		const index = buildFenceTitleIndex(blocks);
		expect(findIndexedTitle(index, 'python', 'print(4)')).toEqual({
			found: false,
			title: '',
		});
	});
});
