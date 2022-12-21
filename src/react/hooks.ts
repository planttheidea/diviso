import { getPromiseCacheEntry } from 'diviso/shared';
import { useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { ReactReduxPartitionerContext } from './context';
import {
  is,
  isPromise,
  isSelectablePart,
  isUpdateablePart,
  noop,
} from 'diviso/shared';

import type {
  Action,
  AnyAction,
  AnyPart,
  AnyPrimitivePart,
  AnySelectablePart,
  AnyUpdateablePart,
  AnyUpdater,
  Dispatch,
  Store,
  Listener,
  Subscribe,
  UpdatePartArgs,
} from 'diviso';
import type { ResolvedValue } from 'diviso/shared';
import type { ReactReduxPartitionerContextType } from './context';

export type UseUpdateUpdater<Updater extends AnyUpdater> = (
  ...args: UpdatePartArgs<Updater>
) => ReturnType<Updater>;

export type UsePartPair<Part extends AnyPart> = [
  UsePartValue<Part>,
  UsePartUpdate<Part>
];

export type UsePartValue<Part extends AnyPart> = Part extends AnySelectablePart
  ? ResolvedValue<ReturnType<Part['g']>>
  : never;

export type UsePartUpdate<Part extends AnyPart> = Part extends AnyUpdateablePart
  ? (...rest: UpdatePartArgs<Part['s']>) => ReturnType<Part['s']>
  : never;

/**
 * Use the store's `dispatch` method within the scope of a React component.
 */
export function useDispatch(): Dispatch {
  return useStore().dispatch;
}

/**
 * Access the partitioner context used by `react-redux-partitioner`.
 */
export function usePartitionerContext<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): ReactReduxPartitionerContextType<State, DispatchableAction> {
  const context = useContext(
    ReactReduxPartitionerContext
  ) as ReactReduxPartitionerContextType<State, DispatchableAction>;

  if (!context) {
    throw new Error(
      'The context required for `react-redux-partitioner` does not exist. ' +
        'Have you wrapped the React tree in a `Provider`?'
    );
  }

  return context;
}

/**
 * Returns a [value, update] `useState`-style pair for the Part passed.
 *
 * Note: Certain Part types do not support both value and update:
 * - Select Parts have no update method, and therefore the update returned is a no-op
 *   for those Parts.
 * - Update Parts have no value, and therefore the value returned is `undefined` for
 *   those Parts.
 */
export function usePart<Part extends AnyPart>(part: Part): UsePartPair<Part> {
  return [usePartValue(part), usePartUpdate(part)];
}

/**
 * Returns the updater for the Part, bound to the store's `dispatch` method.
 *
 * Note: Select Parts have no update method, and therefore the update returned is a no-op
 * for those Parts.
 */
export function usePartUpdate<Part extends AnyPart>(
  part: Part
): UsePartUpdate<Part> {
  const store = useStore();

  return useMemo(
    () =>
      isUpdateablePart(part)
        ? (...rest: UpdatePartArgs<Part['s']>) =>
            part.s(
              store.dispatch,
              store.getState,
              // @ts-expect-error - Tuple is not able to be attained with `UpdatePartArgs`.
              ...rest
            )
        : noop,
    [store, part]
  ) as UsePartUpdate<Part>;
}

/**
 * Returns the value for the Part passed. For Stateful Parts this is the value stored in
 * state, and for Select or Proxy parts this is the derived value.
 *
 * Note: Update Parts have no value, and therefore the value returned is `undefined` for
 * those Parts.
 */
export function usePartValue<Part extends AnyPart>(
  part: Part
): UsePartValue<Part> {
  const { getServerState, store } = usePartitionerContext();

  const subscribe = useMemo<Subscribe>(
    () =>
      isSelectablePart(part)
        ? (listener: Listener) =>
            store.subscribeToPart(part as AnyPrimitivePart, listener)
        : () => noop,
    [store, part]
  );

  const getSnapshot = useMemo(
    () =>
      isSelectablePart(part)
        ? () => part.g(store.getState, store.getVersion)
        : noop,
    [store, part]
  );

  const result = useSyncExternalStoreWithSelector(
    subscribe,
    store.getState,
    getServerState || store.getState,
    getSnapshot,
    is
  ) as UsePartValue<Part>;

  if (!isPromise(result)) {
    return result;
  }

  const entry = getPromiseCacheEntry<UsePartValue<Part>>(result);

  if (!entry) {
    return result;
  }

  if (entry.s === 'resolved') {
    return entry.r!;
  }

  if (entry.s === 'rejected') {
    throw entry.e;
  }

  throw entry.p;
}

/**
 * Use the store within the scope of a React component.
 */
export function useStore<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>(): Store<State, DispatchableAction> {
  return usePartitionerContext<State, DispatchableAction>().store;
}
