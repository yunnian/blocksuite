import type { InsertPosition } from '@blocksuite/blocks';
import type { Slot } from '@blocksuite/global/utils/slot.js';

import type { ColumnManager } from '../kanban/kanban-view-manager.js';
import type { FilterGroup } from './ast.js';

export interface DataViewManager{
  get id(): string;

  get name(): string;

  get filter(): FilterGroup;

  get readonly(): boolean;

  get columnManagerList(): ColumnManager[];

  get columns(): string[];

  get rows(): string[];

  setSearch(str: string): void;

  updateName(name: string): void;

  updateFilter(filter: FilterGroup): void;

  cellGetRenderValue(rowId: string, columnId: string): unknown;

  cellGetFilterValue(rowId: string, columnId: string): unknown;

  cellGetStringValue(rowId: string, columnId: string): string;

  cellUpdateRenderValue(rowId: string, columnId: string, value: unknown): void;

  rowDelete(ids: string[]): void;

  rowAdd(insertPosition: InsertPosition): string;

  columnMove(columnId: string, toAfterOfColumn: InsertPosition): void;

  columnAdd(toAfterOfColumn: InsertPosition): void;

  columnDelete(columnId: string): void;

  columnDuplicate(columnId: string): void;

  columnGet(columnId: string): ColumnManager;

  columnGetPreColumn(columnId: string): ColumnManager | undefined;

  columnGetNextColumn(columnId: string): ColumnManager | undefined;

  columnGetWidth(columnId: string): number;

  columnGetName(columnId: string): string;

  columnGetType(columnId: string): string;

  columnGetHide(columnId: string): boolean;

  columnGetData(columnId: string): Record<string, unknown>;

  columnGetIndex(columnId: string): number;

  columnGetIdByIndex(index: number): string;

  columnUpdateWidth(columnId: string, width: number): void;

  columnUpdateName(columnId: string, name: string): void;

  columnUpdateHide(columnId: string, hide: boolean): void;

  columnUpdateType(columnId: string, type: string): void;

  columnUpdateData(columnId: string, data: Record<string, unknown>): void;

  /**
   * @deprecated
   */
  captureSync(): void;

  slots: {
    update: Slot;
  };
}
export class BaseDataViewManager implements DataViewManager{

}