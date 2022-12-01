import { is } from '../utils';

import type { PreloadedState, Store, StoreEnhancerStoreCreator } from 'redux';
import type {
  Action,
  AnyAction,
  AnyStatefulSlice,
  Listener,
  Notify,
  Reducer,
  Unsubscribe,
} from '../types';
import type { SlicesStoreExtensions } from './types';

interface StoreExtensions {
  subscribeImmediate: (listener: Listener) => Unsubscribe;
  subscribeToSliceImmediate: (
    slice: AnyStatefulSlice,
    listener: Listener
  ) => Unsubscribe;
}

export function createBatchedSubscribeEnhancer(
  batch: (notify: Notify) => void
) {
  if (typeof batch !== 'function') {
    throw new Error('Expected batch to be a function.');
  }

  let currentSliceListeners: Record<string, Listener[]> | null = {};
  let nextSliceListeners = currentSliceListeners;
  let currentListeners: Listener[] | null = [];
  let nextListeners = currentListeners;

  function ensureCanMutateNextListeners(): void {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice(0);
    }
  }

  function ensureCanMutateNextSliceListeners(sliceName: string): void {
    if (
      nextSliceListeners === currentSliceListeners ||
      !currentSliceListeners ||
      !currentSliceListeners[sliceName]
    ) {
      const existingListeners =
        nextSliceListeners && nextSliceListeners[sliceName];

      nextSliceListeners = {
        ...nextSliceListeners,
        [sliceName]: existingListeners ? existingListeners.slice(0) : [],
      };
    }
  }

  function notify(): void {
    const listeners = (currentListeners = nextListeners);

    for (let index = 0; index < listeners.length; ++index) {
      listeners[index]();
    }

    const allSliceListeners = (currentSliceListeners = nextSliceListeners);

    for (const sliceName in allSliceListeners) {
      const sliceListeners = allSliceListeners[sliceName];

      for (let index = 0; index < sliceListeners.length; ++index) {
        sliceListeners[index]();
      }
    }
  }

  function subscribe(listener: Listener): Unsubscribe {
    if (typeof listener !== 'function') {
      throw new Error(
        `Expected the listener to be a function. Instead, received: '${typeof listener}'`
      );
    }

    let subscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!subscribed) {
        return;
      }

      subscribed = false;

      ensureCanMutateNextListeners();
      nextListeners.splice(nextListeners.indexOf(listener), 1);
      currentListeners = null;
    };
  }

  function subscribeToSlice(slice: AnyStatefulSlice, listener: Listener) {
    if (typeof listener !== 'function') {
      throw new Error(
        `Expected the listener to be a function. Instead, received: '${typeof listener}'`
      );
    }

    const sliceName = slice.n;

    let subscribed = true;

    ensureCanMutateNextSliceListeners(sliceName);
    nextSliceListeners[sliceName].push(listener);

    return function unsubscribeFromSlice() {
      if (!subscribed) {
        return;
      }

      subscribed = false;

      ensureCanMutateNextSliceListeners(sliceName);

      const sliceListeners = nextSliceListeners[sliceName];

      sliceListeners.splice(sliceListeners.indexOf(listener), 1);

      if (!sliceListeners.length) {
        delete nextSliceListeners[sliceName];
      }

      currentSliceListeners = null;
    };
  }

  return (createStore: StoreEnhancerStoreCreator) =>
    <State = any, DispatchableAction extends Action = AnyAction>(
      reducer: Reducer<State, DispatchableAction>,
      preloadedState?: PreloadedState<State>
    ) => {
      const store = createStore(reducer, preloadedState) as Store<
        State,
        DispatchableAction
      > &
        SlicesStoreExtensions;
      const originalDispatch = store.dispatch;
      const getState = store.getState;
      const subscribeImmediate = store.subscribe;
      const subscribeToSliceImmediate = store.subscribeToSlice;

      function dispatch(...dispatchArgs: any[]) {
        const prev = getState();
        // @ts-expect-error - Spread is not appreciated here.
        const result = originalDispatch(...dispatchArgs);
        const next = getState();

        if (!is(prev, next)) {
          batch(notify);
        }

        return result;
      }

      return {
        ...store,
        dispatch,
        subscribe,
        subscribeImmediate,
        subscribeToSlice,
        subscribeToSliceImmediate,
      } as Store<State, DispatchableAction> &
        SlicesStoreExtensions &
        StoreExtensions;
    };
}
