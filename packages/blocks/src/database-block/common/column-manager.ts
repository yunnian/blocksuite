import { assertExists } from '@blocksuite/store';
import type { TemplateResult } from 'lit';

import type { TType } from '../logical/typesystem.js';

type JSON =
  | null
  | number
  | string
  | boolean
  | JSON[]
  | {
      [k: string]: JSON;
    };

export type ColumnOps<
  ColumnData extends Record<string, unknown> = Record<string, never>,
  CellData = unknown
> = {
  defaultData: () => ColumnData;
  type: (data: ColumnData) => TType;
  configRender: (data: ColumnData) => TemplateResult<1>;
  cellToString: (data: CellData, colData: ColumnData) => string;
  cellToJson: (data: CellData, colData: ColumnData) => JSON;
};

type ConvertFunction<
  FromColumn extends Record<string, unknown>,
  FromCell,
  ToColumn extends Record<string, unknown>,
  ToCell
> = (
  column: FromColumn,
  cells: (FromCell | undefined)[]
) => {
  column: ToColumn;
  cells: (ToCell | undefined)[];
};

class ColumnManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map = new Map<string, ColumnHelper<any, any>>();
  private convert = new Map<
    string,
    (
      column: Record<string, unknown>,
      cells: unknown[]
    ) => {
      column: Record<string, unknown>;
      cells: unknown[];
    }
  >();

  getColumn(type: string) {
    const column = this.map.get(type);
    if (!column) {
      throw new Error(`${type} is not exist`);
    }
    return column;
  }

  register<CellData, T extends Record<string, unknown> = Record<string, never>>(
    type: string,
    ops: ColumnOps<T, CellData>
  ) {
    const helper = new ColumnHelper(type, ops);
    this.map.set(type, helper);
    return helper;
  }

  toString(type: string, cellData: unknown, colData: unknown) {
    return this.map.get(type)?.toString(cellData, colData);
  }

  registerConvert<
    FromCell,
    ToCell,
    FromColumn extends Record<string, unknown>,
    ToColumn extends Record<string, unknown>
  >(
    from: ColumnHelper<FromColumn, FromCell>,
    to: ColumnHelper<ToColumn, ToCell>,
    convert: ConvertFunction<FromColumn, FromCell, ToColumn, ToCell>
  ) {
    this.convert.set(`${from.type}|${to.type}`, convert as never);
  }

  convertCell(
    from: string,
    to: string,
    column: Record<string, unknown>,
    cells: unknown[]
  ) {
    return this.convert.get(`${from}|${to}`)?.(column, cells);
  }

  create(targetType: string, name: string, data?: unknown) {
    return this.getColumn(targetType)?.create(name, data);
  }

  defaultData(type: string): Record<string, unknown> {
    return this.getColumn(type)?.defaultData();
  }

  typeOf(type: string, data: unknown): TType {
    const dataType = this.map.get(type)?.dataType(data);
    assertExists(dataType);
    return dataType;
  }
}

class ColumnHelper<
  T extends Record<string, unknown> = Record<string, never>,
  CellData = unknown
> {
  constructor(
    public readonly type: string,
    public ops: ColumnOps<T, CellData>
  ) {}

  create(
    name: string,
    data?: T
  ): {
    type: string;
    name: string;
    data: T;
  } {
    return {
      type: this.type,
      name,
      data: data ?? this.ops.defaultData(),
    };
  }

  defaultData() {
    return this.ops.defaultData();
  }

  createWithId(
    id: string,
    name: string,
    data?: T
  ): {
    type: string;
    name: string;
    data: T;
    id: string;
  } {
    return {
      id,
      type: this.type,
      name,
      data: data ?? this.ops.defaultData(),
    };
  }

  render(data: T) {
    return this.ops.configRender(data);
  }

  dataType(data: T) {
    return this.ops.type(data);
  }

  toString(cellData: CellData, colData: T): string {
    return this.ops.cellToString(cellData, colData);
  }

  toJson(cellData: CellData, colData: T): JSON {
    return this.ops.cellToJson(cellData, colData);
  }
}

export const columnManager = new ColumnManager();
