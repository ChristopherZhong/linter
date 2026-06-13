import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';
import { EditorState, Extension, StateEffect } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import * as jsYaml from 'js-yaml';
import Ajv, { ValidateFunction } from 'ajv';

const ajv = new Ajv({ allErrors: true, verbose: true });

@customElement('editor-component')
export class EditorComponent extends LitElement {
  @property({ type: String }) mode: 'json' | 'yaml' = 'json';
  @property({ type: String }) content = '';
  @query('#editor') editorContainer!: HTMLElement;

  private view?: EditorView;
  private schemaCache = new Map<string, any>();
  private validatorCache = new Map<string, ValidateFunction>();

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

  private async fetchSchema(url: string) {
    if (this.schemaCache.has(url)) return this.schemaCache.get(url);
    try {
      const response = await fetch(url);
      const schema = await response.json();
      this.schemaCache.set(url, schema);
      return schema;
    } catch (e) {
      console.error('Failed to fetch schema', e);
      return null;
    }
  }

  private async getValidator(url: string): Promise<ValidateFunction | null> {
    if (this.validatorCache.has(url)) return this.validatorCache.get(url)!;

    const schema = await this.fetchSchema(url);
    if (!schema) return null;

    try {
      const validate = ajv.compile(schema);
      this.validatorCache.set(url, validate);
      return validate;
    } catch (e) {
      console.error('AJV compile error', e);
      return null;
    }
  }

  private async validateContent(view: EditorView): Promise<Diagnostic[]> {
    const text = view.state.doc.toString();
    if (!text) return [];

    const diagnostics: Diagnostic[] = [];

    let data: any;
    try {
      if (this.mode === 'json') {
        data = JSON.parse(text);
      } else {
        data = jsYaml.load(text);
      }
    } catch (e: any) {
      diagnostics.push({
        from: 0,
        to: text.length,
        severity: 'error',
        message: e.message,
      });
      return diagnostics;
    }

    if (data && typeof data === 'object' && data.$schema) {
      const validate = await this.getValidator(data.$schema);
      if (validate) {
        const valid = validate(data);
        if (!valid && validate.errors) {
          validate.errors.forEach(err => {
            diagnostics.push({
              from: 0,
              to: text.length,
              severity: 'error',
              message: `Schema: ${err.instancePath} ${err.message}`,
            });
          });
        }
      }
    }

    return diagnostics;
  }

  private getExtensions(): Extension[] {
    return [
      basicSetup,
      oneDark,
      this.mode === 'json' ? json() : yaml(),
      lintGutter(),
      linter(async (view) => await this.validateContent(view)),
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
