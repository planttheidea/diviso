import thunkMiddleware from 'redux-thunk';
import { applyMiddleware } from './applyMiddleware';
import { compose } from './compose';
import {
  INIT_ACTION_TYPE,
  REPLACE_ACTION_TYPE,
  $$observable,
} from './constants';
import { composeWithDevTools } from './devtools';
import { createEnhancer } from './enhancer';
import { createReducer } from './reducer';
import { getStatefulPartMap, kindOf } from './utils';
import { isPlainObject, isSelectablePart } from './validate';

import type { ThunkAction } from 'redux-thunk';
import type { Action, AnyAction } from './actions';
import type { DevToolsEnhancerOptions } from './devtools';
import type {
  AnyPart,
  AnySelectPart,
  AnySelectablePart,
  AnyStatefulPart,
  CombinedPartsState,
  PartId,
  PartState,
} from './part';
import type { Reducer, ReducersMapObject } from './reducer';
import type { IsAny, NoInfer, Thunk, UnionToIntersection } from './utils';

/**
 * Extend the state
 *
 * This is used by store enhancers and store creators to extend state.
 * If there is no state extension, it just returns the state, as is, otherwise
 * it returns the state joined with its extension.
 *
 * Reference for future devs:
 * https://github.com/microsoft/TypeScript/issues/31751#issuecomment-498526919
 */
export type ExtendState<State, Extension> = [Extension] extends [never]
  ? State
  : State & Extension;

/**
 * Internal "virtual" symbol used to make the `CombinedState` type unique.
 */
declare const $CombinedState: unique symbol;

/**
 * State base type for reducers created with `combineReducers()`.
 *
 * This type allows the `createStore()` method to infer which levels of the
 * preloaded state can be partial.
 *
 * Because Typescript is really duck-typed, a type needs to have some
 * identifying property to differentiate it from other types with matching
 * prototypes for type checking purposes. That's why this type has the
 * `$CombinedState` symbol property. Without the property, this type would
 * match any object. The symbol doesn't really exist because it's an internal
 * (i.e. not exported), and internally we never check its value. Since it's a
 * symbol property, it's not expected to be unumerable, and the value is
 * typed as always undefined, so its never expected to have a meaningful
 * value anyway. It just makes this type distinguishable from plain `{}`.
 */
interface EmptyObject {
  readonly [$CombinedState]?: undefined;
}
export type CombinedState<State> = EmptyObject & State;

/**
 * Recursively makes combined state objects partial. Only combined state _root
 * objects_ (i.e. the generated higher level object with keys mapping to
 * individual reducers) are partial.
 */
export type PreloadedState<State> = Required<State> extends EmptyObject
  ? State extends CombinedState<infer PartialState>
    ? {
        [Key in keyof PartialState]?: PartialState[Key] extends object
          ? PreloadedState<PartialState[Key]>
          : PartialState[Key];
      }
    : State
  : {
      [Key in keyof State]: State[Key] extends
        | string
        | number
        | boolean
        | symbol
        ? State[Key]
        : PreloadedState<State[Key]>;
    };

export interface Dispatch<ActionObject extends Action = AnyAction> {
  /**
   * A *dispatching function* (or simply *dispatch function*) is a function that
   * accepts an action or an async action; it then may or may not dispatch one
   * or more actions to the store.
   *
   * We must distinguish between dispatching functions in general and the base
   * `dispatch` function provided by the store instance without any middleware.
   *
   * The base dispatch function *always* synchronously sends an action to the
   * store's reducer, along with the previous state returned by the store, to
   * calculate a new state. It expects actions to be plain objects ready to be
   * consumed by the reducer, or a thunk function that when called returns this
   * plain object action.
   *
   * Middleware wraps the base dispatch function. It allows the dispatch
   * function to handle async actions in addition to actions. Middleware may
   * transform, delay, ignore, or otherwise interpret actions or async actions
   * before passing them to the next middleware.
   *
   * @template thunkAction the thunk to be dispatched
   */
  <Result, State, _ExtraThunkArg, DispatchedAction extends ActionObject>(
    thunkAction: Thunk<Result, State>
  ): DispatchedAction;

  /**
   * A *dispatching function* (or simply *dispatch function*) is a function that
   * accepts an action or an async action; it then may or may not dispatch one
   * or more actions to the store.
   *
   * We must distinguish between dispatching functions in general and the base
   * `dispatch` function provided by the store instance without any middleware.
   *
   * The base dispatch function *always* synchronously sends an action to the
   * store's reducer, along with the previous state returned by the store, to
   * calculate a new state. It expects actions to be plain objects ready to be
   * consumed by the reducer, or a thunk function that when called returns this
   * plain object action.
   *
   * Middleware wraps the base dispatch function. It allows the dispatch
   * function to handle async actions in addition to actions. Middleware may
   * transform, delay, ignore, or otherwise interpret actions or async actions
   * before passing them to the next middleware.
   *
   * @template ActionObject The type of things (actions or otherwise) which may be
   *   dispatched.
   */
  <DispatchedAction extends ActionObject>(
    action: DispatchedAction
  ): DispatchedAction;

  <Result, State, ExtraThunkArg, DispatchedAction extends ActionObject>(
    action: Action | ThunkAction<Result, State, ExtraThunkArg, DispatchedAction>
  ): Action | Result;
}

declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
  }
}

/**
 * ActionObject minimal observable of state changes.
 * For more information, see the observable proposal:
 * https://github.com/tc39/proposal-observable
 */
export type Observable<Type> = {
  /**
   * The minimal observable subscription method.
   * @param {Object} observer Any object that can be used as an observer.
   * The observer object should have a `next` method.
   * @returns {subscription} An object with an `unsubscribe` method that can
   * be used to unsubscribe the observable from the store, and prevent further
   * emission of values from the observable.
   */
  subscribe: (observer: Observer<Type>) => { unsubscribe: Unsubscribe };
  [Symbol.observable](): Observable<Type>;
};

export interface GetState<State = any> {
  <CompleteState extends State>(): CompleteState;
  <Part extends AnyPart>(part: Part): PartState<Part>;
}

export type GetVersion = () => number;

/**
 * An Observer is used to receive data from an Observable, and is supplied as
 * an argument to subscribe.
 */
export type Observer<Type> = {
  next?(value: Type): void;
};

export type Listener = () => void;
export type Notify = () => void;
export type Notifier = (notify: Notify) => void;
export type Subscribe = (listener: Listener) => Unsubscribe;
export type SubscribeToPart = (
  part: AnySelectablePart,
  listener: Listener
) => Unsubscribe;
export type Unsubscribe = () => void;

/**
 * ActionObject store is an object that holds the application's state tree.
 * There should only be a single store in a Redux app, as the composition
 * happens on the reducer level.
 *
 * @template State The type of state held by this store.
 * @template ActionObject the type of actions which may be dispatched by this store.
 * @template StateExtension any extension to state from store enhancers
 * @template StoreExtension any extensions to the store from store enhancers
 */
export interface BaseStore<
  State = any,
  ActionObject extends Action = AnyAction,
  StateExtension = never,
  StoreExtension = {}
> {
  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will be
   * considered the **next** state of the tree, and the change listeners will
   * be notified.
   *
   * The base implementation only supports plain object actions. If you want
   * to dispatch a Promise, an Observable, a thunk, or something else, you
   * need to wrap your store creating function into the corresponding
   * middleware. For example, see the documentation for the `redux-thunk`
   * package. Even the middleware will eventually dispatch plain object
   * actions using this method.
   *
   * @param action ActionObject plain object representing “what changed”. It is a good
   *   idea to keep actions serializable so you can record and replay user
   *   sessions, or use the time travelling `redux-devtools`. An action must
   *   have a `type` property which may not be `undefined`. It is a good idea
   *   to use string constants for action types.
   *
   * @returns For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  dispatch: Dispatch<ActionObject>;

  /**
   * Reads the state tree managed by the store, or if a Part is passed, returns
   * the state specific to that Part.
   *
   * @param [part] The part to get the state of.
   * @returns The state requested.
   */
  getState: GetState<State>;

  /**
   * Adds a change listener, which is called any time state changes. You may then
   * call getState() to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked,
   * this will not have any effect on the `dispatch()` that is currently in
   * progress. However, the next `dispatch()` call, whether nested or not,
   * will use a more recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all states changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param listener ActionObject callback to be invoked on every dispatch.
   * @returns ActionObject function to remove this change listener.
   */
  subscribe: Subscribe;

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param nextReducer The reducer for the store to use instead.
   */
  replaceReducer<NewState, NewActions extends Action>(
    nextReducer: Reducer<NewState, NewActions>
  ): Store<
    ExtendState<NewState, StateExtension>,
    NewActions,
    StateExtension,
    StoreExtension
  >;

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} ActionObject minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  [Symbol.observable](): Observable<State>;
}

export type Store<
  State = any,
  ActionObject extends Action = AnyAction,
  StateExtension = never,
  StoreExtension = {}
> = Omit<
  BaseStore<
    ExtendState<State, StateExtension>,
    ActionObject,
    StateExtension,
    StoreExtension
  >,
  keyof StoreExtension
> &
  StoreExtension;

/**
 * ActionObject store creator is a function that creates a Redux store. Like with
 * dispatching function, we must distinguish the base store creator,
 * `createStore(reducer, preloadedState)` exported from the Redux package, from
 * store creators that are returned from the store enhancers.
 *
 * @template State The type of state to be held by the store.
 * @template ActionObject The type of actions which may be dispatched.
 * @template StoreExtension Store extension that is mixed in to the Store type.
 * @template StateExtension State extension that is mixed into the state type.
 */
export interface StoreCreator {
  <
    State,
    ActionObject extends Action,
    StoreExtension = {},
    StateExtension = never
  >(
    reducer: Reducer<State, ActionObject>,
    enhancer?: StoreEnhancer<StoreExtension, StateExtension>
  ): Store<
    ExtendState<State, StateExtension>,
    ActionObject,
    StateExtension,
    StoreExtension
  > &
    StoreExtension;
  <
    State,
    ActionObject extends Action,
    StoreExtension = {},
    StateExtension = never
  >(
    reducer: Reducer<State, ActionObject>,
    preloadedState?: PreloadedState<State>,
    enhancer?: StoreEnhancer<StoreExtension>
  ): Store<
    ExtendState<State, StateExtension>,
    ActionObject,
    StateExtension,
    StoreExtension
  > &
    StoreExtension;
}

/**
 * ActionObject store enhancer is a higher-order function that composes a store creator
 * to return a new, enhanced store creator. This is similar to middleware in
 * that it allows you to alter the store interface in a composable way.
 *
 * Store enhancers are much the same concept as higher-order components in
 * React, which are also occasionally called “component enhancers”.
 *
 * Because a store is not an instance, but rather a plain-object collection of
 * functions, copies can be easily created and modified without mutating the
 * original store. There is an example in `compose` documentation
 * demonstrating that.
 *
 * Most likely you'll never write a store enhancer, but you may use the one
 * provided by the developer tools. It is what makes time travel possible
 * without the app being aware it is happening. Amusingly, the Redux
 * middleware implementation is itself a store enhancer.
 *
 * @template StoreExtension Store extension that is mixed into the Store type.
 * @template StateExtension State extension that is mixed into the state type.
 */
export type StoreEnhancer<StoreExtension = {}, StateExtension = never> = (
  next: StoreEnhancerStoreCreator<StoreExtension, StateExtension>
) => StoreEnhancerStoreCreator<StoreExtension, StateExtension>;
export type StoreEnhancerStoreCreator<
  StoreExtension = {},
  StateExtension = never
> = <State = any, ActionObject extends Action = AnyAction>(
  reducer: Reducer<State, ActionObject>,
  preloadedState?: PreloadedState<State>
) => Store<
  ExtendState<State, StateExtension>,
  ActionObject,
  StateExtension,
  StoreExtension
>;

export interface PartMap {
  [$$part: PartId]: AnyStatefulPart;
}

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

export type Middlewares<State> = ReadonlyArray<Middleware<any, State>>;
export type Enhancers = ReadonlyArray<StoreEnhancer>;

export type ExtractStoreExtensions<E> = E extends any[]
  ? UnionToIntersection<
      E[number] extends StoreEnhancer<infer Ext>
        ? Ext extends {}
          ? Ext
          : {}
        : {}
    >
  : {};

type ExtractDispatchFromMiddlewareTuple<
  MiddlewareTuple extends any[],
  Acc extends {}
> = MiddlewareTuple extends [infer Head, ...infer Tail]
  ? ExtractDispatchFromMiddlewareTuple<
      Tail,
      Acc & (Head extends Middleware<infer D> ? IsAny<D, {}, D> : {})
    >
  : Acc;
export type ExtractDispatchExtensions<M> = M extends ReadonlyArray<Middleware>
  ? ExtractDispatchFromMiddlewareTuple<[...M], {}>
  : never;

/**
 * Callback function type, to be used in `ConfigureStoreOptions.enhancers`
 *
 * @public
 */
export type ConfigureEnhancersCallback<E extends Enhancers = Enhancers> = (
  defaultEnhancers: readonly StoreEnhancer[]
) => [...E];

export type StoreState<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState
> = Omit<OtherReducerState, keyof CombinedPartsState<Parts>> &
  CombinedPartsState<Parts>;

export interface ConfigureStoreOptions<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState = any,
  DispatachableActions extends Action = AnyAction,
  M extends Middlewares<StoreState<Parts, OtherReducerState>> = Middlewares<
    StoreState<Parts, OtherReducerState>
  >,
  E extends Enhancers = Enhancers
> {
  parts: Parts;

  /**
   * A single reducer function that will be used as the root reducer, or an
   * object of slice reducers that will be passed to `combineReducers()`.
   */
  otherReducer?:
    | Reducer<OtherReducerState, DispatachableActions>
    | ReducersMapObject<OtherReducerState, DispatachableActions>;

  /**
   * An array of Redux middleware to install. If not supplied, defaults to
   * the set of middleware returned by `getDefaultMiddleware()`.
   *
   * @example `middleware: (gDM) => gDM().concat(logger, apiMiddleware, yourCustomMiddleware)`
   * @see https://redux-toolkit.js.org/api/getDefaultMiddleware#intended-usage
   */
  middleware?: M;

  /**
   * Whether to enable Redux DevTools integration. Defaults to `true`.
   *
   * Additional configuration can be done by passing Redux DevTools options
   */
  devTools?: boolean | DevToolsEnhancerOptions;

  /**
   * The initial state, same as Redux's createStore.
   * You may optionally specify it to hydrate the state
   * from the server in universal apps, or to restore a previously serialized
   * user session. If you use `combineReducers()` to produce the root reducer
   * function (either directly or indirectly by passing an object as `reducer`),
   * this must be an object with the same shape as the reducer map keys.
   */
  /*
  Not 100% correct but the best approximation we can get:
  - if S is a `CombinedState` applying a second `CombinedState` on it does not change anything.
  - if it is not, there could be two cases:
    - `ReducersMapObject<S, A>` is being passed in. In this case, we will call `combineReducers` on it and `CombinedState<S>` is correct
    - `Reducer<S, A>` is being passed in. In this case, actually `CombinedState<S>` is wrong and `S` would be correct.
    As we cannot distinguish between those two cases without adding another generic parameter,
    we just make the pragmatic assumption that the latter almost never happens.
  */
  preloadedState?: PreloadedState<
    CombinedState<NoInfer<StoreState<Parts, OtherReducerState>>>
  >;

  /**
   * The store enhancers to apply. See Redux's `createStore()`.
   * All enhancers will be included before the DevTools Extension enhancer.
   * If you need to customize the order of enhancers, supply a callback
   * function that will receive the original array (ie, `[applyMiddleware]`),
   * and should return a new array (such as `[applyMiddleware, offline]`).
   * If you only need to add middleware, you can use the `middleware` parameter instead.
   */
  enhancers?: E | ConfigureEnhancersCallback<E>;

  /**
   * Custom notification handling of state subscribers, both for the entire state and for specific parts of it.
   */
  notifier?: Notifier;
}

export interface DivisoStore<
  State = any,
  DispatachableActions extends Action = AnyAction,
  MiddlewaresToApply extends Middlewares<State> = Middlewares<State>
> extends Store<State, DispatachableActions> {
  /**
   * The `dispatch` method of your store, enhanced by all its middlewares.
   */
  dispatch: ExtractDispatchExtensions<MiddlewaresToApply> &
    Dispatch<DispatachableActions>;

  /**
   * Reads the state tree managed by the store, or if a Part is passed, returns
   * the state specific to that Part.
   *
   * @param [part] The part to get the state of.
   * @returns The state requested.
   */
  getState: GetState<State>;

  /**
   * Returns the version of state, which updates whenever the reference changes.
   */
  getVersion: GetVersion;
  /**
   * Adds a change listener, which is called any time state changes. You may then
   * call getState() to read the current state tree inside the callback.
   *
   * You may call dispatch() from a change listener, with the following caveats:
   *
   * 1. The subscriptions are snapshotted just before every dispatch() call. If you
   *    subscribe or unsubscribe while the listeners are being invoked, this will not
   *    have any effect on the dispatch() that is currently in progress. However, the
   *    next dispatch() call, whether nested or not, will use a more recent snapshot
   *    of the subscription list.
   * 2. The listener should not expect to see all states changes, as the state might
   *    have been updated multiple times during a nested dispatch() before the listener
   *    is called. It is, however, guaranteed that all subscribers registered before the
   *    dispatch() started will be called with the latest state by the time it exits.
   *
   * @param listener A callback to be invoked whenver state changes.
   * @returns A function to remove this change listener.
   */
  subscribe: Store['subscribe'];
  /**
   * Adds a change listener. It will be called any time an action is dispatched, and some
   * part of the state tree may potentially have changed. You may then call getState() to
   * read the current state tree inside the callback.
   *
   * You may call dispatch() from a change listener, with the following caveats:
   *
   * 1. The subscriptions are snapshotted just before every dispatch() call. If you
   *    subscribe or unsubscribe while the listeners are being invoked, this will not
   *    have any effect on the dispatch() that is currently in progress. However, the
   *    next dispatch() call, whether nested or not, will use a more recent snapshot
   *    of the subscription list.
   * 2. The listener should not expect to see all states changes, as the state might
   *    have been updated multiple times during a nested dispatch() before the listener
   *    is called. It is, however, guaranteed that all subscribers registered before the
   *    dispatch() started will be called with the latest state by the time it exits.
   *
   * @param listener A callback to be invoked whenver state changes.
   * @returns A function to remove this change listener.
   */
  subscribeToDispatch: Store['subscribe'];
  /**
   * Adds a change listener, which is called any time state changes. You may then
   * call getState() to read the current state tree inside the callback.
   *
   * You may call dispatch() from a change listener, with the following caveats:
   *
   * 1. The subscriptions are snapshotted just before every dispatch() call. If you
   *    subscribe or unsubscribe while the listeners are being invoked, this will not
   *    have any effect on the dispatch() that is currently in progress. However, the
   *    next dispatch() call, whether nested or not, will use a more recent snapshot
   *    of the subscription list.
   * 2. The listener should not expect to see all states changes, as the state might
   *    have been updated multiple times during a nested dispatch() before the listener
   *    is called. It is, however, guaranteed that all subscribers registered before the
   *    dispatch() started will be called with the latest state by the time it exits.
   *
   * @param part The part that, when updated, will notify the listener.
   * @param listener A callback to be invoked whenver state for the part changes.
   * @returns A function to remove this change listener.
   */
  subscribeToPart: SubscribeToPart;
}

export type EnhancedStore<
  State = any,
  DispatachableActions extends Action = AnyAction,
  MiddlewaresToApply extends Middlewares<State> = Middlewares<State>,
  EnhancersToApply extends Enhancers = Enhancers
> = DivisoStore<State, DispatachableActions, MiddlewaresToApply> &
  ExtractStoreExtensions<EnhancersToApply>;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function createGetState<State>(
  originalGetState: Store<State>['getState'],
  getVersion?: GetVersion
): GetState<State> {
  function getState<Part extends AnySelectPart | AnyStatefulPart>(
    part?: Part
  ): Part extends any ? PartState<Part> : State {
    return part && isSelectablePart(part)
      ? part.g(getState, getVersion)
      : originalGetState();
  }

  return getState;
}

export function createBaseStore<
  State,
  ActionObject extends Action,
  StoreExtension = {},
  StateExtension = never
>(
  reducer: Reducer<State, ActionObject>,
  preloadedState: PreloadedState<State> | undefined
): Store<
  ExtendState<State, StateExtension>,
  ActionObject,
  StateExtension,
  StoreExtension
> {
  // `currentReducer` is actually reassigned, ESLint just doesn't see it.
  // eslint-disable-next-line
  let currentReducer = reducer;
  let currentState = preloadedState as State;

  let dispatching = false;

  let dispatchListeners: Listener[] | null = [];
  let nextDispatchListeners = dispatchListeners!;

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param action ActionObject plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action: ActionObject) {
    if (!isPlainObject(action)) {
      throw new Error(
        `Actions must be plain objects. Instead, the actual type was: '${kindOf(
          action
        )}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`
      );
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.'
      );
    }

    if (dispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      dispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      dispatching = false;
    }

    const listeners = (dispatchListeners = nextDispatchListeners);
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]!;
      listener();
    }

    return action;
  }

  /**
   * Reads the state tree managed by the store.
   */
  function getState(): State {
    if (dispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      );
    }

    return currentState as State;
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns ActionObject minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe;
    return {
      /**
       * The minimal observable subscription method.
       * @param observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer: unknown) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError(
            `Expected the observer to be an object. Instead, received: '${kindOf(
              observer
            )}'`
          );
        }

        function observeState() {
          const observerAsObserver = observer as Observer<State>;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }

        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return { unsubscribe };
      },

      [$$observable]() {
        return this;
      },
    };
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param nextReducer The reducer for the store to use instead.
   * @returns The same store instance with a new reducer in place.
   */
  function replaceReducer<NewState, NewActions extends ActionObject>(
    nextReducer: Reducer<NewState, NewActions>
  ): Store<
    ExtendState<NewState, StateExtension>,
    NewActions,
    StateExtension,
    StoreExtension
  > {
    if (typeof nextReducer !== 'function') {
      throw new Error(
        `Expected the nextReducer to be a function. Instead, received: '${kindOf(
          nextReducer
        )}`
      );
    }

    // TODO: do this more elegantly
    (currentReducer as unknown as Reducer<NewState, NewActions>) = nextReducer;

    // This action has a similar effect to ActionTypes.INIT.
    // Any reducers that existed in both the new and old reducer
    // will receive the previous state. This effectively populates
    // the new state tree with any relevant data from the old one.
    dispatch({ type: REPLACE_ACTION_TYPE } as ActionObject);
    // change the type of the store by casting it to the new store
    return store as unknown as Store<
      ExtendState<NewState, StateExtension>,
      NewActions,
      StateExtension,
      StoreExtension
    >;
  }

  function subscribe(listener: () => void) {
    if (typeof listener !== 'function') {
      throw new Error(
        `Expected the listener to be a function. Instead, received: '${kindOf(
          listener
        )}'`
      );
    }

    if (dispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api/store#subscribelistener for more details.'
      );
    }

    let isSubscribed = true;
    updateDispatchListeners(listener, true);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      if (dispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api/store#subscribelistener for more details.'
        );
      }

      isSubscribed = false;
      updateDispatchListeners(listener, false);
    };
  }

  /**
   * This makes a shallow copy of dispatchListeners so we can use
   * nextStateListeners as a temporary list while dispatching.
   *
   * This prevents any bugs around consumers calling
   * subscribe/unsubscribe in the middle of a dispatch.
   */
  function updateDispatchListeners(listener: Listener, add: boolean) {
    if (nextDispatchListeners === dispatchListeners) {
      nextDispatchListeners = dispatchListeners.slice(0);
    }

    if (add) {
      nextDispatchListeners.push(listener);
    } else {
      nextDispatchListeners.splice(nextDispatchListeners.indexOf(listener), 1);
      dispatchListeners = null;
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: INIT_ACTION_TYPE } as ActionObject);

  const store = {
    dispatch: dispatch as Dispatch<ActionObject>,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable,
  } as unknown as Store<
    ExtendState<State, StateExtension>,
    ActionObject,
    StateExtension,
    StoreExtension
  >;

  return store;
}

export function createStore<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState = any,
  DispatachableActions extends Action = AnyAction,
  MiddlewaresToApply extends Middlewares<CombinedPartsState<Parts>> = [],
  EnhancersToApply extends Enhancers = [StoreEnhancer]
>(
  options: ConfigureStoreOptions<
    Parts,
    OtherReducerState,
    DispatachableActions,
    MiddlewaresToApply,
    EnhancersToApply
  >
): EnhancedStore<
  StoreState<Parts, OtherReducerState>,
  DispatachableActions,
  MiddlewaresToApply,
  EnhancersToApply
> {
  const {
    devTools = true,
    enhancers,
    middleware = [thunkMiddleware],
    notifier = defaultNotifier,
    otherReducer,
    parts,
    preloadedState,
  } = options || {};

  const partMap = getStatefulPartMap(parts);
  const partsEnhancer = createEnhancer({ notifier, partMap });
  const reducer = createReducer({ otherReducer, partMap, parts });

  if (
    !IS_PRODUCTION &&
    middleware.some((item: any) => typeof item !== 'function')
  ) {
    throw new Error(
      'each middleware provided to configureStore must be a function'
    );
  }

  const middlewareEnhancer = applyMiddleware(...middleware) as StoreEnhancer;
  const finalCompose = devTools
    ? composeWithDevTools({
        // Enable capture of stack traces for dispatched Redux actions
        trace: !IS_PRODUCTION,
        ...(typeof devTools === 'object' && devTools),
      })
    : compose;

  let storeEnhancers: Enhancers = [middlewareEnhancer, partsEnhancer as any];

  if (Array.isArray(enhancers)) {
    storeEnhancers = [middlewareEnhancer, ...enhancers, partsEnhancer];
  } else if (typeof enhancers === 'function') {
    storeEnhancers = enhancers(storeEnhancers);
  }

  const composedEnhancer = finalCompose(
    ...storeEnhancers
  ) as StoreEnhancer<any>;
  const createStore = composedEnhancer(createBaseStore);

  return createStore(
    reducer,
    preloadedState as PreloadedState<ReturnType<typeof reducer>>
  );
}

export function defaultNotifier(notify: Notify) {
  notify();
}
