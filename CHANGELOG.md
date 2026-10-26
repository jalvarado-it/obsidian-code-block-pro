# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-10-25

### Added

- `Scroll after lines` setting for reading view. It defaults to the same
  initial value as `Collapse after lines` (24), and 0 disables vertical
  scrolling; the effective height is never less than `Collapsed lines`.

## [0.4.0] - 2026-10-25

### Added

- Configurable threshold for showing the collapse control (1–1000 lines).
- Configurable number of code lines visible while a block is collapsed
  (1–1000).

## [0.3.3] - 2026-10-25

### Added

- Refresh control in reading view to recalculate line-number metrics after a
  theme, font, or CSS change.

### Fixed

- Line numbers now realign automatically when Obsidian reapplies theme or
  snippet CSS, without rebuilding the code block.

## [0.3.2] - 2026-10-25

### Security

- Validate settings loaded from `data.json` against known boolean keys to
  avoid prototype pollution and type confusion.
- Override `moment` to 2.31.0 in the development lint chain
  (GHSA-4p3w-j4w9-5jqw) and align CodeMirror packages with Obsidian's peer
  versions.
- Add reproducible CycloneDX and SPDX SBOM generation plus audit scripts.

## [0.3.1] - 2026-10-25

### Fixed

- Align reading view line numbers with the rendered code line height, including
  themes that override the code or pre line height.
- Keep the gutter font, line height, and padding in sync with the code and stop
  the last line numbers from being clipped or drifting.

## [0.3.0] - 2026-10-25

### Added

- Language badges, icons, and normalized display names in the header.
- Collapse and expand control for long code blocks in reading view.
- Compatibility guard for Mermaid, Dataview, and DataviewJS blocks.

### Changed

- Redesigned the code block container with a compact header, rounded corners,
  subtle borders, and theme-aware backgrounds.
- Unified the copy and line-number controls under the new header.
- The native copy affordance is hidden only when the plugin replaces it.

## [0.2.0] - 2026-10-25

### Added

- Line numbers in reading view and Live Preview, generated without changing
  the code text or the clipboard output.

### Changed

- Numbered reading view blocks keep long lines on one line and scroll
  horizontally so the numbers stay aligned.

## [0.1.1] - 2026-10-25

### Added

- Live Preview support through a CodeMirror 6 extension.
- Local vault installer with symlink support for testing (`npm run install:vault`).

### Changed

- The copy action is now an icon button that switches to a check mark after copying.
- The language label is rendered as a badge, visually separated from the copy action.

### Fixed

- The plugin declares compatibility with Obsidian 1.5.0+, and the settings tab
  falls back to the classic API on versions before 1.13.0.

## [0.1.0] - 2026-10-25

### Added

- Initial plugin scaffold with a settings tab.
- Copy button on rendered code blocks.
- Optional language label sourced from the code fence.
- Theme-aware styles and accessibility support for the toolbar controls.
