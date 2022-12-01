import { getDescendantSlices, isSliceAction, is } from './utils';

import type { AnyAction, AnyStatefulSlice, SlicesState } from './types';

export function createReducer<
  Slices extends readonly AnyStatefulSlice[],
  DispatchedAction extends AnyAction
>(slices: Slices) {
  type State = SlicesState<Slices>;

  const sliceMap: Record<string, AnyStatefulSlice> = {};
  const initialState = slices.reduce<State>((initialState, slice) => {
    initialState[slice.n as keyof State] = slice.d;

    return initialState;
  }, {} as State);

  const allSlices = slices.reduce(
    (sliceList, slice) =>
      slice.c
        ? sliceList.concat(getDescendantSlices(slice.c))
        : sliceList.concat(slice),
    [] as AnyStatefulSlice[]
  );

  allSlices.forEach((slice) => {
    sliceMap[slice.i] = slice;
  });

  return function slicesReducer(
    state: State = initialState,
    action: DispatchedAction
  ): State {
    if (!isSliceAction(action)) {
      return state;
    }

    const slice = sliceMap[action.$$slice];
    const owner = slice.o;
    const prev = state[owner];
    const next = slice.h(prev, action);

    return is(prev, next) ? state : { ...state, [owner]: next };
  };
}
