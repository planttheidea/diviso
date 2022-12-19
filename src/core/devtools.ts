import { compose } from './compose';

import type { AnyFn, DevToolsEnhancerOptions, StoreEnhancer } from './types';

type Compose = typeof compose;

interface ComposeWithDevTools {
  (options: DevToolsEnhancerOptions): Compose;
  <StoreExt>(...funcs: StoreEnhancer<StoreExt>[]): StoreEnhancer<StoreExt>;
}

/**
 * @public
 */
export const composeWithDevTools: ComposeWithDevTools =
  typeof window !== 'undefined' &&
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : function () {
        if (arguments.length === 0) {
          return;
        }

        if (typeof arguments[0] === 'object') {
          return compose;
        }

        return compose.apply(null, arguments as any as AnyFn<any, any>[]);
      };

/**
 * @public
 */
export const devToolsEnhancer: {
  (options: DevToolsEnhancerOptions): StoreEnhancer<any>;
} =
  typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__
    ? (window as any).__REDUX_DEVTOOLS_EXTENSION__
    : function () {
        return function (noop) {
          return noop;
        };
      };
