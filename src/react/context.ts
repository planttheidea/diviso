import { createContext, createElement, useMemo } from 'react';

import type { ReactNode } from 'react';
import type { Action, AnyAction } from '../core/actions';
import type { DivisoStore as Store } from '../core/store';

export interface ReactReduxPartitionerContextType<
  State = unknown,
  DispatchableAction extends Action = AnyAction
> {
  /**
   * Returns a snapshot of state, essentially the server-side equivalent of
   * `store.getState()`. Used for SSR.
   */
  getServerState: (() => State) | undefined;
  /**
   * The store which has been enhanced with the partitioner.
   */
  store: Store<State, DispatchableAction>;
}

export interface ProviderProps<
  State = unknown,
  DispatchableAction extends Action = AnyAction
> extends Omit<
    ReactReduxPartitionerContextType<State, DispatchableAction>,
    'getServerState'
  > {
  children: ReactNode;
  getServerState?: () => State;
}
/**
 * Context used by partitioner hooks internally.
 */
export const ReactReduxPartitionerContext =
  createContext<ReactReduxPartitionerContextType | null>(null);

const { Provider: ContextProvider } = ReactReduxPartitionerContext;

/**
 * Provides the store values used by the partitioner to manage updates
 * of Parts within the subtree.
 */
export function Provider<
  State = unknown,
  DispatchableAction extends Action = AnyAction
>({
  children,
  getServerState,
  store,
}: ProviderProps<State, DispatchableAction>): JSX.Element {
  const context = useMemo(
    () => ({ getServerState, store }),
    [getServerState, store]
  );

  return /*#__PURE__*/ createElement(
    ContextProvider,
    { value: context },
    children
  );
}
