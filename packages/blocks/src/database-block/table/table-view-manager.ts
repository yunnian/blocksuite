import type { Slot } from '@blocksuite/store';

import type { DataSource } from '../../__internal__/datasource/base.js';
import type { FilterGroup } from '../common/ast.js';
import type { CellRenderer } from '../common/column-manager.js';
import { columnRenderer } from '../common/column-renderer.js';
import {
  BaseDataViewColumnManager,
  BaseDataViewManager,
} from '../common/data-view-manager.js';
import type { TableViewData } from '../common/view-manager.js';
import { evalFilter } from '../logical/eval-filter.js';
import type { InsertPosition } from '../types.js';
import { insertPositionToIndex } from '../utils/insert.js';

export class DataViewTableManager extends BaseDataViewManager {
  private readonly updateView: (
    updater: (view: TableViewData) => Partial<TableViewData>
  ) => void;

  constructor(
    private getView: () => TableViewData,
    private ____updateView: (
      updater: (view: TableViewData) => Partial<TableViewData>
    ) => void,
    viewUpdatedSlot: Slot,
    dataSource: DataSource
  ) {
    super(dataSource);
    this.updateView = updater => {
      this.syncView();
      ____updateView(updater);
    };
    viewUpdatedSlot.pipe(this.slots.update);
  }

  get filter(): FilterGroup {
    return this.getView().filter;
  }

  get id() {
    return this.getView().id;
  }

  get name(): string {
    return this.getView().name;
  }

  updateFilter(filter: FilterGroup): void {
    this.updateView(() => {
      return {
        filter,
      };
    });
  }

  updateName(name: string): void {
    this.updateView(() => {
      return {
        name,
      };
    });
  }

  private syncView() {
    if (this.getView().columns.length === this.columns.length) {
      return;
    }
    this.____updateView(view => {
      return {
        columns: this.columnManagerList.map((column, i) => ({
          id: column.id,
          width: column.width,
          hide: column.hide,
        })),
      };
    });
  }

  public columnGet(columnId: string): DataViewTableColumnManager {
    return new DataViewTableColumnManager(columnId, this);
  }

  public columnGetWidth(columnId: string): number {
    return (
      this.getView().columns.find(v => v.id === columnId)?.width ??
      this.dataSource.propertyGetDefaultWidth(columnId)
    );
  }

  public columnMove(columnId: string, toAfterOfColumn: InsertPosition): void {
    this.updateView(view => {
      const columnIndex = view.columns.findIndex(v => v.id === columnId);
      if (columnIndex < 0) {
        return {};
      }
      const columns = [...view.columns];
      const [column] = columns.splice(columnIndex, 1);
      const index = insertPositionToIndex(toAfterOfColumn, columns);
      columns.splice(index, 0, column);
      return {
        columns,
      };
    });
  }

  public columnUpdateWidth(columnId: string, width: number): void {
    this.updateView(view => {
      return {
        columns: view.columns.map(v =>
          v.id === columnId ? { ...v, width: width } : v
        ),
      };
    });
  }

  public get columns(): string[] {
    const needShow = new Set(this.dataSource.properties);
    const result: string[] = [];
    this.getView().columns.forEach(v => {
      if (needShow.has(v.id)) {
        result.push(v.id);
        needShow.delete(v.id);
      }
    });
    result.push(...needShow);
    return result;
  }

  public isShow(rowId: string): boolean {
    if (this.filter.conditions.length) {
      const rowMap = Object.fromEntries(
        this.columnManagerList.map(column => [
          column.id,
          column.getFilterValue(rowId),
        ])
      );
      return evalFilter(this.filter, rowMap);
    }
    return true;
  }
}

export class DataViewTableColumnManager extends BaseDataViewColumnManager {
  constructor(propertyId: string, override viewManager: DataViewTableManager) {
    super(propertyId, viewManager);
  }

  get width(): number {
    return this.viewManager.columnGetWidth(this.id);
  }

  updateWidth(width: number): void {
    this.viewManager.columnUpdateWidth(this.id, width);
  }
}
