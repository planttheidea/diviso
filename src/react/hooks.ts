import { useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { ReduxSlicesContext } from './Context';
import { createSelectSlice, createUpdateSlice } from '../slice';

import type { AnyStore } from './Context';
import type {
  AnySlice,
  AnySelectSlice,
  AnyUpdateSlice,
  AnyStatefulSlice,
  IsEqual,
  Listener,
  SelectSliceArgs,
  Tuple,
  UpdateSliceArgs,
  UpdateSliceHandler,
  Unsubscribe,
  UseUpdateSliceHandler,
} from '../types';

export function useDispatch() {
  return useStore().dispatch;
}

function noop(): undefined {
  return;
}
function noopSubscribe() {
  return noop;
}

function useReduxContext() {
  const context = useContext(ReduxSlicesContext);

  if (!context) {
    throw new Error(
      'There is no context provided. Is this React tree wrapped in a `Provider`?'
    );
  }

  return context;
}

export function useSlice<Slice extends AnyStatefulSlice>(
  slice: Slice
): [ReturnType<Slice['r']>, UseUpdateSliceHandler<Slice['w']>];

export function useSlice<Slice extends AnySelectSlice>(
  slice: Slice
): [ReturnType<Slice['r']>, never];
export function useSlice<
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any
>(
  sources: Sources,
  handler: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
): [ReturnType<SourcesHandler>, never];

export function useSlice<Slice extends AnyUpdateSlice>(
  slice: Slice
): [never, UseUpdateSliceHandler<Slice['w']>];
export function useSlice<UpdateHandler extends UpdateSliceHandler>(
  ignored: null | undefined,
  handler: UpdateHandler
): [never, UseUpdateSliceHandler<UpdateHandler>];

export function useSlice<
  StatefulSlice extends AnySlice,
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any,
  UpdateHandler extends UpdateSliceHandler
>(
  slice: StatefulSlice | Sources | null,
  handler?: SourcesHandler | UpdateHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
) {
  const updateValue = slice || handler;

  return [
    useSliceValue(slice as any, handler as SourcesHandler, isEqual),
    useSliceUpdate(updateValue as any),
  ];
}

export function useSliceUpdate<SourcesHandler extends UpdateSliceHandler>(
  handler: SourcesHandler
): UseUpdateSliceHandler<SourcesHandler>;
export function useSliceUpdate<
  StatefulSlice extends AnyStatefulSlice | AnyUpdateSlice
>(slice: StatefulSlice): UseUpdateSliceHandler<StatefulSlice['w']>;
export function useSliceUpdate<StatefulSlice extends AnySelectSlice>(
  slice: StatefulSlice
): never;
export function useSliceUpdate<
  StatefulSlice extends AnySlice,
  SourcesHandler extends UpdateSliceHandler
>(sliceOrHandler: StatefulSlice | SourcesHandler) {
  const store = useStore();
  const slice = useMemo(
    () =>
      typeof sliceOrHandler === 'function'
        ? createUpdateSlice(sliceOrHandler)
        : sliceOrHandler,
    [sliceOrHandler]
  );

  return useMemo(
    () =>
      slice.w
        ? (...args: UpdateSliceArgs<StatefulSlice['w']>) =>
            slice.w(
              store.getState,
              store.dispatch,
              // @ts-expect-error - Spread is not liked here
              ...args
            )
        : ((() => {}) as never),
    [store, slice]
  );
}

export function useSliceValue<
  StatefulSlice extends AnyStatefulSlice | AnySelectSlice
>(slice: StatefulSlice): ReturnType<StatefulSlice['r']>;
export function useSliceValue<StatefulSlice extends AnyUpdateSlice>(
  slice: StatefulSlice
): never;
export function useSliceValue<
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any
>(
  sources: Sources,
  handler: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
): ReturnType<SourcesHandler>;
export function useSliceValue<
  StatefulSlice extends AnySlice,
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any
>(
  sliceOrSources: StatefulSlice | Sources | null,
  handler?: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
) {
  const slice = useMemo(
    () =>
      Array.isArray(sliceOrSources)
        ? createSelectSlice(sliceOrSources, handler!, isEqual)
        : sliceOrSources,
    [sliceOrSources, handler, isEqual]
  ) as StatefulSlice;

  const { getServerState, store } = useReduxContext();

  const subscribe = useMemo(() => {
    if (!slice) {
      return noopSubscribe;
    }

    if (slice.s) {
      return (listener: Listener): Unsubscribe => {
        const unsubscribes = slice.s!.map((slice) =>
          store.subscribeToSlice(slice, listener)
        );

        return () => {
          for (let index = 0; index < unsubscribes.length; ++index) {
            unsubscribes[index]();
          }
        };
      };
    }

    return store.subscribe;
  }, [store, slice]);

  const getSnapshot = useMemo(
    () => (slice && slice.r ? () => slice.r(store.getState) : noop),
    [store, slice]
  );

  return useSyncExternalStoreWithSelector(
    subscribe,
    store.getState,
    getServerState || store.getState,
    getSnapshot,
    isEqual
  );
}

export function useStore(): AnyStore {
  return useReduxContext().store;
}
