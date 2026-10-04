import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { foldAll, unfoldAll } from '@codemirror/language';
import { yaml } from '@codemirror/lang-yaml';
import { Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { MergeView } from '@codemirror/merge';
import { propertyAnnotationsPlugin, annotationTheme } from '../utils/annotations';

@customElement('diff-component')
export class DiffComponent extends LitElement {
  @property({ type: String }) mode: 'json' | 'yaml' = 'json';
  @property({ type: String }) theme: 'light' | 'dark' = 'light';
  @property({ type: String }) original = '';
  @property({ type: String }) modified = '';
  @query('#diff-container') container!: HTMLElement;

  private mergeView?: MergeView;
  private cleanupScrollSync?: () => void;

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.cleanupScrollSync) {
      this.cleanupScrollSync();
      this.cleanupScrollSync = undefined;
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
      min-width: 0;
      max-width: 100%;
      height: 100%;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }
    #diff-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
      min-width: 0;
      max-width: 100%;
      height: 100%;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }
    .cm-mergeView {
        height: 100% !important;
        width: 100% !important;
        display: flex;
        flex-direction: column;
        flex: 1 1 0%;
        min-height: 0;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
    }
    .cm-mergeViewEditors {
        display: flex;
        flex-direction: row;
        flex: 1 1 0%;
        height: 100% !important;
        width: 100% !important;
        overflow: hidden;
        min-height: 0;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
    }
    .cm-mergeViewEditor {
        height: 100% !important;
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        max-width: 100%;
        box-sizing: border-box;
    }
    .cm-mergeViewEditor .cm-editor {
        height: 100% !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 0% !important;
        min-width: 0 !important;
        min-height: 0 !important;
    }
    /* Ensure gutters and other elements don't break layout */
    .cm-mergeViewSpacer {
        width: 2px;
        background: var(--border);
        flex-shrink: 0;
    }
    .cm-gutters {
        display: flex;
        flex-direction: row;
    }
    .cm-scroller {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        min-width: 0 !important;
        overflow: auto !important;
    }
    .cm-line {
        white-space: pre-wrap !important;
    }

    /* Diff highlights */
    .cm-merge-a .cm-changedLine,
    .cm-deletedChunk {
        background-color: rgba(239, 68, 68, 0.15) !important;
    }
    .cm-merge-b .cm-changedLine,
    .cm-inlineChangedLine {
        background-color: rgba(34, 197, 94, 0.15) !important;
    }

    .cm-merge-a .cm-changedText,
    .cm-deletedText {
        background-color: rgba(239, 68, 68, 0.3) !important;
        text-decoration: line-through;
    }
    .cm-merge-b .cm-changedText {
        background-color: rgba(34, 197, 94, 0.3) !important;
    }

    /* Line-based highlights (fallback/explicit) */
    .cm-deletedLine {
        background-color: rgba(239, 68, 68, 0.15) !important;
        display: block;
    }
    .cm-insertedLine {
        background-color: rgba(34, 197, 94, 0.15) !important;
        display: block;
    }

    /* Dark theme adjustments */
    :host([theme="dark"]) .cm-merge-a .cm-changedLine,
    :host([theme="dark"]) .cm-deletedChunk {
        background-color: rgba(248, 113, 113, 0.2) !important;
    }
    :host([theme="dark"]) .cm-merge-b .cm-changedLine,
    :host([theme="dark"]) .cm-inlineChangedLine {
        background-color: rgba(74, 222, 128, 0.2) !important;
    }
    :host([theme="dark"]) .cm-merge-a .cm-changedText,
    :host([theme="dark"]) .cm-deletedText {
        background-color: rgba(248, 113, 113, 0.4) !important;
    }
    :host([theme="dark"]) .cm-merge-b .cm-changedText {
        background-color: rgba(74, 222, 128, 0.4) !important;
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if ((changedProperties.has('mode') || changedProperties.has('theme')) && this.mergeView) {
      this.initDiff();
      return;
    }

    if (changedProperties.has('original') && this.mergeView) {
        const currentOriginal = this.mergeView.a.state.doc.toString();
        if (this.original !== currentOriginal) {
            this.mergeView.a.dispatch({
                changes: { from: 0, to: currentOriginal.length, insert: this.original }
            });
        }
    }

    if (changedProperties.has('modified') && this.mergeView) {
        const currentModified = this.mergeView.b.state.doc.toString();
        if (this.modified !== currentModified) {
            this.mergeView.b.dispatch({
                changes: { from: 0, to: currentModified.length, insert: this.modified }
            });
        }
    }
  }

  firstUpdated() {
    this.initDiff();
  }

  private initDiff() {
    if (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
    }

    const extensions: Extension[] = [
      basicSetup,
      EditorView.lineWrapping,
      this.mode === 'json' ? json() : yaml(),
      propertyAnnotationsPlugin,
      annotationTheme,
    ];

    if (this.theme === 'dark') {
      extensions.push(oneDark);
    }

    this.mergeView = new MergeView({
      a: {
        doc: this.original,
        extensions: [
            ...extensions,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const newContent = update.state.doc.toString();
                    if (newContent !== this.original) {
                        this.original = newContent;
                        this.dispatchEvent(new CustomEvent('original-changed', {
                            detail: { content: this.original }
                        }));
                    }
                }
            })
        ]
      },
      b: {
        doc: this.modified,
        extensions: [
            ...extensions,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const newContent = update.state.doc.toString();
                    if (newContent !== this.modified) {
                        this.modified = newContent;
                        this.dispatchEvent(new CustomEvent('modified-changed', {
                            detail: { content: this.modified }
                        }));
                    }
                }
            })
        ]
      },
      parent: this.container,
      root: this.renderRoot as ShadowRoot
    });

    this.setupScrollSync();
  }

  foldAll() {
    if (this.mergeView) {
      foldAll(this.mergeView.a);
      foldAll(this.mergeView.b);
    }
  }

  unfoldAll() {
    if (this.mergeView) {
      unfoldAll(this.mergeView.a);
      unfoldAll(this.mergeView.b);
    }
  }

  private setupScrollSync() {
    if (this.cleanupScrollSync) {
      this.cleanupScrollSync();
      this.cleanupScrollSync = undefined;
    }

    if (!this.mergeView) return;

    const scrollerA = this.mergeView.a.scrollDOM;
    const scrollerB = this.mergeView.b.scrollDOM;

    if (!scrollerA || !scrollerB) return;

    let activeSource: 'A' | 'B' | null = null;
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;

    const syncScroll = (source: 'A' | 'B') => {
      if (activeSource && activeSource !== source) return;
      activeSource = source;

      const from = source === 'A' ? scrollerA : scrollerB;
      const to = source === 'A' ? scrollerB : scrollerA;

      to.scrollTop = from.scrollTop;
      to.scrollLeft = from.scrollLeft;

      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        activeSource = null;
      }, 50);
    };

    const onScrollA = () => syncScroll('A');
    const onScrollB = () => syncScroll('B');

    scrollerA.addEventListener('scroll', onScrollA, { passive: true });
    scrollerB.addEventListener('scroll', onScrollB, { passive: true });

    this.cleanupScrollSync = () => {
      scrollerA.removeEventListener('scroll', onScrollA);
      scrollerB.removeEventListener('scroll', onScrollB);
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }

  render() {
    return html`<div id="diff-container"></div>`;
  }
}
