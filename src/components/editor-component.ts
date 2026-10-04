import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { foldAll, unfoldAll } from '@codemirror/language';
import { yaml } from '@codemirror/lang-yaml';
import { linter, lintGutter } from '@codemirror/lint';
import { EditorState, Extension, StateEffect } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { validateContent } from '../utils/validation';
import { propertyAnnotationsPlugin, annotationTheme } from '../utils/annotations';

@customElement('editor-component')
export class EditorComponent extends LitElement {
  @property({ type: String }) mode: 'json' | 'yaml' = 'json';
  @property({ type: String }) theme: 'light' | 'dark' = 'light';
  @property({ type: String }) content = '';
  @query('#editor') editorContainer!: HTMLElement;

  private view?: EditorView;

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
    #editor {
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
    .cm-editor {
      display: flex !important;
      flex-direction: column !important;
      flex: 1 1 0% !important;
      min-height: 0 !important;
      min-width: 0 !important;
      max-width: 100% !important;
      height: 100% !important;
      width: 100% !important;
    }
    .cm-scroller {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      min-width: 0 !important;
      overflow: auto !important;
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if ((changedProperties.has('mode') || changedProperties.has('theme')) && this.view) {
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
    const extensions: Extension[] = [
      basicSetup,
      EditorView.lineWrapping,
      this.mode === 'json' ? json() : yaml(),
      propertyAnnotationsPlugin,
      annotationTheme,
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

    if (this.theme === 'dark') {
      extensions.push(oneDark);
    }

    return extensions;
  }

  private initEditor() {
    this.view = new EditorView({
      state: EditorState.create({
        doc: this.content,
        extensions: this.getExtensions()
      }),
      parent: this.editorContainer,
      root: this.renderRoot as ShadowRoot
    });
  }

  foldAll() {
    if (this.view) {
      foldAll(this.view);
    }
  }

  unfoldAll() {
    if (this.view) {
      unfoldAll(this.view);
    }
  }

  render() {
    return html`<div id="editor"></div>`;
  }
}
