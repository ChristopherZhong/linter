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
    }
    .cm-mergeViewEditor {
        height: 100%;
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('mode') && this.mergeView) {
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
      oneDark,
      this.mode === 'json' ? json() : yaml(),
    ];

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
      parent: this.container
    });
  }

  render() {
    return html`<div id="diff-container"></div>`;
  }
}
