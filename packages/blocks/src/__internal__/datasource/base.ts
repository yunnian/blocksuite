import type { Slot } from '@blocksuite/global/utils';

import type { InsertPosition } from '../../database-block/index.js';
import { DEFAULT_COLUMN_WIDTH } from '../../database-block/table/consts.js';

export interface DataSource {
  properties: string[];
  rows: string[];
  cellGetValue: (rowId: string, propertyId: string) => unknown;
  cellGetRenderValue: (rowId: string, propertyId: string) => unknown;
  cellChangeValue: (rowId: string, propertyId: string, value: unknown) => void;
  rowAdd: (insertPosition: InsertPosition) => string;
  rowDelete: (ids: string[]) => void;
  propertyGetName: (propertyId: string) => string;
  propertyGetDefaultWidth: (propertyId: string) => number;
  propertyGetType: (propertyId: string) => string;
  propertyGetData: (propertyId: string) => Record<string, unknown>;
  propertyChangeName: (propertyId: string, name: string) => void;
  propertyChangeType: (propertyId: string, type: string) => void;
  propertyChangeData: (
    propertyId: string,
    data: Record<string, unknown>
  ) => void;
  propertyAdd: (insertPosition: InsertPosition) => string;
  propertyDelete: (id: string) => void;
  propertyDuplicate: (columnId: string) => string;

  /**
   * @deprecated
   */
  captureSync(): void;

  slots: {
    update: Slot;
  };
}

export abstract class BaseDataSource implements DataSource {
  public abstract cellChangeValue(
    rowId: string,
    propertyId: string,
    value: unknown
  ): void;

  public abstract cellGetRenderValue(
    rowId: string,
    propertyId: string
  ): unknown;

  public abstract cellGetValue(rowId: string, propertyId: string): unknown;

  public abstract properties: string[];

  public abstract propertyAdd(insertPosition: InsertPosition): string;

  public abstract propertyChangeData(
    propertyId: string,
    data: Record<string, unknown>
  ): void;

  public abstract propertyChangeName(propertyId: string, name: string): void;

  public abstract propertyChangeType(propertyId: string, type: string): void;

  public abstract propertyDelete(id: string): void;

  public abstract propertyDuplicate(columnId: string): string;

  public abstract propertyGetData(propertyId: string): Record<string, unknown>;

  public propertyGetDefaultWidth(propertyId: string): number {
    return DEFAULT_COLUMN_WIDTH;
  }

  public abstract propertyGetName(propertyId: string): string;

  public abstract propertyGetType(propertyId: string): string;

  public abstract rowAdd(insertPosition: InsertPosition): string;

  public abstract rowDelete(ids: string[]): void;

  public abstract rows: string[];
  public abstract slots: {
    update: Slot;
  };

  public captureSync(): void {
    //
  }
}
