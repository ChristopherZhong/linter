# Linter.ai - JSON/YAML Linter & Diff Tool

A modern, fast, and static web application for linting and comparing JSON and YAML files.

## Features

- **Modern UI**: Sleek, dark-themed interface built with Web Components.
- **Real-time Linting**: Immediate feedback on syntax errors for JSON and YAML.
- **Schema Validation**: Supports JSON Schema via the `$schema` property.
- **Side-by-Side Comparison**: Easily compare two versions of a file with a diff view.
- **Formatting**: Auto-format and beautify your data with one click.
- **Persistence**: Your work is automatically saved in your browser's local storage.
- **Static Site**: No backend required, fully client-side.

## Tech Stack

- **[Lit](https://lit.dev/)**: Lightweight Web Components.
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development.
- **[CodeMirror 6](https://codemirror.net/)**: Next-generation code editor for the web.
- **[Ajv](https://ajv.js.org/)**: Fast JSON Schema validator.
- **[js-yaml](https://github.com/nodeca/js-yaml)**: Powerful YAML parser.
- **[Vite](https://vitejs.dev/)**: Modern frontend build tool.

## Getting Started

### Development

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

### Deployment

The project is configured for automatic deployment to GitHub Pages via GitHub Actions on every push to the `main` branch.

## License

MIT
