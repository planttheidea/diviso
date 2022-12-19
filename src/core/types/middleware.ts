import type { Dispatch } from './store';

export interface MiddlewareAPI<
  StoreDispatch extends Dispatch = Dispatch,
  State = any
> {
  dispatch: StoreDispatch;
  getState(): State;
}

/**
 * ActionObject middleware is a higher-order function that composes a dispatch function
 * to return a new dispatch function. It often turns async actions into
 * actions.
 *
 * Middleware is composable using function composition. It is useful for
 * logging actions, performing side effects like routing, or turning an
 * asynchronous API call into a series of synchronous actions.
 *
 * @template StoreDispatch The type of Dispatch of the store where this middleware is
 * @template State The type of the state supported by this middleware.
 *   installed.
 */
export interface Middleware<
  StoreDispatch extends Dispatch = Dispatch,
  State = any
> {
  (api: MiddlewareAPI<StoreDispatch, State>): (
    next: StoreDispatch
  ) => (
    action: StoreDispatch extends Dispatch<infer ActionObject>
      ? ActionObject
      : never
  ) => any;
}
