# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
