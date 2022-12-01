import { createMetadata } from '../store';
import { isSelectSlice, isSliceAction, isStatefulSlice } from '../utils';

import type {
  PreloadedState,
  Reducer,
  StoreEnhancer,
  StoreEnhancerStoreCreator,
} from 'redux';
import type { SlicesStoreExtensions } from './types';
import type {
  AnySelectSlice,
  AnyStatefulSlice,
  SlicesState,
  SourceResult,
} from '../types';

export function createSlicesEnhancer<
  Slices extends readonly AnyStatefulSlice[],
  OtherState = {}
>(
  slices: Slices
): StoreEnhancer<SlicesStoreExtensions<SlicesState<Slices> & OtherState>> {
  type StoreState = SlicesState<Slices> & OtherState;

  function enhancer(
    createStore: StoreEnhancerStoreCreator<SlicesStoreExtensions<StoreState>>
  ) {
    return function enhance<StoreReducer extends Reducer>(
      reducer: StoreReducer,
      preloadedState: PreloadedState<StoreState> | undefined
    ) {
      const {
        hasSlice,
        notifyListeners,
        setDispatching,
        subscribe,
        subscribeToSlice,
      } = createMetadata(slices);
      const store = createStore(reducer, preloadedState);
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;

      function dispatch(action: any) {
        if (isSliceAction(action)) {
          if (!hasSlice(action.$$slice)) {
            throw new Error(
              `Slice with id ${action.$$slice} not found. Is it part of this store?`
            );
          }
        }

        const prev = originalGetState();
        setDispatching(true);
        const result = originalDispatch(action);
        setDispatching(false);
        const next = originalGetState();

        if (prev !== next) {
          notifyListeners();
        }

        return result;
      }

      function getState(): StoreState;
      function getState<
        Source extends AnySelectSlice | AnyStatefulSlice | undefined
      >(source: Source): SourceResult<Source>;
      function getState<
        Source extends AnySelectSlice | AnyStatefulSlice | undefined
      >(
        source?: Source
      ): Source extends any ? SourceResult<Source> : StoreState {
        if (!source) {
          return originalGetState();
        }

        if (isSelectSlice(source)) {
          return source.select(getState);
        }

        if (isStatefulSlice(source)) {
          const path = source.p;

          let state: any = originalGetState();

          for (let index = 0, length = path.length; index < length; ++index) {
            state = state[path[index]];

            if (!state) {
              return state;
            }
          }

          return state;
        }

        return originalGetState();
      }

      return {
        ...store,
        dispatch,
        getState,
        subscribe,
        subscribeToSlice,
      };
    };
  }

  return enhancer as StoreEnhancer<SlicesStoreExtensions<StoreState>>;
}
