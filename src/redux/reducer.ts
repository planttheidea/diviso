// @ts-expect-error - `ActionTypes` not on public redux API
import { __DO_NOT_USE__ActionTypes as ActionTypes } from 'redux';
import { createReducer as createSlicesReducer } from '../reducer';
import { isReducersMap } from './utils';
import { is, isSliceAction } from '../utils';

import type { ReducersMapObject, StateFromReducersMapObject } from 'redux';
import type {
  Action,
  AnyAction,
  AnyStatefulSlice,
  Reducer,
  SlicesState,
} from '../types';

export function createReducer<
  Slices extends readonly AnyStatefulSlice[],
  OtherReducerState,
  DispatchedAction extends AnyAction
>(
  slices: Slices,
  otherReducer?:
    | Reducer<OtherReducerState, DispatchedAction>
    | ReducersMapObject<OtherReducerState, DispatchedAction>
    | undefined
) {
  const slicesReducer = createSlicesReducer(slices);

  type SliceReducerState = SlicesState<Slices>;
  type CombinedState = Omit<OtherReducerState, keyof SliceReducerState> &
    SliceReducerState;

  if (!otherReducer) {
    return slicesReducer as Reducer<CombinedState, DispatchedAction>;
  }

  if (isReducersMap(otherReducer)) {
    // @ts-expect-error - SlicesState typing is a bit wonky
    otherReducer = combineReduxReducers<OtherState, DispatchedAction>(
      otherReducer
    );
  }

  const initialState = slicesReducer(undefined, { type: ActionTypes.INIT });

  return function reducer(
    state: CombinedState = initialState as CombinedState,
    action: DispatchedAction
  ): CombinedState {
    if (isSliceAction(action)) {
      const nextSliceState = slicesReducer(state, action);

      if (!is(state, nextSliceState)) {
        return { ...state, ...nextSliceState };
      }
    }

    // @ts-expect-error - `otherReducer` is still not type-narrowed, for some reason.
    const nextOtherState = otherReducer(state, action);

    return is(state, nextOtherState) ? state : { ...state, ...nextOtherState };
  };
}

export function combineReduxReducers<
  SlicesState,
  DispatchedAction extends Action = AnyAction
>(
  reducers: ReducersMapObject<SlicesState, DispatchedAction>
): Reducer<StateFromReducersMapObject<typeof reducers>, DispatchedAction> {
  type ReducerState = StateFromReducersMapObject<typeof reducers>;

  const reducerKeys = Object.keys(reducers);
  const finalReducers = {} as ReducersMapObject<ReducerState, DispatchedAction>;

  reducerKeys.forEach((key) => {
    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error - Error checking
      if (typeof reducers[key] === 'undefined') {
        console.warn(`No reducer provided for key "${key}"`);
      }
    }

    if (typeof reducers[key as keyof typeof reducers] === 'function') {
      // @ts-expect-error - keys should align
      finalReducers[key] = reducers[key];
    }
  });

  const finalReducerKeys = Object.keys(finalReducers);
  const length = finalReducerKeys.length;

  return function reducer(
    state: ReducerState = {} as ReducerState,
    action: DispatchedAction
  ) {
    const nextState = {} as ReducerState;

    let hasChanged = false;

    for (let i = 0; i < length; i++) {
      const key = finalReducerKeys[i] as keyof ReducerState;
      const previousStateForKey = state[key];
      const nextStateForKey = finalReducers[key](previousStateForKey, action);

      if (typeof nextStateForKey === 'undefined') {
        const actionType = action && action.type;

        throw new Error(
          `When called with an action of type ${
            actionType ? `"${String(actionType)}"` : '(unknown type)'
          }, the slice reducer for key "${String(key)}" returned undefined. ` +
            `To ignore an action, you must explicitly return the previous state. ` +
            `If you want this reducer to hold no value, you can return null instead of undefined.`
        );
      }

      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || !is(previousStateForKey, nextStateForKey);
    }

    return hasChanged ? nextState : state;
  } as Reducer<ReducerState, DispatchedAction>;
}
