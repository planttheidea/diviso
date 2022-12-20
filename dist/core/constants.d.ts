declare global {
    interface SymbolConstructor {
        readonly observable: symbol;
    }
}
export declare const $$observable: string | typeof Symbol.observable;
export declare const INIT_ACTION_TYPE: string;
export declare const REPLACE_ACTION_TYPE: string;
