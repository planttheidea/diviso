import { applyMiddleware } from './applyMiddleware';
import { compose } from './compose';
import {
  INIT_ACTION_TYPE,
  REPLACE_ACTION_TYPE,
  $$observable,
} from './constants';
import { composeWithDevTools } from './devtools';
import { createReducer } from './reducer';
import {
  getActionPartId,
  getActionPartIdDevTools,
  getStatefulPartMap,
  kindOf,
  noop,
  updateUniqueList,
} from './utils';
import {
  isPartAction,
  isPartActionDevTools,
  isPlainObject,
  isSelectablePart,
} from './validate';

import {
  Action,
  AnyAction,
  AnySelectPart,
  AnyStatefulPart,
  AnySelectablePart,
  ConfigureStoreOptions,
  Dispatch,
  Enhancers,
  ExtendState,
  GetState,
  GetVersion,
  Listener,
  Middlewares,
  Notifier,
  Observer,
  PartId,
  PartState,
  PreloadedState,
  Reducer,
  Store,
  StoreEnhancer,
  EnhancedStore,
  CombinedPartsState,
  StoreState,
} from './types';

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

export function createStoreFactory<Parts extends readonly AnyStatefulPart[]>(
  parts: Parts,
  devTools: boolean
) {
  const partMap = getStatefulPartMap(parts);
  const isPartSpecificAction = devTools ? isPartActionDevTools : isPartAction;
  const getPartId = devTools ? getActionPartIdDevTools : getActionPartId;

  return function createStore<
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
    const partListenerMap = {} as Record<
      number,
      [Listener[] | null, Listener[]]
    >;

    let currentReducer = reducer;
    let currentState = preloadedState as State;

    let dispatching = false;
    let version = 0;

    let notifier: Notifier = (notify) => {
      notify();
    };
    let notifyPartsQueue: AnySelectablePart[] = [];
    let dispatchListeners: Listener[] | null = [];
    let nextDispatchListeners = dispatchListeners!;
    let stateListeners: Listener[] | null = [];
    let nextStateListeners = stateListeners!;

    /**
     * Add the Part id as a unique entry to the queue to be notified, ensuring that any dependents
     * that also need to be notified are included and in the order needed for future gets.
     */
    function addPartsToNotify(
      partsToNotify: PartId[],
      part: AnySelectablePart
    ) {
      const index = partsToNotify.indexOf(part.id);

      if (index === -1) {
        partsToNotify.push(part.id);
      } else if (index < partsToNotify.length - 1) {
        partsToNotify.splice(index, 1);
        partsToNotify.push(part.id);
      }

      for (let index = 0; index < part.d.length; ++index) {
        addPartsToNotify(partsToNotify, part.d[index]!);
      }
    }

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

      const prevState = currentState;

      try {
        dispatching = true;
        currentState = currentReducer(currentState, action);
      } finally {
        dispatching = false;
      }

      notify(action, prevState !== currentState);

      return action;
    }

    /**
     * Reads the state tree managed by the store.
     */
    function getCurrentState(): State {
      if (dispatching) {
        throw new Error(
          'You may not call store.getState() while the reducer is executing. ' +
            'The reducer has already received the state as an argument. ' +
            'Pass it down from the top reducer instead of reading it from the store.'
        );
      }

      return currentState as State;
    }

    const getState = createGetState(getCurrentState, getVersion);

    function getVersion(): number {
      return version;
    }

    function notify(action: any, stateUpdated: boolean): void {
      notifyDispatchListeners();

      if (stateUpdated) {
        if (isPartSpecificAction(action)) {
          const id = getPartId(action as any);
          const part = partMap[id];

          if (!part) {
            throw new Error(
              `Part with id ${id} not found. Is it included in this store?`
            );
          }

          // Only queue the part notification if state has changed, otherwise
          // it will cause unnecessary work.
          queuePartsToNotify(part);
        }

        notifier(notifyStateListeners);
      }
    }

    function notifyDispatchListeners() {
      const listeners = (dispatchListeners = nextDispatchListeners);
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i]!;
        listener();
      }
    }

    function notifyStateListeners() {
      const listeners = (stateListeners = nextStateListeners);
      for (let index = 0; index < listeners.length; ++index) {
        listeners[index]!();
      }

      const nextNotifyPartsQueue = notifyPartsQueue;

      notifyPartsQueue = [];

      // Delay the construction of parts to notify until notification is required, in case there are
      // timing concidences related to parts added / removed as dependents, which could impact
      // the notification tree.
      const partsToNotify: PartId[] = [];
      for (let index = 0; index < nextNotifyPartsQueue.length; ++index) {
        addPartsToNotify(partsToNotify, nextNotifyPartsQueue[index]!);
      }

      for (let index = 0; index < partsToNotify.length; ++index) {
        const partListeners = partListenerMap[partsToNotify[index]!];

        if (!partListeners) {
          continue;
        }

        const listeners = (partListeners[0] = partListeners[1]);
        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]!();
        }
      }
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

    function queuePartsToNotify(part: AnyStatefulPart): AnyStatefulPart[] {
      const descendantParts: AnyStatefulPart[] = [];

      for (let index = 0; index < part.c.length; ++index) {
        queuePartsToNotify(part.c[index]!);
      }

      updateUniqueList(notifyPartsQueue, part);

      return descendantParts;
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
      (currentReducer as unknown as Reducer<NewState, NewActions>) =
        nextReducer;

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

    function setNotifier(nextNotifier: Notifier): void {
      notifier = nextNotifier;
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
      updateStateListeners(listener, true);

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
        updateStateListeners(listener, false);
      };
    }

    function subscribeToDispatch(listener: () => void) {
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

    function subscribeToPart(part: AnySelectablePart, listener: Listener) {
      if (typeof listener !== 'function') {
        throw new Error(
          `Expected the listener to be a function; received '${typeof listener}'`
        );
      }

      if (!isSelectablePart(part)) {
        return noop;
      }

      if (!partListenerMap[part.id]) {
        const initialListeners: Listener[] = [];

        partListenerMap[part.id] = [initialListeners, initialListeners];
      }

      if ((part as any).b === false) {
        subscribe(listener);
      }

      let subscribed = true;
      updatePartListeners(part, listener, true);

      return () => {
        if (!subscribed) {
          return;
        }

        subscribed = false;
        updatePartListeners(part, listener, false);
      };
    }

    /**
     * This makes a shallow copy of the listeners for the specific
     * Part, so we can use its next listeners as a temporary list
     * while dispatching.
     *
     * This prevents any bugs around consumers calling
     * subscribe/unsubscribe in the middle of a dispatch.
     */
    function updatePartListeners(
      part: AnySelectablePart,
      listener: Listener,
      add: boolean
    ) {
      const partListeners = partListenerMap[part.id]!;

      let [, nextPartListeners] = partListeners;

      if (nextPartListeners === partListeners[0]) {
        nextPartListeners = partListeners[1] = nextPartListeners.slice(0);
      }

      if (add) {
        nextPartListeners.push(listener);
      } else {
        const index = nextPartListeners.indexOf(listener);

        if (index === 0 && nextPartListeners.length === 1) {
          delete partListenerMap[part.id];
        } else if (index !== -1) {
          nextPartListeners.splice(index, 1);
          partListeners[0] = null;
        }
      }
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
        nextDispatchListeners.splice(
          nextDispatchListeners.indexOf(listener),
          1
        );
        dispatchListeners = null;
      }
    }

    /**
     * This makes a shallow copy of stateListeners so we can use
     * nextStateListeners as a temporary list while dispatching.
     *
     * This prevents any bugs around consumers calling
     * subscribe/unsubscribe in the middle of a dispatch.
     */
    function updateStateListeners(listener: Listener, add: boolean) {
      if (nextStateListeners === stateListeners) {
        nextStateListeners = stateListeners.slice(0);
      }

      if (add) {
        nextStateListeners.push(listener);
      } else {
        nextStateListeners.splice(nextStateListeners.indexOf(listener), 1);
        stateListeners = null;
      }
    }

    // When a store is created, an "INIT" action is dispatched so that every
    // reducer returns their initial state. This effectively populates
    // the initial state tree.
    dispatch({ type: INIT_ACTION_TYPE } as ActionObject);

    const store = {
      dispatch: dispatch as Dispatch<ActionObject>,
      subscribe,
      subscribeToDispatch,
      subscribeToPart,
      getState,
      getVersion,
      replaceReducer,
      setNotifier,
      [$$observable]: observable,
    } as unknown as Store<
      ExtendState<State, StateExtension>,
      ActionObject,
      StateExtension,
      StoreExtension
    >;

    return store;
  };
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
    parts,
    otherReducer,
    middleware = [],
    devTools = true,
    preloadedState,
    enhancers,
  } = options || {};

  const partMap = getStatefulPartMap(parts);
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

  let finalCompose = compose;

  if (devTools) {
    finalCompose = composeWithDevTools({
      // Enable capture of stack traces for dispatched Redux actions
      trace: !IS_PRODUCTION,
      ...(typeof devTools === 'object' && devTools),
    });
  }

  let storeEnhancers: Enhancers = [middlewareEnhancer];

  if (Array.isArray(enhancers)) {
    storeEnhancers = [middlewareEnhancer, ...enhancers];
  } else if (typeof enhancers === 'function') {
    storeEnhancers = enhancers(storeEnhancers);
  }

  const composedEnhancer = finalCompose(
    ...storeEnhancers
  ) as StoreEnhancer<any>;
  const createStore = composedEnhancer(createStoreFactory(parts, !!devTools));

  const store = createStore(
    reducer,
    preloadedState as PreloadedState<ReturnType<typeof reducer>>
  );

  if (devTools) {
    store.getState = createGetState(function getLiftedState(): StoreState<
      Parts,
      OtherReducerState
    > {
      const { computedStates, currentStateIndex } =
        store.liftedStore.getState();

      return computedStates[currentStateIndex]!.state;
    });

    store.subscribeToDispatch = store.liftedStore.subscribeToDispatch;
    store.subscribeToPart = store.liftedStore.subscribeToPart;
  }

  return store;
}
