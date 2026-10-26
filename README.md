# Code Block Pro

Add a small toolbar to every rendered code block: a copy button and, when the
fence declares one, the language name.

## Features

- Compact header with a language badge, icon, and display name.
- Copy button with text, icon confirmation, and screen reader feedback.
- Line numbers in reading view and Live Preview, without changing the code or
  the copied text.
- Automatic line-number realignment when Obsidian reapplies a theme or CSS,
  plus a manual refresh control in reading view.
- Collapsible long code blocks in reading view, with configurable threshold and
  collapsed height.
- Works in reading view and Live Preview.
- Theme-aware container, header, and controls built on Obsidian CSS variables.
- Copy, language label, and line numbers can be disabled independently.
- Mermaid, Dataview, and DataviewJS blocks are left to their own processors.

Requires Obsidian 1.5.0 or later.

## Installation

### From source

1. Clone this repository into your vault's plugin folder:

   ```bash
   cd /path/to/vault/.obsidian/plugins
   git clone <repository-url> code-block-pro
   cd code-block-pro
   ```

2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

3. Reload Obsidian and enable **Code Block Pro** in **Settings → Community plugins**.

### Manual

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/code-block-pro/`, then enable the plugin.

## Development

```bash
npm install
npm run dev    # watch mode, rebuilds main.js on change
npm run build  # type-check and production bundle
npm run lint   # ESLint with eslint-plugin-obsidianmd
```

The build output is `main.js`, which is ignored by Git and attached to GitHub
releases instead.

### Local testing

Install the built plugin into a vault with symlinks, so `npm run dev` rebuilds
are picked up without reinstalling:

```bash
npm run build
npm run install:vault
```

The installer asks for the vault path. You can also pass it directly or use an
environment variable:

```bash
npm run install:vault -- /path/to/vault
npm run install:vault -- /path/to/vault --copy
OBSIDIAN_VAULT=/path/to/vault npm run install:vault
```

Symlinks are the default. Use `--copy` for regular files instead (on Windows the
installer falls back to copying automatically if symlinks are unavailable).
After installing, reload Obsidian with `Cmd/Ctrl+R` or the **Reload app without
saving** command, then enable the plugin under **Settings → Community plugins**.

`npm run deploy` runs the build and then the installer.

## Project structure

```text
.
├── src/
│   ├── main.ts        # Plugin lifecycle, post-processor registration
│   ├── language.ts    # Language names, icons, and ignored processors
│   ├── live-preview.ts # CodeMirror 6 extension for Live Preview
│   ├── processor.ts   # Reading view code block decoration
│   ├── toolbar.ts     # Shared header, copy, and collapse behavior
│   └── settings.ts    # Settings shape and settings tab
├── scripts/
│   └── install.mjs    # Local vault installer
├── styles.css         # Scoped, theme-aware styles
├── manifest.json      # Plugin metadata
├── esbuild.config.mjs # Bundler configuration
├── version-bump.mjs   # Keeps versions.json in sync with npm version
└── versions.json      # Version to minimum app version map
```

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Line numbers | On | Show line numbers in a gutter. Numbered reading view blocks scroll horizontally instead of wrapping. |
| Collapse after lines | 24 | Show the collapse control for blocks with more lines than this. |
| Collapsed lines | 14 | Number of code lines visible while a block is collapsed. |
| Copy button | On | Add a button to copy the code block to the clipboard. |
| Language label | On | Show the language declared in the code fence. |

## Releasing

1. Bump the version with `npm version patch|minor|major`.
2. Push the commit and tag.
3. Create a GitHub release for the tag and attach `main.js`, `manifest.json`,
   and `styles.css`.

## Security

The plugin has no runtime npm dependencies. Obsidian and CodeMirror are
provided by the host application, and stored settings are validated against a
known boolean schema before use.

```bash
npm audit             # dependency vulnerabilities
npm run sbom          # CycloneDX / build and test dependencies
npm run sbom:spdx     # SPDX
npm run sbom:runtime  # runtime-only CycloneDX
```

The generated `sbom.cdx.json`, `sbom.spdx.json`, and `sbom.runtime.cdx.json`
files describe the dependency graph used to build and validate the plugin.

## License

MIT © 2026 Jesus Alvarado
