const IGNORED_LANGUAGES = new Set(['mermaid', 'dataview', 'dataviewjs', 'query']);

const LANGUAGE_ALIASES: Record<string, string> = {
	js: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	ts: 'typescript',
	py: 'python',
	rb: 'ruby',
	sh: 'shell',
	bash: 'shell',
	zsh: 'shell',
	fish: 'shell',
	ps1: 'powershell',
	pwsh: 'powershell',
	yml: 'yaml',
	md: 'markdown',
	'c#': 'csharp',
	cs: 'csharp',
	'c++': 'cpp',
	golang: 'go',
	kt: 'kotlin',
	rs: 'rust',
	txt: 'text',
	plain: 'text',
	plaintext: 'text',
};

interface LanguageMetadata {
	icon: string;
	badge: string;
	extension: string;
}

const LANGUAGE_METADATA: Record<string, LanguageMetadata> = {
	javascript: { icon: 'file-code-2', badge: 'JS', extension: 'js' },
	typescript: { icon: 'file-code-2', badge: 'TS', extension: 'ts' },
	jsx: { icon: 'file-code-2', badge: 'JSX', extension: 'jsx' },
	tsx: { icon: 'file-code-2', badge: 'TSX', extension: 'tsx' },
	python: { icon: 'file-code-2', badge: 'PY', extension: 'py' },
	java: { icon: 'file-code-2', badge: 'JAVA', extension: 'java' },
	c: { icon: 'file-code-2', badge: 'C', extension: 'c' },
	cpp: { icon: 'file-code-2', badge: 'C++', extension: 'cpp' },
	csharp: { icon: 'file-code-2', badge: 'C#', extension: 'cs' },
	go: { icon: 'file-code-2', badge: 'GO', extension: 'go' },
	rust: { icon: 'file-code-2', badge: 'RS', extension: 'rs' },
	ruby: { icon: 'file-code-2', badge: 'RB', extension: 'rb' },
	php: { icon: 'file-code-2', badge: 'PHP', extension: 'php' },
	swift: { icon: 'file-code-2', badge: 'SW', extension: 'swift' },
	kotlin: { icon: 'file-code-2', badge: 'KT', extension: 'kt' },
	scala: { icon: 'file-code-2', badge: 'SC', extension: 'scala' },
	lua: { icon: 'file-code-2', badge: 'LUA', extension: 'lua' },
	r: { icon: 'file-code-2', badge: 'R', extension: 'r' },
	dart: { icon: 'file-code-2', badge: 'DT', extension: 'dart' },
	elixir: { icon: 'file-code-2', badge: 'EX', extension: 'ex' },
	erlang: { icon: 'file-code-2', badge: 'ER', extension: 'erl' },
	haskell: { icon: 'file-code-2', badge: 'HS', extension: 'hs' },
	clojure: { icon: 'file-code-2', badge: 'CLJ', extension: 'clj' },
	perl: { icon: 'file-code-2', badge: 'PL', extension: 'pl' },
	objective: { icon: 'file-code-2', badge: 'OBJ', extension: 'm' },
	graphql: { icon: 'file-code-2', badge: 'GQL', extension: 'graphql' },
	solidity: { icon: 'file-code-2', badge: 'SOL', extension: 'sol' },
	zig: { icon: 'file-code-2', badge: 'ZIG', extension: 'zig' },
	nim: { icon: 'file-code-2', badge: 'NIM', extension: 'nim' },
	shell: { icon: 'terminal', badge: 'SH', extension: 'sh' },
	powershell: { icon: 'terminal', badge: 'PS', extension: 'ps1' },
	console: { icon: 'terminal', badge: 'CON', extension: 'txt' },
	sql: { icon: 'database', badge: 'SQL', extension: 'sql' },
	mysql: { icon: 'database', badge: 'SQL', extension: 'sql' },
	postgres: { icon: 'database', badge: 'PG', extension: 'sql' },
	postgresql: { icon: 'database', badge: 'PG', extension: 'sql' },
	sqlite: { icon: 'database', badge: 'SQL', extension: 'sql' },
	plsql: { icon: 'database', badge: 'SQL', extension: 'sql' },
	html: { icon: 'globe', badge: 'HTML', extension: 'html' },
	xml: { icon: 'globe', badge: 'XML', extension: 'xml' },
	svg: { icon: 'globe', badge: 'SVG', extension: 'svg' },
	xhtml: { icon: 'globe', badge: 'HTML', extension: 'html' },
	css: { icon: 'palette', badge: 'CSS', extension: 'css' },
	scss: { icon: 'palette', badge: 'SCSS', extension: 'scss' },
	sass: { icon: 'palette', badge: 'SCSS', extension: 'sass' },
	less: { icon: 'palette', badge: 'LESS', extension: 'less' },
	json: { icon: 'file-json', badge: 'JSON', extension: 'json' },
	jsonc: { icon: 'file-json', badge: 'JSON', extension: 'jsonc' },
	json5: { icon: 'file-json', badge: 'JSON', extension: 'json5' },
	yaml: { icon: 'braces', badge: 'YAML', extension: 'yml' },
	toml: { icon: 'braces', badge: 'TOML', extension: 'toml' },
	ini: { icon: 'braces', badge: 'INI', extension: 'ini' },
	markdown: { icon: 'file-text', badge: 'MD', extension: 'md' },
	text: { icon: 'file-text', badge: 'TXT', extension: 'txt' },
	log: { icon: 'file-text', badge: 'LOG', extension: 'log' },
	asm: { icon: 'binary', badge: 'ASM', extension: 'asm' },
	wasm: { icon: 'binary', badge: 'WASM', extension: 'wasm' },
};

export function normalizeLanguage(language: string): string {
	const key = language.trim().toLowerCase();
	return LANGUAGE_ALIASES[key] ?? key;
}

export function isIgnoredLanguage(language: string): boolean {
	return IGNORED_LANGUAGES.has(normalizeLanguage(language));
}

export function getLanguageLabel(language: string): string {
	return normalizeLanguage(language) || 'text';
}

export function getLanguageExtension(language: string): string {
	return LANGUAGE_METADATA[normalizeLanguage(language)]?.extension ?? 'txt';
}

export function getLanguageBadge(language: string): string {
	const key = normalizeLanguage(language);

	if (!key) {
		return 'TXT';
	}

	return LANGUAGE_METADATA[key]?.badge ?? key.slice(0, 2).toUpperCase();
}

export function getLanguageIconId(language: string): string {
	const key = normalizeLanguage(language);

	if (!key) {
		return 'file-text';
	}

	return LANGUAGE_METADATA[key]?.icon ?? 'code-2';
}
