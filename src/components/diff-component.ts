import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { MergeView } from '@codemirror/merge';

@customElement('diff-component')
export class DiffComponent extends LitElement {
  @property({ type: String }) mode: 'json' | 'yaml' = 'json';
  @property({ type: String }) theme: 'light' | 'dark' = 'light';
  @property({ type: String }) original = '';
  @property({ type: String }) modified = '';
  @query('#diff-container') container!: HTMLElement;

  private mergeView?: MergeView;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    #diff-container {
      height: 100%;
    }
    .cm-mergeView {
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .cm-mergeViewEditors {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        height: 100%;
        overflow: hidden;
    }
    .cm-mergeViewEditor {
        height: 100%;
        flex: 1;
        min-width: 0;
    }
    .cm-mergeViewEditor .cm-editor {
        height: 100%;
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
        height: 100% !important;
    }
    .cm-scroller {
        display: flex;
        flex-direction: row;
    }
    .cm-content {
        flex-grow: 1;
    }
    .cm-line {
        white-space: pre !important;
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
      this.mode === 'json' ? json() : yaml(),
    ];

    if (this.theme === 'dark') {
      extensions.push(oneDark);
    }

    this.mergeView = new MergeView({
      a: {
        doc: this.original,
        extensions: [...extensions, EditorState.readOnly.of(true)]
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
  }

  render() {
    return html`<div id="diff-container"></div>`;
  }
}
