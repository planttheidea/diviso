import type { Action, AnyAction, Store as ReduxStore } from 'redux';
import type { AnySlicesState, GetState, SubscribeToSlice } from '../types';

export type Store<
  State = any,
  DispatchableAction extends Action = AnyAction
> = ReduxStore<State, DispatchableAction> & SlicesStoreExtensions;

export interface SlicesStoreExtensions<State extends AnySlicesState = any> {
  getState: GetState<State>;
  subscribeToSlice: SubscribeToSlice;
}
