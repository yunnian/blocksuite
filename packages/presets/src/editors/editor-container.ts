import type {
  AbstractEditor,
  DocPageBlockComponent,
  EdgelessPageBlockComponent,
  PageBlockModel,
} from '@blocksuite/blocks';
import {
  DocEditorBlockSpecs,
  EdgelessEditorBlockSpecs,
  ThemeObserver,
} from '@blocksuite/blocks';
import { assertExists, noop, Slot } from '@blocksuite/global/utils';
import {
  type EditorHost,
  ShadowlessElement,
  WithDisposable,
} from '@blocksuite/lit';
import type { Page } from '@blocksuite/store';
import { html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';

import { AffineDocEditor } from './affine-doc-editor.js';
import { EdgelessEditor } from './edgeless-editor.js';

noop(AffineDocEditor);
noop(EdgelessEditor);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function forwardSlot<T extends Record<string, Slot<any>>>(
  from: T,
  to: Partial<T>
) {
  Object.entries(from).forEach(([key, slot]) => {
    const target = to[key];
    if (target) {
      slot.pipe(target);
    }
  });
}

@customElement('affine-editor-container')
export class AffineEditorContainer
  extends WithDisposable(ShadowlessElement)
  implements AbstractEditor
{
  @property({ attribute: false })
  page!: Page;

  /** Due to product naming, `DocEditor` may be referred to as "page mode" */
  @property({ attribute: false })
  mode: 'page' | 'edgeless' = 'page';

  @property({ attribute: false })
  docSpecs = DocEditorBlockSpecs;

  @property({ attribute: false })
  edgelessSpecs = EdgelessEditorBlockSpecs;

  @property({ attribute: false })
  override autofocus = false;

  /** @deprecated unreliable since docSpecs can be overridden */
  @query('affine-doc-page')
  private _docPage?: DocPageBlockComponent;

  /** @deprecated unreliable since edgelessSpecs can be overridden */
  @query('affine-edgeless-page')
  private _edgelessPage?: EdgelessPageBlockComponent;

  get host() {
    return (
      this.mode === 'page' ? this._docPage?.host : this._edgelessPage?.host
    ) as EditorHost;
  }

  readonly themeObserver = new ThemeObserver();

  get model() {
    return this.page.root as PageBlockModel | null;
  }

  slots: AbstractEditor['slots'] = {
    pageLinkClicked: new Slot(),
    pageModeSwitched: new Slot(),
    pageUpdated: new Slot(),
    tagClicked: new Slot<{ tagId: string }>(),
  };

  override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    const root = this.host;
    if (root) {
      await root.updateComplete;
    }
    return result;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (!this.page) {
      throw new Error('Missing page for EditorContainer!');
    }

    // subscribe store
    this._disposables.add(
      this.page.slots.rootAdded.on(() => {
        // add the 'page' as requesting property to
        // make sure the `forwardSlot` is called in `updated` lifecycle
        this.requestUpdate('page');
      })
    );

    this.themeObserver.observe(document.documentElement);
    this._disposables.add(this.themeObserver);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
  }

  override firstUpdated() {
    if (this.mode === 'page') {
      setTimeout(() => {
        if (this.autofocus) {
          const docTitle = this.querySelector('doc-title');
          if (docTitle) {
            const richText = docTitle.querySelector('rich-text');
            assertExists(richText);
            const inlineEditor = richText.inlineEditor;
            assertExists(inlineEditor);
            inlineEditor.focusEnd();
          } else {
            this._docPage?.focusFirstParagraph();
          }
        }
      });
    }
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('mode')) {
      this.slots.pageModeSwitched.emit(this.mode);
    }

    if (changedProperties.has('page')) {
      this.slots.pageUpdated.emit({ newPageId: this.page.id });
    }

    if (!changedProperties.has('page') && !changedProperties.has('mode')) {
      return;
    }

    requestAnimationFrame(() => {
      if (this._docPage) forwardSlot(this._docPage.slots, this.slots);
      if (this._edgelessPage) forwardSlot(this._edgelessPage.slots, this.slots);
    });
  }

  override render() {
    if (!this.model) return nothing;

    return html`${keyed(
      this.model.id,
      this.mode === 'page'
        ? html`<affine-doc-editor
            .page=${this.page}
            .specs=${this.docSpecs}
          ></affine-doc-editor>`
        : html`<edgeless-editor
            .page=${this.page}
            .specs=${this.edgelessSpecs}
          ></edgeless-editor>`
    )}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-editor-container': AffineEditorContainer;
  }
}
