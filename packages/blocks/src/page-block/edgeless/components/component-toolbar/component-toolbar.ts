import '../buttons/tool-icon-button.js';
import './change-shape-button.js';
import './change-brush-button.js';
import './change-connector-button.js';
import './change-note-button.js';
import './change-embed-card-button.js';
import './change-text-button.js';
import './change-frame-button.js';
import './change-group-button.js';
import './add-frame-button.js';
import './add-group-button.js';
import './release-from-group-button.js';
import './more-button.js';
import './align-button.js';

import { WithDisposable } from '@blocksuite/lit';
import { baseTheme } from '@toeverything/theme';
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  unsafeCSS,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { join } from 'lit/directives/join.js';

import { stopPropagation } from '../../../../_common/utils/event.js';
import {
  atLeastNMatches,
  groupBy,
  pickValues,
} from '../../../../_common/utils/iterable.js';
import type { BookmarkBlockModel } from '../../../../bookmark-block/bookmark-model.js';
import type { EmbedFigmaModel } from '../../../../embed-figma-block/embed-figma-model.js';
import type { EmbedGithubModel } from '../../../../embed-github-block/embed-github-model.js';
import type { EmbedLinkedDocModel } from '../../../../embed-linked-doc-block/embed-linked-doc-model.js';
import type { EmbedYoutubeModel } from '../../../../embed-youtube-block/embed-youtube-model.js';
import type { FrameBlockModel } from '../../../../frame-block/index.js';
import type { ImageBlockModel } from '../../../../image-block/index.js';
import type { NoteBlockModel } from '../../../../note-block/index.js';
import type {
  ElementModel,
  GroupElementModel,
} from '../../../../surface-block/index.js';
import {
  type BrushElementModel,
  clamp,
  type ConnectorElementModel,
  type ShapeElementModel,
  type TextElementModel,
} from '../../../../surface-block/index.js';
import type { EdgelessPageBlockComponent } from '../../edgeless-page-block.js';
import { edgelessElementsBound } from '../../utils/bound-utils.js';
import {
  isBookmarkBlock,
  isEmbeddedBlock,
  isFrameBlock,
  isImageBlock,
  isNoteBlock,
} from '../../utils/query.js';

type CategorizedElements = {
  shape?: ShapeElementModel[];
  brush?: BrushElementModel[];
  text?: TextElementModel[];
  group?: GroupElementModel[];
  connector?: ConnectorElementModel[];
  note?: NoteBlockModel[];
  frame?: FrameBlockModel[];
  image?: ImageBlockModel[];
  embedCard?: BookmarkBlockModel[] &
    EmbedGithubModel[] &
    EmbedYoutubeModel[] &
    EmbedFigmaModel[] &
    EmbedLinkedDocModel[];
};

@customElement('edgeless-component-toolbar')
export class EdgelessComponentToolbar extends WithDisposable(LitElement) {
  static override styles = css`
    .edgeless-component-toolbar-container {
      display: flex;
      align-items: center;
      height: 40px;
      background: var(--affine-background-overlay-panel-color);
      box-shadow: var(--affine-menu-shadow);
      border-radius: 8px;
      padding: 0 8px;
      font-family: ${unsafeCSS(baseTheme.fontSansFamily)};
    }

    component-toolbar-menu-divider {
      width: 4px;
      margin: 0 12px;
      height: 24px;
    }
  `;

  @property({ attribute: false })
  edgeless!: EdgelessPageBlockComponent;

  @state()
  left = 0;

  @state()
  top = 0;

  @state()
  private _showPopper = false;

  get page() {
    return this.edgeless.page;
  }

  get selection() {
    return this.edgeless.service.selection;
  }

  get slots() {
    return this.edgeless.slots;
  }

  get surface() {
    return this.edgeless.surface;
  }

  private _groupSelected(): CategorizedElements {
    const result = groupBy(this.selection.elements, model => {
      if (isNoteBlock(model)) {
        return 'note';
      } else if (isFrameBlock(model)) {
        return 'frame';
      } else if (isImageBlock(model)) {
        return 'image';
      } else if (isBookmarkBlock(model) || isEmbeddedBlock(model)) {
        return 'embedCard';
      }

      return (model as ElementModel).type;
    });
    return result as CategorizedElements;
  }

  private _ShapeButton(shapeElements?: ShapeElementModel[]) {
    const shapeButton = shapeElements?.length
      ? html`<edgeless-change-shape-button
          .elements=${shapeElements}
          .page=${this.page}
          .surface=${this.surface}
        >
        </edgeless-change-shape-button>`
      : nothing;
    return shapeButton;
  }

  private _BrushButton(brushElements?: BrushElementModel[]) {
    return brushElements?.length
      ? html`<edgeless-change-brush-button
          .elements=${brushElements}
          .page=${this.page}
          .surface=${this.surface}
        >
        </edgeless-change-brush-button>`
      : nothing;
  }

  private _ConnectorButton(connectorElements?: ConnectorElementModel[]) {
    return connectorElements?.length
      ? html` <edgeless-change-connector-button
          .elements=${connectorElements}
          .page=${this.page}
          .surface=${this.surface}
          .edgeless=${this.edgeless}
        >
        </edgeless-change-connector-button>`
      : nothing;
  }

  private _NoteButton(notes?: NoteBlockModel[]) {
    return notes && notes.length >= 0
      ? html`<edgeless-change-note-button
          .notes=${notes}
          .surface=${this.surface}
        >
        </edgeless-change-note-button>`
      : nothing;
  }

  private _EmbedCardButton(embedCards?: CategorizedElements['embedCard']) {
    if (embedCards?.length !== 1) return nothing;

    const embedCard = embedCards[0];

    return html`
      <edgeless-change-embed-card-button
        .model=${embedCard}
        .std=${this.edgeless.std}
        .surface=${this.surface}
      ></edgeless-change-embed-card-button>
    `;
  }

  private _TextButton(textElements?: TextElementModel[]) {
    return textElements?.length
      ? html`<edgeless-change-text-button
          .texts=${textElements}
          .page=${this.page}
          .surface=${this.surface}
        >
        </edgeless-change-text-button>`
      : nothing;
  }

  private _FrameButton(frames?: FrameBlockModel[]) {
    return frames?.length
      ? html`
          <edgeless-change-frame-button
            .surface=${this.surface}
            .frames=${frames}
          >
          </edgeless-change-frame-button>
        `
      : nothing;
  }

  private _GroupButton(groups?: GroupElementModel[]) {
    return groups?.length
      ? html`<edgeless-change-group-button
          .surface=${this.surface}
          .groups=${groups}
        >
        </edgeless-change-group-button>`
      : nothing;
  }

  protected togglePopper = (showPopper: boolean) => {
    this._showPopper = showPopper;
  };

  private _updateOnSelectedChange = (element: string | { id: string }) => {
    const id = typeof element === 'string' ? element : element.id;

    if (this.isConnected && this.selection.has(id)) {
      this.requestUpdate();
    }
  };

  protected override firstUpdated() {
    const { _disposables, edgeless } = this;
    _disposables.add(
      edgeless.service.viewport.viewportUpdated.on(() => {
        const [left, top] = this._computePosition();
        this.left = left;
        this.top = top;
      })
    );

    _disposables.add(
      this.selection.slots.updated.on(() => {
        this.requestUpdate();
      })
    );

    pickValues(this.edgeless.service.surface, [
      'elementAdded',
      'elementRemoved',
      'elementUpdated',
    ]).forEach(slot => _disposables.add(slot.on(this._updateOnSelectedChange)));

    _disposables.add(
      this.page.slots.blockUpdated.on(this._updateOnSelectedChange)
    );
  }

  private _CreateGroupButton() {
    return html`<edgeless-add-group-button
      .edgeless=${this.edgeless}
    ></edgeless-add-group-button> `;
  }

  private _CreateFrameButton() {
    return html`<edgeless-add-frame-button
      .edgeless=${this.edgeless}
    ></edgeless-add-frame-button>`;
  }

  private _ReleaseFromGroupButton() {
    return html`<edgeless-release-from-group-button
      .surface=${this.surface}
    ></edgeless-release-from-group-button>`;
  }

  private _AlignButton() {
    return html`<edgeless-align-button
      .edgeless=${this.edgeless}
    ></edgeless-align-button>`;
  }

  private _Divider() {
    return html`<component-toolbar-menu-divider></component-toolbar-menu-divider>`;
  }

  protected override async updated(_changedProperties: PropertyValues) {
    const [left, top] = this._computePosition();

    await this.updateComplete;
    this.left = left;
    this.top = top;
  }

  private _computePosition() {
    const { selection, viewport } = this.edgeless.service;

    const bound = edgelessElementsBound(selection.elements);

    const { width, height } = viewport;
    const [x, y] = viewport.toViewCoord(bound.x, bound.y);

    const [right, bottom] = viewport.toViewCoord(bound.maxX, bound.maxY);
    const rect = this.getBoundingClientRect();
    let left, top;
    if (x >= width || right <= 0 || y >= height || bottom <= 0) {
      left = right <= 0 ? x - rect.width : x;
      top = bottom <= 0 ? y - rect.height : y;
      return [left, top];
    }

    let offset = 34;
    if (this.selection.elements.find(ele => isFrameBlock(ele))) {
      offset += 10;
    }
    top = y - rect.height - offset;
    top < 0 && (top = y + bound.h * viewport.zoom + offset);

    left = clamp(x, 10, width - rect.width - 10);
    if (this._showPopper) {
      left = clamp(x, 10, width - rect.width - 80);
    }
    top = clamp(top, 10, height - rect.height - 100);
    return [left, top];
  }

  override render() {
    const groupedSelected = this._groupSelected();
    const { edgeless, selection } = this;
    const { shape, brush, connector, note, text, frame, group, embedCard } =
      groupedSelected;
    const { elements } = this.selection;
    const selectedAtLeastTwoTypes = atLeastNMatches(
      Object.values(groupedSelected),
      e => !!e.length,
      2
    );

    const buttons = selectedAtLeastTwoTypes
      ? []
      : [
          this._ShapeButton(shape),
          this._BrushButton(brush),
          this._ConnectorButton(connector),
          this._NoteButton(note),
          this._EmbedCardButton(embedCard),
          this._TextButton(text),
          this._FrameButton(frame),
          this._GroupButton(group),
        ].filter(b => !!b && b !== nothing);

    if (elements.length > 1) {
      buttons.unshift(this._Divider());
      buttons.unshift(this._AlignButton());
      buttons.unshift(this._Divider());
      buttons.unshift(this._CreateGroupButton());
      buttons.unshift(this._Divider());
      buttons.unshift(this._CreateFrameButton());
    }

    if (elements.length === 1) {
      if (selection.firstElement.group !== null) {
        buttons.unshift(this._Divider());
        buttons.unshift(this._ReleaseFromGroupButton());
      }
    }

    const last = buttons.at(-1);
    if (
      buttons.length > 0 &&
      (typeof last === 'symbol' ||
        !last?.strings[0].includes('component-toolbar-menu-divider'))
    ) {
      buttons.push(this._Divider());
    }

    return html` <style>
        :host {
          position: absolute;
          z-index: 3;
          left: ${this.left}px;
          top: ${this.top}px;
        }
      </style>
      <div
        class="edgeless-component-toolbar-container"
        @pointerdown=${stopPropagation}
      >
        ${join(buttons, () => '')}
        <edgeless-more-button
          .edgeless=${edgeless}
          .vertical=${true}
          .setPopperShow=${this.togglePopper}
        ></edgeless-more-button>
      </div>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'edgeless-component-toolbar': EdgelessComponentToolbar;
  }
}
