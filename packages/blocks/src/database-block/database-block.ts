// related component
import './table/table-view.js';
import './kanban/kanban-view.js';
import './common/database-view-header.js';

import { BlockElement } from '@blocksuite/lit';
import { customElement, property, state } from 'lit/decorators.js';
import { html, literal, unsafeStatic } from 'lit/static-html.js';

import { registerService } from '../__internal__/service.js';
import { DatabaseBlockDataSource } from './database-block-data-source.js';
import type { BlockOperation, DatabaseBlockModel } from './database-model.js';
import { DatabaseBlockService } from './database-service.js';
import type {
  DataSource,
  TableViewManager,
} from './table/table-view-manager.js';
import { DatabaseTableViewManager } from './table/table-view-manager.js';

@customElement('affine-database')
export class DatabaseBlockComponent extends BlockElement<DatabaseBlockModel> {
  override connectedCallback() {
    super.connectedCallback();

    registerService('affine:database', DatabaseBlockService);
    this.model.propsUpdated.on(() => this.requestUpdate());
    this.currentView = this.model.getViewList()[0].id;
  }

  @property({ attribute: false })
  modalMode?: boolean;

  @state()
  currentView?: string;

  _setViewId = (viewId: string) => {
    this.currentView = viewId;
  };
  private _dataSource?: DataSource;
  public get dataSource(): DataSource {
    if (!this._dataSource) {
      this._dataSource = new DatabaseBlockDataSource(this.model);
    }
    return this._dataSource;
  }

  private viewMap: Record<string, TableViewManager> = {};

  private getView(id: string): TableViewManager {
    if (!this.viewMap[id]) {
      this.viewMap[id] = new DatabaseTableViewManager(
        () => {
          const view = this.model.views.find(v => v.id === id);
          if (!view || view.mode !== 'table') {
            throw new Error(`view ${id} not found`);
          }
          return view;
        },
        update => this.model.updateView(id, update),
        this.dataSource
      );
    }
    return this.viewMap[id];
  }

  override render() {
    const views = this.model.views;
    const current = views.find(v => v.id === this.currentView) ?? views[0];
    const databaseTag = literal`affine-database-${unsafeStatic(current.mode)}`;
    const view = this.root.page.awarenessStore.getFlag('enable_database_filter')
      ? html` <database-view-header
          .currentView="${current.id}"
          .setViewId="${this._setViewId}"
          .model="${this.model}"
        ></database-view-header>`
      : '';
    const currentViewManager = this.getView(current.id);
    const blockOperation: BlockOperation = {
      copy: this.model.copy,
      delete: this.model.delete,
    };
    /* eslint-disable lit/binding-positions, lit/no-invalid-html */
    return html`
      <div class='toolbar-hover-container'>
        ${view}
        <${databaseTag}
          .titleText='${this.model.title}'
          .root='${this.root}'
          .blockOperation='${blockOperation}'
          .tableViewManager='${currentViewManager}'
          .modalMode='${this.modalMode}'
          class='affine-block-element'
        ></${databaseTag}>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-database': DatabaseBlockComponent;
  }
}
