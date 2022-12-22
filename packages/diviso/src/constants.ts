import { createInternalActionType } from './utils';

declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
  }
}

export const $$observable = /* #__PURE__ */ (() =>
  (typeof Symbol === 'function' && Symbol.observable) || '@@observable')();

export const INIT_ACTION_TYPE = createInternalActionType('INIT');
export const REPLACE_ACTION_TYPE = createInternalActionType('REPLACE');
