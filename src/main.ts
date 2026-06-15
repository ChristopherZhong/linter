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
      border: none;
      background: transparent;
      font-family: inherit;
    }

    .tab.active {
      background: var(--bg-card);
      color: var(--text-main);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .tab:focus-visible,
    button:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
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

    .theme-toggle {
        display: flex;
        background: var(--bg-sidebar);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 2px;
        position: relative;
        height: 32px;
        box-sizing: border-box;
    }

    .theme-slider {
        position: absolute;
        top: 2px;
        bottom: 2px;
        left: 2px;
        width: calc((100% - 4px) / 3);
        background: var(--bg-card);
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        border: 1px solid var(--border);
        transition: transform 0.2s ease;
        z-index: 0;
    }

    .theme-toggle[data-theme="light"] .theme-slider {
        transform: translateX(100%);
    }

    .theme-toggle[data-theme="dark"] .theme-slider {
        transform: translateX(200%);
    }

    .theme-option {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 14px;
        cursor: pointer;
        z-index: 1;
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        width: 32px;
        opacity: 0.5;
    }

    .theme-option:hover {
        background: transparent;
        color: var(--text-main);
        opacity: 0.8;
    }

    .theme-option.active {
        color: var(--text-main);
        opacity: 1;
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

  private setTheme(theme: 'light' | 'dark' | 'system') {
    this.theme = theme;
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

    return html`
      <header>
        <div class="logo">Linter.ai</div>
        <div class="tabs" role="tablist">
          <button
            id="tab-lint"
            class="tab ${this.activeTab === 'lint' ? 'active' : ''}"
            role="tab"
            aria-selected="${this.activeTab === 'lint'}"
            aria-controls="panel-lint"
            @click="${() => this.activeTab = 'lint'}"
          >
            Lint
          </button>
          <button
            id="tab-compare"
            class="tab ${this.activeTab === 'compare' ? 'active' : ''}"
            role="tab"
            aria-selected="${this.activeTab === 'compare'}"
            aria-controls="panel-compare"
            @click="${() => this.activeTab = 'compare'}"
          >
            Compare
          </button>
        </div>
        <div class="controls">
          <select @change="${this.handleModeChange}" .value="${this.mode}" aria-label="Select language mode">
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
          <button @click="${this.formatContent}" aria-label="Format content">Format</button>

          <div class="theme-toggle" data-theme="${this.theme}" role="radiogroup" aria-label="Select theme">
            <div class="theme-slider"></div>
            <button
              class="theme-option ${this.theme === 'system' ? 'active' : ''}"
              @click="${() => this.setTheme('system')}"
              role="radio"
              aria-checked="${this.theme === 'system'}"
              title="System Theme"
              aria-label="System Theme"
            >
              🖥️
            </button>
            <button
              class="theme-option ${this.theme === 'light' ? 'active' : ''}"
              @click="${() => this.setTheme('light')}"
              role="radio"
              aria-checked="${this.theme === 'light'}"
              title="Light Theme"
              aria-label="Light Theme"
            >
              ☀️
            </button>
            <button
              class="theme-option ${this.theme === 'dark' ? 'active' : ''}"
              @click="${() => this.setTheme('dark')}"
              role="radio"
              aria-checked="${this.theme === 'dark'}"
              title="Dark Theme"
              aria-label="Dark Theme"
            >
              🌙
            </button>
          </div>
        </div>
      </header>

      <main>
        ${this.activeTab === 'lint' ? html`
          <div
            id="panel-lint"
            class="editor-wrapper"
            role="tabpanel"
            aria-labelledby="tab-lint"
          >
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
          <div
            id="panel-compare"
            class="editor-wrapper"
            role="tabpanel"
            aria-labelledby="tab-compare"
          >
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
