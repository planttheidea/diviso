import React, { createContext, useMemo } from 'react';

import type { Action, AnyAction, Store } from '../types';

export type ReduxSlicesContextValue = {
  getServerState: (() => any) | undefined;
  store: Store;
};

export const ReduxSlicesContext = createContext<ReduxSlicesContextValue>({
  store: null,
} as unknown as ReduxSlicesContextValue);

interface Props<State, DispatchableAction extends Action = AnyAction> {
  children: any;
  getServerState?: () => any;
  store: Store<State, DispatchableAction>;
}

export function Provider<State, DispatchableAction extends Action>({
  children,
  getServerState,
  store,
}: Props<State, DispatchableAction>) {
  const value = useMemo(
    () => ({ getServerState, store }),
    [getServerState, store]
  );

  return (
    <ReduxSlicesContext.Provider value={value}>
      {children}
    </ReduxSlicesContext.Provider>
  );
}
