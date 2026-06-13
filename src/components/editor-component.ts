import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { linter, lintGutter } from '@codemirror/lint';
import { EditorState, Extension, StateEffect } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { validateContent } from '../utils/validation';

@customElement('editor-component')
export class EditorComponent extends LitElement {
  @property({ type: String }) mode: 'json' | 'yaml' = 'json';
  @property({ type: String }) content = '';
  @query('#editor') editorContainer!: HTMLElement;

  private view?: EditorView;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    #editor {
      height: 100%;
    }
    .cm-editor {
      height: 100%;
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('mode') && this.view) {
      this.view.dispatch({
        effects: StateEffect.reconfigure.of(this.getExtensions())
      });
    }
    if (changedProperties.has('content') && this.view) {
        const currentContent = this.view.state.doc.toString();
        if (this.content !== currentContent) {
            this.view.dispatch({
                changes: { from: 0, to: currentContent.length, insert: this.content }
            });
        }
    }
  }

  firstUpdated() {
    this.initEditor();
  }

  private getExtensions(): Extension[] {
    return [
      basicSetup,
      oneDark,
      this.mode === 'json' ? json() : yaml(),
      lintGutter(),
      linter(async (view) => await validateContent(view.state.doc.toString(), this.mode)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          if (newContent !== this.content) {
            this.content = newContent;
            this.dispatchEvent(new CustomEvent('content-changed', {
                detail: { content: this.content }
            }));
          }
        }
      })
    ];
  }

  private initEditor() {
    this.view = new EditorView({
      state: EditorState.create({
        doc: this.content,
        extensions: this.getExtensions()
      }),
      parent: this.editorContainer
    });
  }

  render() {
    return html`<div id="editor"></div>`;
  }
}
