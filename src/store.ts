import { createReducer } from './reducer';
import {
  compose,
  getDescendantSlices,
  isSelectSlice,
  isSliceAction,
  isStatefulSlice,
} from './utils';

import type {
  Action,
  AnyAction,
  AnySelectSlice,
  AnyStatefulSlice,
  Dispatch,
  Listener,
  Middleware,
  MiddlewareAPI,
  Notifier,
  Notify,
  Observable,
  Observer,
  PreloadedState,
  Reducer,
  SliceId,
  SlicesState,
  SourceResult,
  Store,
  Store as StoreType,
  StoreConfig,
  StoreCreator,
  StoreEnhancer,
  Unsubscribe,
} from './types';

function getRandomString() {
  return Math.random().toString(36).substring(7).split('').join('.');
}

const INIT = `@@package/INIT${getRandomString()}`;
const REPLACE_REDUCER = `@@package/REPLACE${getRandomString()}`;

export function applyMiddleware<State, DispatchableAction extends Action>(
  middlewares: Middleware[]
) {
  return function (createStore: StoreCreator<State, DispatchableAction>) {
    return function (
      reducer: Reducer<State, DispatchableAction>,
      preloadedState: PreloadedState<State> | undefined
    ): StoreType<State, DispatchableAction> {
      const store = createStore(reducer, preloadedState);

      const dispatch: Dispatch = () => {
        throw new Error(
          'Dispatching while constructing your middleware is not allowed. ' +
            'Other middleware would not be applied to this dispatch.'
        );
      };

      const middlewareAPI: MiddlewareAPI = {
        dispatch: (action, ...args) => dispatch(action, ...args),
        getState: store.getState,
      };

      const chain = middlewares.map((middleware) => middleware(middlewareAPI));

      return {
        ...store,
        dispatch: compose(...chain)(store.dispatch),
      };
    };
  };
}

function getStatefulSliceState<Source extends AnyStatefulSlice>(
  state: any,
  source: Source
) {
  const path = source.p;

  for (let index = 0, length = path.length; index < length; ++index) {
    state = state[path[index]];

    if (!state) {
      return state;
    }
  }

  return state;
}

type BaseStoreConfig<
  Slices extends readonly AnyStatefulSlice[],
  DispatchableAction extends Action
> = Pick<StoreConfig<Slices, DispatchableAction>, 'devTools' | 'notifier'>;

export function createBaseStoreCreator<
  Slices extends readonly AnyStatefulSlice[],
  DispatchableAction extends Action
>(
  slices: Slices,
  { devTools, notifier }: BaseStoreConfig<Slices, DispatchableAction>
) {
  const {
    isDispatching,
    hasSlice,
    notifyListeners,
    setDispatching,
    subscribe,
    subscribeToSlice,
  } = createMetadata(slices, notifier);

  return function createBaseStore<
    State,
    DispatchableAction extends Action = AnyAction
  >(
    reducer: Reducer<State, DispatchableAction>,
    preloadedState: PreloadedState<State> | undefined,
    enhancer?: StoreEnhancer<State, DispatchableAction> | undefined
  ): Store<State, DispatchableAction> {
    if (typeof enhancer === 'function') {
      const enhancedStore = enhancer(createBaseStore)(reducer, preloadedState);

      if (devTools) {
        const { liftedStore } = enhancedStore;

        const getStateOverride = function (source) {
          const { computedStates, currentStateIndex } = liftedStore.getState();
          const { state } = computedStates[currentStateIndex];

          if (source) {
            if (isSelectSlice(source)) {
              return source.select(getStateOverride);
            }

            if (isStatefulSlice(source)) {
              return getStatefulSliceState(state, source);
            }
          }

          return state as any;
        } as Store<State, DispatchableAction>['getState'];

        return { ...enhancedStore, getState: getStateOverride };
      }

      return enhancedStore;
    }

    // The inline casting causes ESLint not to see the reassignment.
    // eslint-disable-next-line prefer-const
    let currentReducer = reducer;
    let state: State;

    function dispatch(action: DispatchableAction) {
      if (isSliceAction(action)) {
        if (!hasSlice(action.$$slice)) {
          throw new Error(
            `Slice with id ${action.$$slice} not found. Is it part of this store?`
          );
        }
      }

      if (isDispatching()) {
        throw new Error('Reducers may not dispatch actions.');
      }

      const prev = state;

      try {
        setDispatching(true);
        state = currentReducer(state, action);
      } finally {
        setDispatching(false);
      }

      if (prev !== state) {
        notifyListeners();
      }

      return action;
    }

    function getState(): State;
    function getState<Source extends AnySelectSlice | AnyStatefulSlice>(
      source: Source
    ): SourceResult<Source>;
    function getState<State, Source extends AnySelectSlice | AnyStatefulSlice>(
      source?: Source
    ): Source extends AnySelectSlice | AnyStatefulSlice
      ? SourceResult<Source>
      : State {
      if (isDispatching()) {
        throw new Error(
          'You may not call store.getState() while the reducer is executing. ' +
            'The reducer has already received the state as an argument. ' +
            'Pass it down from the top reducer instead of reading it from the store.'
        );
      }

      if (source) {
        if (isSelectSlice(source)) {
          return source.select(getState);
        }

        if (isStatefulSlice(source)) {
          return getStatefulSliceState(state, source);
        }
      }

      return state as any;
    }

    function observable(): Observable<State> {
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
              `Expected the observer to be an object. Instead, received: '${typeof observer}'`
            );
          }

          function observeState() {
            const observerAsObserver = observer as Observer<State>;

            if (observerAsObserver.next) {
              observerAsObserver.next(getState());
            }
          }

          observeState();

          return { unsubscribe: outerSubscribe(observeState) };
        },

        ['@@observable']() {
          return this;
        },
      };
    }

    function replaceReducer<NewState, NewDispatchableAction extends Action>(
      nextReducer: Reducer<NewState, NewDispatchableAction>
    ): void {
      if (typeof nextReducer !== 'function') {
        throw new Error(
          `Expected the nextReducer to be a function. Instead, received: '${typeof nextReducer}`
        );
      }

      (currentReducer as unknown as Reducer<NewState, NewDispatchableAction>) =
        nextReducer;

      dispatch({ type: REPLACE_REDUCER } as DispatchableAction);
    }

    if (devTools) {
      // Need to initialize redux for DevTools.
      dispatch({ type: '@@redux/INIT' } as DispatchableAction);
    }

    dispatch({ type: INIT } as DispatchableAction);

    return {
      dispatch: dispatch as Dispatch<DispatchableAction>,
      getState,
      replaceReducer,
      subscribe,
      subscribeToSlice,
      ['@@observable']: observable,
    };
  };
}

export function createStore<
  Slices extends readonly AnyStatefulSlice[],
  DispatchableAction extends Action = AnyAction
>({
  devTools = false,
  enhancers: passedEnhancers = [],
  middlewares,
  notifier,
  preloadedState,
  slices,
}: StoreConfig<Slices, DispatchableAction>) {
  type StoreState = SlicesState<Slices>;

  const createBaseStore = createBaseStoreCreator<Slices, DispatchableAction>(
    slices,
    { devTools, notifier }
  );
  const defaultEnhancers: Array<StoreEnhancer<StoreState, DispatchableAction>> =
    middlewares ? [applyMiddleware(middlewares)] : [];
  const enhancers =
    typeof passedEnhancers === 'function'
      ? passedEnhancers(defaultEnhancers)
      : passedEnhancers;
  const composeEnhancers =
    devTools &&
    typeof window !== 'undefined' &&
    (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      : compose;
  const enhancer = enhancers.length
    ? (composeEnhancers(...enhancers) as StoreEnhancer<
        StoreState,
        DispatchableAction
      >)
    : undefined;

  const reducer = createReducer(slices);
  const store = createBaseStore<StoreState, DispatchableAction>(
    reducer,
    preloadedState,
    enhancer
  );

  return store;
}

export function createMetadata<Slices extends readonly AnyStatefulSlice[]>(
  slices: Slices,
  notifier: Notifier | undefined
) {
  const sliceMap: Record<string, AnyStatefulSlice> = {};

  slices.forEach((slice) => {
    if (slice.c) {
      getDescendantSlices(slice.c).forEach((childSlice) => {
        sliceMap[childSlice.i] = childSlice;
      });
    } else {
      sliceMap[slice.i] = slice;
    }
  });

  let dispatching = false;
  let batch = notifier || ((notify: Notify) => notify());

  let sliceListeners: Record<string, Listener[]> | null = {};
  let nextSliceListeners = sliceListeners!;
  let storeListeners: Listener[] | null = [];
  let nextStoreListeners = storeListeners!;

  function hasSlice(sliceId: SliceId) {
    return !!sliceMap[sliceId];
  }

  function isDispatching() {
    return dispatching;
  }

  function notify() {
    const listeners = (storeListeners = nextStoreListeners);

    for (let index = 0; index < listeners.length; ++index) {
      listeners[index]();
    }

    const allSliceListeners = (sliceListeners = nextSliceListeners);

    for (const sliceName in allSliceListeners) {
      const sliceListeners = allSliceListeners[sliceName];

      for (let index = 0; index < sliceListeners.length; ++index) {
        sliceListeners[index]();
      }
    }
  }

  function notifyListeners() {
    batch(notify);
  }

  function setBatcher(batcher: typeof batch): void {
    if (typeof batcher !== 'function') {
      throw new Error(
        `Expected the batcher to be a function. Instead, received: '${typeof batcher}'`
      );
    }

    batch = batcher;
  }

  function setDispatching(nextDispatching: boolean) {
    dispatching = nextDispatching;
  }

  function subscribe(listener: Listener): Unsubscribe {
    if (typeof listener !== 'function') {
      throw new Error(
        `Expected the listener to be a function. Instead, received: '${typeof listener}'`
      );
    }

    if (dispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state.'
      );
    }

    let subscribed = true;

    updateStoreListeners(listener, true);

    return () => {
      if (!subscribed) {
        return;
      }

      if (dispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. '
        );
      }

      subscribed = false;
      updateStoreListeners(listener, false);
    };
  }

  function subscribeToSlice(slice: AnyStatefulSlice, listener: Listener) {
    if (typeof listener !== 'function') {
      throw new Error(
        `Expected the listener to be a function. Instead, received: '${typeof listener}'`
      );
    }

    if (dispatching) {
      throw new Error(
        'You may not call store.subscribeToSlice() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state.'
      );
    }

    const sliceName = slice.n;

    let subscribed = true;

    updateSliceListeners(sliceName, listener, true);

    return () => {
      if (!subscribed) {
        return;
      }

      if (dispatching) {
        throw new Error(
          'You may not unsubscribe from a slice listener while the reducer is executing. '
        );
      }

      subscribed = false;
      updateSliceListeners(sliceName, listener, false);
    };
  }

  function updateSliceListeners(
    sliceName: string,
    listener: Listener,
    add: boolean
  ) {
    if (
      nextSliceListeners === sliceListeners ||
      !sliceListeners ||
      !sliceListeners[sliceName]
    ) {
      const existingListeners =
        nextSliceListeners && nextSliceListeners[sliceName];

      nextSliceListeners = {
        ...nextSliceListeners,
        [sliceName]: existingListeners ? existingListeners.slice(0) : [],
      };
    }

    if (add) {
      nextSliceListeners[sliceName].push(listener);
    } else {
      const listeners = nextSliceListeners[sliceName];

      listeners.splice(listeners.indexOf(listener), 1);

      if (!listeners.length) {
        delete nextSliceListeners[sliceName];
      }

      sliceListeners = null;
    }
  }

  function updateStoreListeners(listener: Listener, add: boolean) {
    if (nextStoreListeners === storeListeners) {
      nextStoreListeners = storeListeners ? storeListeners.slice(0) : [];
    }

    if (add) {
      nextStoreListeners.push(listener);
    } else {
      nextStoreListeners.splice(nextStoreListeners.indexOf(listener), 1);
      storeListeners = null;
    }
  }

  return {
    hasSlice,
    isDispatching,
    notifyListeners,
    setBatcher,
    setDispatching,
    subscribe,
    subscribeToSlice,
  };
}
