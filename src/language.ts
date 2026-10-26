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

const LANGUAGE_ICONS: Record<string, string> = {
	shell: 'terminal',
	powershell: 'terminal',
	console: 'terminal',
	sql: 'database',
	mysql: 'database',
	postgres: 'database',
	postgresql: 'database',
	sqlite: 'database',
	plsql: 'database',
	html: 'globe',
	xml: 'globe',
	svg: 'globe',
	xhtml: 'globe',
	css: 'palette',
	scss: 'palette',
	sass: 'palette',
	less: 'palette',
	json: 'file-json',
	jsonc: 'file-json',
	json5: 'file-json',
	yaml: 'braces',
	toml: 'braces',
	ini: 'braces',
	markdown: 'file-text',
	text: 'file-text',
	log: 'file-text',
	javascript: 'file-code-2',
	typescript: 'file-code-2',
	jsx: 'file-code-2',
	tsx: 'file-code-2',
	python: 'file-code-2',
	java: 'file-code-2',
	c: 'file-code-2',
	cpp: 'file-code-2',
	csharp: 'file-code-2',
	go: 'file-code-2',
	rust: 'file-code-2',
	ruby: 'file-code-2',
	php: 'file-code-2',
	swift: 'file-code-2',
	kotlin: 'file-code-2',
	scala: 'file-code-2',
	lua: 'file-code-2',
	r: 'file-code-2',
	dart: 'file-code-2',
	elixir: 'file-code-2',
	erlang: 'file-code-2',
	haskell: 'file-code-2',
	clojure: 'file-code-2',
	perl: 'file-code-2',
	objective: 'file-code-2',
	graphql: 'file-code-2',
	solidity: 'file-code-2',
	zig: 'file-code-2',
	nim: 'file-code-2',
	asm: 'binary',
	wasm: 'binary',
};

const LANGUAGE_BADGES: Record<string, string> = {
	javascript: 'JS',
	typescript: 'TS',
	python: 'PY',
	shell: 'SH',
	powershell: 'PS',
	html: 'HTML',
	xml: 'XML',
	svg: 'SVG',
	css: 'CSS',
	scss: 'SCSS',
	sass: 'SCSS',
	less: 'LESS',
	json: 'JSON',
	jsonc: 'JSON',
	json5: 'JSON',
	yaml: 'YAML',
	toml: 'TOML',
	ini: 'INI',
	markdown: 'MD',
	text: 'TXT',
	log: 'LOG',
	sql: 'SQL',
	java: 'JAVA',
	c: 'C',
	cpp: 'C++',
	csharp: 'C#',
	go: 'GO',
	rust: 'RS',
	ruby: 'RB',
	php: 'PHP',
	swift: 'SW',
	kotlin: 'KT',
	scala: 'SC',
	lua: 'LUA',
	r: 'R',
	dart: 'DT',
	elixir: 'EX',
	erlang: 'ER',
	haskell: 'HS',
	clojure: 'CLJ',
	perl: 'PL',
	graphql: 'GQL',
	solidity: 'SOL',
	zig: 'ZIG',
	nim: 'NIM',
	asm: 'ASM',
	wasm: 'WASM',
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

export function getLanguageBadge(language: string): string {
	const key = normalizeLanguage(language);

	if (!key) {
		return 'TXT';
	}

	return LANGUAGE_BADGES[key] ?? key.slice(0, 2).toUpperCase();
}

export function getLanguageIconId(language: string): string {
	const key = normalizeLanguage(language);
	if (!key) {
		return 'file-text';
	}

	return LANGUAGE_ICONS[key] ?? 'code-2';
}
