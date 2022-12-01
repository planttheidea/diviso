import { configureStore } from '@reduxjs/toolkit';
import {
  applyMiddleware as applyReduxMiddleware,
  compose as composeRedux,
  createStore as createReduxStore,
  type AnyAction,
  type Middleware,
} from 'redux';

import { createStore } from '../../src';
import { type SlicesStoreExtensions, type Store } from '../../src/redux/types';
import {
  createBatchedSubscribeEnhancer,
  createSlicesEnhancer,
  createReducer as createCombinedReducer,
} from '../../src/redux';

import { storeSlices } from './slices';

const legacy = (state: string = 'original', action: AnyAction) => {
  return action.type === 'LEGACY' ? 'new' : state;
};

export type ReduxState = ReturnType<typeof reducer>;
export type MyStore = Store<ReduxState>;

const logging = true;
// const logging = true;
const logger: Middleware<MyStore> = () => (next) => (action) => {
  if (logging) {
    console.group(action);
    console.log('dispatching');
  }
  const result = next(action);
  if (logging) {
    console.log(result);
    console.log('finished');
    console.groupEnd();
  }
  return result;
};

function debounce<Fn extends (notify: () => void) => void>(fn: Fn, ms = 0): Fn {
  let id: ReturnType<typeof setTimeout> | null = null;

  return function (notify: () => void): void {
    if (id) {
      clearTimeout(id);
    }

    id = setTimeout(() => {
      fn(notify);
      id = null;
    }, ms);
  } as Fn;
}
const debouncedNotify = debounce((notify) => notify(), 0);

export const nativeStore = createStore({
  devTools: true,
  // enhancers: [createBatchedSubscribeEnhancer(debouncedNotify)],
  middlewares: [logger],
  notifier: debouncedNotify,
  slices: storeSlices,
});

const reducer = createCombinedReducer(storeSlices, { legacy });
const composeEnhancers =
  // @ts-expect-error - Devtools not on window type
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || composeRedux;

type StoreState = ReturnType<typeof reducer>;

const reduxStoreEnhancer = composeEnhancers(
  applyReduxMiddleware(logger),
  createBatchedSubscribeEnhancer(debouncedNotify),
  createSlicesEnhancer(storeSlices)
);

export const reduxStore = createReduxStore<
  StoreState,
  AnyAction,
  SlicesStoreExtensions<StoreState>,
  {}
>(reducer, reduxStoreEnhancer);

export const reduxStoreConfigured = configureStore({
  reducer,
  middleware: [logger],
  enhancers: [
    createBatchedSubscribeEnhancer(debouncedNotify),
    createSlicesEnhancer(storeSlices),
  ],
}) as Store<ReduxState, AnyAction>;
