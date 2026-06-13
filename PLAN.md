# Project Plan - JSON/YAML Linter & Diff Tool

This project aims to build a modern, static web-based linter and comparison tool for JSON and YAML content.

## Features
- [x] **Real-time Linting**: Syntax validation for JSON and YAML.
- [x] **Schema Validation**: Support for JSON Schema via the `$schema` property.
- [x] **Comparison Tool**: Side-by-side text diff for comparing two files.
- [x] **Formatting**: Auto-format/beautify JSON and YAML.
- [x] **Persistence**: Save user input in `localStorage`.
- [x] **Modern UI**: Dark-themed, responsive SPA.
- [x] **Static Deployment**: Hosted on GitHub Pages.

## Tech Stack
- **Framework**: Lit (Lightweight Web Components)
- **Language**: TypeScript
- **Bundler**: Vite
- **Editor**: CodeMirror 6
- **Styling**: Vanilla CSS (Custom Properties)
- **Deployment**: GitHub Actions

## Implementation Phases

### Phase 1: Initialization
- [x] Create `PLAN.md` and `AGENTS.md`.
- [x] Bootstrap Vite + Lit + TypeScript project.
- [x] Configure GitHub Actions for deployment.

### Phase 2: Core Logic
- [x] Integrate CodeMirror 6.
- [x] Implement JSON/YAML parsers and linting logic.
- [x] Implement JSON Schema fetching and validation using `ajv`.

### Phase 3: UI Development
- [x] Build the Shell (Header, Tabs, Footer).
- [x] Implement the Linting View.
- [x] Implement the Formatting functionality.
- [x] Add `localStorage` hooks for persistence.

### Phase 4: Comparison Feature
- [x] Implement the Diffing View using CodeMirror merge addon.
- [x] Handle side-by-side synchronization.

### Phase 5: Polishing
- [x] Add sample data.
- [x] Finalize `README.md`.
- [x] Verify build and deployment.
