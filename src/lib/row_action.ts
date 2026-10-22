export type RowAddAction<T, U = undefined> = U extends undefined
  ? { action: "add"; row: T }
  : { action: "add"; row: T; extras: U };

export type RowReadAction<T, U = undefined> = U extends undefined
  ? { action: "read"; index: number; row: T }
  : { action: "read"; index: number; row: T; extras: U };

export type RowUpdateAction<T, U = undefined> = U extends undefined
  ? { action: "update"; index: number; row: T }
  : { action: "update"; index: number; row: T; extras: U };

export type RowBulkUpdateAction<T, U = undefined> = U extends undefined
  ? { action: "bulkupdate"; row: T }
  : { action: "bulkupdate"; row: T; extras: U };

export type RowDeleteAction<T, U = undefined> = U extends undefined
  ? { action: "delete"; index: number; row: T }
  : { action: "delete"; index: number; row: T; extras: U };

export type RowLoadingAction = { action: "loading" };

export type RowAction<T, U = undefined> =
  | RowAddAction<T, U>
  | RowReadAction<T, U>
  | RowUpdateAction<T, U>
  | RowBulkUpdateAction<T, U>
  | RowDeleteAction<T, U>
  | RowLoadingAction;

export type RowActionSubmitFn<T, U = undefined> = (
  payload:
    RowAddAction<T, U> | RowUpdateAction<T, U> | RowBulkUpdateAction<T, U>,
) => Promise<void>;
