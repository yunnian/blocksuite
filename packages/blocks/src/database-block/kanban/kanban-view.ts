// related component

import { PlusIcon } from '@blocksuite/global/config';
import type { BlockSuiteRoot } from '@blocksuite/lit';
import { ShadowlessElement, WithDisposable } from '@blocksuite/lit';
import type { Text } from '@blocksuite/store';
import { css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { html } from 'lit/static-html.js';

import { DataBaseRowContainer } from '../table/components/row-container.js';
import type { TableViewManager } from '../table/table-view-manager.js';
import type { BlockOperation, InsertPosition } from '../types.js';
import { insertPositionToIndex } from '../utils/insert.js';

const styles = css`
`;

@customElement('affine-data-view-kanban')
export class DataViewKanban extends WithDisposable(ShadowlessElement) {

  static override styles = styles;

  @property({ attribute: false })
  kanbanViewManager!: KanbanViewManager;

  @property({ attribute: false })
  blockOperation!: BlockOperation;

  @property({ attribute: false })
  titleText!: Text;

  @property({ attribute: false })
  root!: BlockSuiteRoot;

  @property({ attribute: false })
  modalMode?: boolean;

  private get readonly() {
    return this.root.page.readonly;
  }

  override firstUpdated() {
    this._disposables.add(
      this.kanbanViewManager.slots.update.on(() => {
        this.requestUpdate();
      })
    );
  }


  private _addRow = (
    tableViewManager: TableViewManager,
    position: InsertPosition
  ) => {
    if (this.readonly) return;

    const page = this.root.page;
    page.captureSync();
    const index = insertPositionToIndex(
      position,
      this.tableViewManager.rows.map(id => ({ id }))
    );
    tableViewManager.rowAdd(position);
    setTimeout(() => {
      this.selection.selection = {
        focus: {
          rowIndex: index,
          columnIndex: 0,
        },
        isEditing: true,
      };
    });
  };

  private _renderColumnWidthDragBar = () => {
    let left = 0;
    return repeat(
      this.tableViewManager.columnManagerList,
      v => v.id,
      column => {
        left += column.width;
        return html` <affine-database-column-width-drag-bar
          .left="${left}"
          .column="${column}"
        ></affine-database-column-width-drag-bar>`;
      }
    );
  };

  override render() {
    const rowsTemplate = DataBaseRowContainer(this.tableViewManager);
    const addRow = (position: InsertPosition) => {
      this._addRow(this.tableViewManager, position);
    };
    return html`
      <div class="affine-database-table">
        <div class="affine-database-block-title-container">
          <affine-database-title
            .titleText="${this.titleText}"
            .addRow="${() => addRow('start')}"
            .root="${this.root}"
          ></affine-database-title>
          <affine-database-toolbar
            .root="${this.root}"
            .copyBlock="${this.blockOperation.copy}"
            .deleteSelf="${this.blockOperation.delete}"
            .view="${this.tableViewManager}"
            .addRow="${addRow}"
          ></affine-database-toolbar>
        </div>
        <div class="affine-database-block-table">
          <div class="affine-database-table-container">
            <affine-database-column-header
              .tableViewManager="${this.tableViewManager}"
            ></affine-database-column-header>
            ${rowsTemplate} ${this._renderColumnWidthDragBar()}
            <affine-database-selection
              .blockId="${this.tableViewManager.id}"
              .eventDispatcher="${this.root.uiEventDispatcher}"
              .view="${this.tableViewManager}"
            ></affine-database-selection>
          </div>
        </div>
        ${this.readonly
      ? null
      : html` <div class="affine-database-block-footer">
              <div
                class="affine-database-block-add-row"
                data-test-id="affine-database-add-row-button"
                role="button"
                @click="${() => addRow('end')}"
              >
                ${PlusIcon}<span>New Record</span>
              </div>
            </div>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-view-kanban': KanBanView;
  }
}