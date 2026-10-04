import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './components/editor-component';
import './components/diff-component';
import type { EditorComponent } from './components/editor-component';
import type { DiffComponent } from './components/diff-component';
import * as jsYaml from 'js-yaml';
import { checkLatestRelease } from './utils/version-check';
import { safeStorageGetItem, safeStorageSetItem } from './utils/storage';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const DEFAULT_JSON = JSON.stringify({
  "$schema": "https://www.schemastore.org/package.json",
  "name": "config-lens",
  "version": "1.0.0",
  "description": "Modern JSON/YAML Config Tools",
  "scripts": {
    "test": "echo \"no test specified\""
  }
}, null, 2);

@customElement('config-lens-app')
export class ConfigLensApp extends LitElement {
  @state() private activeTab: 'lint' | 'compare' = 'lint';
  @state() private mode: 'json' | 'yaml' = 'json';
  @state() private theme: 'light' | 'dark' | 'system' = 'system';
  @state() private content = DEFAULT_JSON;
  @state() private modifiedContent = DEFAULT_JSON;

  @state() private newVersionAvailable = false;
  @state() private latestVersion: string | null = null;
  @state() private noticeDismissed = false;
  @state() private formatFeedback: { type: 'success' | 'error'; message: string } | null = null;

  private versionCheckTimer?: number;
  private formatFeedbackTimer?: number;
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.checkForUpdate();
    }
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-width: 100vw;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
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
      flex-shrink: 0;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 18px;
      letter-spacing: -0.02em;
      flex-shrink: 0;
    }

    .logo-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      object-fit: contain;
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
    select:focus-visible,
    footer a:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .version-notice-banner {
      background: var(--accent);
      color: #ffffff;
      padding: 8px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 10;
      flex-shrink: 0;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    .version-notice-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .version-notice-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-refresh {
      background: #ffffff;
      color: var(--accent);
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }

    .btn-refresh:hover {
      background: rgba(255, 255, 255, 0.9);
    }

    .btn-dismiss {
      background: transparent;
      color: #ffffff;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .btn-dismiss:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.15);
    }

    main {
      flex: 1 1 0%;
      display: flex;
      overflow: hidden;
      padding: 20px;
      gap: 20px;
      min-height: 0;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      width: 100%;
    }

    .editor-wrapper {
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      min-height: 0;
      min-width: 0;
      max-width: 100%;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    editor-component,
    diff-component {
      flex: 1 1 0%;
      min-height: 0;
      min-width: 0;
      max-width: 100%;
      height: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
    }

    .editor-toolbar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-sidebar);
      flex-shrink: 0;
      min-width: 0;
      box-sizing: border-box;
    }

    .editor-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }

    .btn-secondary {
      background: var(--bg-main);
      color: var(--text-main);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: var(--bg-card);
      border-color: var(--accent);
    }

    .controls {
        display: flex;
        gap: 12px;
        align-items: center;
        min-width: 0;
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

    .format-feedback {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      align-self: center;
    }

    .format-feedback.success {
      background: rgba(34, 197, 94, 0.15);
      color: var(--success);
    }

    .format-feedback.error {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
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
      flex-shrink: 0;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }

    footer a {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }

    footer a:hover {
      color: var(--accent);
      text-decoration: underline;
    }

    .footer-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    const savedContent = safeStorageGetItem('config-lens-content');
    if (savedContent) {
        this.content = savedContent;
        this.modifiedContent = savedContent;
    }
    const savedMode = safeStorageGetItem('config-lens-mode');
    if (savedMode) this.mode = savedMode as 'json' | 'yaml';

    const savedTheme = safeStorageGetItem('config-lens-theme');
    if (savedTheme) {
        this.theme = savedTheme as 'light' | 'dark' | 'system';
    }

    // Listen for system theme changes
    if (typeof window.matchMedia === 'function') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (this.theme === 'system') {
              this.applyTheme();
              this.requestUpdate();
          }
      });
    }

    this.applyTheme();

    // Check for updates
    this.checkForUpdate();
    this.versionCheckTimer = window.setInterval(() => this.checkForUpdate(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.versionCheckTimer) {
      clearInterval(this.versionCheckTimer);
    }
    if (this.formatFeedbackTimer) {
      clearTimeout(this.formatFeedbackTimer);
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private async checkForUpdate() {
    const result = await checkLatestRelease(APP_VERSION);
    if (result.newVersionAvailable) {
      this.newVersionAvailable = true;
      this.latestVersion = result.latestVersion;
    }
  }

  private handleRefresh() {
    window.location.reload();
  }

  private handleDismissNotice() {
    this.noticeDismissed = true;
  }

  private getResolvedTheme(): 'light' | 'dark' {
    if (this.theme === 'system') {
        return (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    return this.theme;
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.getResolvedTheme());
  }

  private setTheme(theme: 'light' | 'dark' | 'system') {
    this.theme = theme;
    safeStorageSetItem('config-lens-theme', this.theme);
    this.applyTheme();
  }

  private handleContentChange(e: CustomEvent) {
    this.content = e.detail.content;
    safeStorageSetItem('config-lens-content', this.content);
  }

  private handleOriginalChange(e: CustomEvent) {
      this.content = e.detail.content;
      safeStorageSetItem('config-lens-content', this.content);
  }

  private handleModifiedChange(e: CustomEvent) {
      this.modifiedContent = e.detail.content;
  }

  private handleModeChange(e: Event) {
    this.mode = (e.target as HTMLSelectElement).value as 'json' | 'yaml';
    safeStorageSetItem('config-lens-mode', this.mode);
  }

  private showFormatFeedback(type: 'success' | 'error', message: string) {
    if (this.formatFeedbackTimer) {
      clearTimeout(this.formatFeedbackTimer);
    }
    this.formatFeedback = { type, message };
    this.formatFeedbackTimer = window.setTimeout(() => {
      this.formatFeedback = null;
    }, 2000);
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
        safeStorageSetItem('config-lens-content', this.content);
        this.showFormatFeedback('success', 'Formatted!');
    } catch (e) {
        console.error('Cannot format invalid content');
        this.showFormatFeedback('error', 'Invalid syntax');
    }
  }

  private handleFoldAll() {
    if (this.activeTab === 'lint') {
      const editor = this.shadowRoot?.querySelector<EditorComponent>('editor-component');
      editor?.foldAll();
    } else {
      const diff = this.shadowRoot?.querySelector<DiffComponent>('diff-component');
      diff?.foldAll();
    }
  }

  private handleUnfoldAll() {
    if (this.activeTab === 'lint') {
      const editor = this.shadowRoot?.querySelector<EditorComponent>('editor-component');
      editor?.unfoldAll();
    } else {
      const diff = this.shadowRoot?.querySelector<DiffComponent>('diff-component');
      diff?.unfoldAll();
    }
  }

  render() {
    const resolvedTheme = this.getResolvedTheme();

    return html`
      <header>
        <div class="logo">
          <img src="./favicon.svg" alt="ConfigLens Logo" class="logo-icon" />
          <span>ConfigLens</span>
        </div>
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
          ${this.formatFeedback ? html`
            <span
              class="format-feedback ${this.formatFeedback.type}"
              role="status"
              aria-live="polite"
            >
              ${this.formatFeedback.message}
            </span>
          ` : ''}

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

      ${this.newVersionAvailable && !this.noticeDismissed ? html`
        <div class="version-notice-banner" role="status" aria-live="polite">
          <div class="version-notice-content">
            <span>🚀 A new version of ConfigLens ${this.latestVersion ? `(v${this.latestVersion})` : ''} is available!</span>
          </div>
          <div class="version-notice-actions">
            <button class="btn-refresh" @click="${this.handleRefresh}" aria-label="Refresh page to update">Refresh</button>
            <button class="btn-dismiss" @click="${this.handleDismissNotice}" aria-label="Dismiss notice">✕</button>
          </div>
        </div>
      ` : ''}

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
              <div class="toolbar-actions">
                <button class="btn-secondary" @click="${this.handleFoldAll}" aria-label="Fold All">Fold All</button>
                <button class="btn-secondary" @click="${this.handleUnfoldAll}" aria-label="Expand All">Expand All</button>
              </div>
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
              <div class="toolbar-actions">
                <button class="btn-secondary" @click="${this.handleFoldAll}" aria-label="Fold All">Fold All</button>
                <button class="btn-secondary" @click="${this.handleUnfoldAll}" aria-label="Expand All">Expand All</button>
              </div>
            </div>
            <diff-component
                .mode="${this.mode}"
                .theme="${resolvedTheme}"
                .original="${this.content}"
                .modified="${this.modifiedContent}"
                @original-changed="${this.handleOriginalChange}"
                @modified-changed="${this.handleModifiedChange}"
            ></diff-component>
          </div>
        `}
      </main>

      <footer>
        <div>Ready</div>
        <div class="footer-right">
          <div>UTF-8</div>
          <span>•</span>
          <a
            href="https://github.com/ChristopherZhong/config-lens/releases/tag/v${APP_VERSION}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Version v${APP_VERSION}"
          >v${APP_VERSION}</a>
        </div>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-lens-app': ConfigLensApp;
  }
}
