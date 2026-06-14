import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './components/editor-component';
import './components/diff-component';
import * as jsYaml from 'js-yaml';

const DEFAULT_JSON = JSON.stringify({
  "$schema": "https://json.schemastore.org/package.json",
  "name": "linter-ai",
  "version": "1.0.0",
  "description": "Modern JSON/YAML Linter",
  "scripts": {
    "test": "echo \"no test specified\""
  }
}, null, 2);

@customElement('linter-app')
export class LinterApp extends LitElement {
  @state() private activeTab: 'lint' | 'compare' = 'lint';
  @state() private mode: 'json' | 'yaml' = 'json';
  @state() private theme: 'light' | 'dark' | 'system' = 'system';
  @state() private content = DEFAULT_JSON;
  @state() private modifiedContent = DEFAULT_JSON;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg-main);
      color: var(--text-main);
    }

    header {
      height: 56px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 24px;
      justify-content: space-between;
      background-color: var(--bg-sidebar);
    }

    .logo {
      font-weight: 600;
      font-size: 18px;
      letter-spacing: -0.02em;
    }

    .tabs {
      display: flex;
      gap: 4px;
      background: var(--bg-main);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .tab {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text-muted);
    }

    .tab.active {
      background: var(--bg-card);
      color: var(--text-main);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    main {
      flex: 1;
      display: flex;
      overflow: hidden;
      padding: 20px;
      gap: 20px;
    }

    .editor-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }

    .editor-toolbar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-sidebar);
    }

    .editor-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .controls {
        display: flex;
        gap: 12px;
    }

    button {
        background: var(--accent);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
    }

    button:hover {
        background: var(--accent-hover);
    }

    select {
      background: var(--bg-main);
      color: var(--text-main);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
    }

    footer {
      height: 32px;
      border-top: 1px solid var(--border);
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg-sidebar);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    const savedContent = localStorage.getItem('linter-content');
    if (savedContent) {
        this.content = savedContent;
        this.modifiedContent = savedContent;
    }
    const savedMode = localStorage.getItem('linter-mode');
    if (savedMode) this.mode = savedMode as 'json' | 'yaml';

    const savedTheme = localStorage.getItem('linter-theme');
    if (savedTheme) {
        this.theme = savedTheme as 'light' | 'dark' | 'system';
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme === 'system') {
            this.applyTheme();
            this.requestUpdate();
        }
    });

    this.applyTheme();
  }

  private getResolvedTheme(): 'light' | 'dark' {
    if (this.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.theme;
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.getResolvedTheme());
  }

  private toggleTheme() {
    if (this.theme === 'system') {
        this.theme = 'light';
    } else if (this.theme === 'light') {
        this.theme = 'dark';
    } else {
        this.theme = 'system';
    }
    localStorage.setItem('linter-theme', this.theme);
    this.applyTheme();
  }

  private handleContentChange(e: CustomEvent) {
    this.content = e.detail.content;
    localStorage.setItem('linter-content', this.content);
  }

  private handleModifiedChange(e: CustomEvent) {
      this.modifiedContent = e.detail.content;
  }

  private handleModeChange(e: Event) {
    this.mode = (e.target as HTMLSelectElement).value as 'json' | 'yaml';
    localStorage.setItem('linter-mode', this.mode);
  }

  private formatContent() {
    try {
        if (this.mode === 'json') {
            const parsed = JSON.parse(this.content);
            this.content = JSON.stringify(parsed, null, 2);
        } else {
            const parsed = jsYaml.load(this.content);
            this.content = jsYaml.dump(parsed);
        }
        localStorage.setItem('linter-content', this.content);
    } catch (e) {
        console.error('Cannot format invalid content');
    }
  }

  render() {
    const resolvedTheme = this.getResolvedTheme();
    let themeIcon = '🖥️';
    if (this.theme === 'light') themeIcon = '🌙';
    if (this.theme === 'dark') themeIcon = '☀️';

    return html`
      <header>
        <div class="logo">Linter.ai</div>
        <div class="tabs">
          <div class="tab ${this.activeTab === 'lint' ? 'active' : ''}" @click="${() => this.activeTab = 'lint'}">Lint</div>
          <div class="tab ${this.activeTab === 'compare' ? 'active' : ''}" @click="${() => this.activeTab = 'compare'}">Compare</div>
        </div>
        <div class="controls">
          <select @change="${this.handleModeChange}" .value="${this.mode}">
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
          <button @click="${this.formatContent}">Format</button>
          <button @click="${this.toggleTheme}" title="Theme: ${this.theme}" style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border);">
            ${themeIcon}
          </button>
        </div>
      </header>

      <main>
        ${this.activeTab === 'lint' ? html`
          <div class="editor-wrapper">
            <div class="editor-toolbar">
              <div class="editor-title">Editor</div>
            </div>
            <editor-component
                .mode="${this.mode}"
                .theme="${resolvedTheme}"
                .content="${this.content}"
                @content-changed="${this.handleContentChange}"
            ></editor-component>
          </div>
        ` : html`
          <div class="editor-wrapper">
            <div class="editor-toolbar">
              <div class="editor-title">Compare (Original vs Modified)</div>
            </div>
            <diff-component
                .mode="${this.mode}"
                .theme="${resolvedTheme}"
                .original="${this.content}"
                .modified="${this.modifiedContent}"
                @modified-changed="${this.handleModifiedChange}"
            ></diff-component>
          </div>
        `}
      </main>

      <footer>
        <div>Ready</div>
        <div>UTF-8</div>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'linter-app': LinterApp;
  }
}
