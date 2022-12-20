import {
  COMPOSED_PART,
  PART,
  PRIMITIVE_PART,
  PROXY_PART,
  SELECT_PART,
  STATEFUL_PART,
  UPDATE_PART,
} from './flags';
import { cancelPromise, getCachedPromise } from './async';
import { createGetState } from './store';
import {
  getId,
  identity,
  is,
  noop,
  toScreamingSnakeCase,
  updateUniqueList,
} from './utils';
import {
  isBoundSelectConfig,
  isComposedConfig,
  isStatefulPartsList,
  isPrimitiveConfig,
  isSelector,
  isUnboundSelectConfig,
  isUpdateConfig,
  isUpdater,
  isBoundProxyConfig,
  isUnboundProxyConfig,
  isSelectablePartsList,
  isStatefulPart,
  isSelectPart,
  isProxyPart,
  isPromise,
} from './validate';

import type { AnyAction, PartAction } from './actions';
import type { Reducer } from './reducer';
import type { Dispatch, GetState, GetVersion } from './store';
import type {
  FunctionalUpdate,
  IsEqual,
  MaybePromise,
  ResolvedValue,
  Thunk,
  Tuple,
} from './utils';

export type PartId = number;

export type PartialPartState<BaseStatefulPart extends AnyStatefulPart> = {
  [Name in BaseStatefulPart as BaseStatefulPart['n']]: BaseStatefulPart['i'];
};

export type CombineState<
  PrevState,
  Parts extends Tuple<AnyStatefulPart>
> = Parts extends [
  infer Head extends AnyStatefulPart,
  ...infer Tail extends Tuple<AnyStatefulPart>
]
  ? CombineState<PrevState & PartialPartState<Head>, Tail>
  : {} extends PrevState
  ? Record<string, any>
  : PrevState;

export type CombinedPartsState<Parts extends Tuple<AnyStatefulPart>> =
  CombineState<{}, [...Parts]>;
export type AnyPartsState = CombinedPartsState<AnyStatefulPart[]>;

export type Get<State> = (
  getState: GetState,
  getVersion: GetVersion | undefined
) => State;
export type GetSelector<State> = (
  getState: GetState,
  getVersion: GetVersion | undefined
) => MaybePromise<State>;
export type Set<State> = (
  dispatch: Dispatch,
  getState: GetState<State>,
  nextState: State | FunctionalUpdate<State>
) => ReturnType<Dispatch<PartAction<State>>>;

export interface StatefulPartConfig<Name extends string> {
  name: Name;
}

export interface PrimitivePartConfig<Name extends string, State>
  extends StatefulPartConfig<Name> {
  initialState: State;
}

export interface ComposedPartConfig<
  Name extends string,
  Parts extends readonly AnyStatefulPart[]
> extends StatefulPartConfig<Name> {
  parts: Parts;
}

export interface BasePart {
  /**
   * The unique identifier of the Part.
   */
  id: PartId;

  /**
   * List of [d]ependent Parts, which should be notified whenever
   * the Part updates.
   */
  d: AnySelectablePart[];
  /**
   * The [f]lag used to identify the type of Part.
   */
  f: typeof PART;
}

export interface GetValueUpdater<State, Args extends any[]> {
  (dispatch: Dispatch, getState: GetState): PartAction<State>;
  (dispatch: Dispatch, getState: GetState, ...args: Args): PartAction<State>;
}

export interface StatefulPartUpdater<State> {
  /**
   * Creates a dedicated action creator for updating the value in state
   * for this part. Allows for declarative action types.
   */
  (type: string): StatefulUpdatePart<GetValueUpdater<State, [State]>>;
  /**
   * Creates a dedicated action creator for updating the value in state
   * for this part. Allows for declarative action types, as well as custom
   * input handling for deriving the next value.
   */
  <GetValue extends AnyGetValue<State>>(
    type: string,
    getValue: GetValue
  ): StatefulUpdatePart<GetValueUpdater<State, Parameters<GetValue>>>;
}

export interface BaseStatefulPart<Name extends string, State> extends BasePart {
  /**
   * Action creator, which returns an action that when dispatched will
   * update the value for this Part in state.
   */
  (nextValue: State): PartAction<State>;

  /**
   * Returns the action type used whenever the Part updates its value
   * in state. Can be useful as a key for action handlers on non-Part
   * reducers, or in third-party tools like `redux-saga`'s `take`.
   */
  toString(): string;
  update: StatefulPartUpdater<State>;

  f: typeof STATEFUL_PART;
  /**
   * The [g]etter which returns the value in state whcn retrieved
   * via `usePart` or `usePartValue`.
   */
  g: Get<State>;
  /**
   * The [i]nitial state of the Part.
   */
  i: State;
  /**
   * The [n]ame used as a key within state. If composed within
   * another Part, it will not reflect the key on the state object,
   * but rather the key within that Part.
   */
  n: Name;
  /**
   * The [o]wner of the Part, which is the key in top-level state
   * this Part is ultimately composed under.
   */
  o: string;
  /**
   * The [p]ath of keys within state used to get the value associated
   * with this specific Part.
   */
  p: string[];
  /**
   * The [r]educer used to set the new value in state whenever an
   * update is triggered for thie Part.
   */
  r(state: State, action: any): State;
  /**
   * The update method used to [s]et the value in state. When used in
   * concert with `usePart` / `usePartUpdate`, it will dispatch the
   * action created by the Part.
   */
  s: Set<State>;
  /**
   * The action [t]ype used by the action creator for the Part. This
   * will change based on composition within other Parts, to more easily
   * identify the nesting within state.
   */
  t: string;
}

/**
 * The most granular form of state stored. Can be composed with other
 * Primitive and/or Composed Parts to form a slice of state.
 */
export interface PrimitivePart<Name extends string, State>
  extends BaseStatefulPart<Name, State> {
  c: [];
  f: typeof PRIMITIVE_PART;
}

/**
 * A namespaced slice of state containing 1-n Primitive and/or Composed
 * Parts. Can itself be composed with other Primitive and/or Composed
 * Parts to build another Composed Part.
 */
export interface ComposedPart<
  Name extends string,
  Parts extends Tuple<AnyStatefulPart>
> extends BaseStatefulPart<Name, CombinedPartsState<[...Parts]>> {
  /**
   * List of [c]hild Parts contained within this Part.
   */
  c: AnyStatefulPart[];
  f: typeof COMPOSED_PART;
}

export type StatefulPart<
  Name extends string,
  State,
  Parts extends Tuple<AnyStatefulPart>,
  IsComposed
> = IsComposed extends true
  ? ComposedPart<Name, Parts>
  : PrimitivePart<Name, State>;

export type PartState<Part> = Part extends AnyStatefulPart
  ? Part['i']
  : Part extends AnySelectablePart
  ? ResolvedValue<ReturnType<Part['g']>>
  : undefined;

type MergeSelectPartArgs<
  Args extends any[],
  Parts extends Tuple<AnySelectablePart>
> = Parts extends [
  infer Head extends AnySelectablePart,
  ...infer Tail extends Tuple<AnySelectablePart>
]
  ? MergeSelectPartArgs<[...Args, PartState<Head>], Tail>
  : Args;

export type SelectPartArgs<Parts extends Tuple<AnySelectablePart>> =
  MergeSelectPartArgs<[], [...Parts]>;

export interface BoundSelectPartConfig<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts: Parts;
}

export interface UnboundSelectPartConfig<Selector extends AnyGenericSelector> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts?: never;
}

export type AnySelector<
  Parts extends readonly AnySelectablePart[] = AnySelectablePart[]
> = (...args: SelectPartArgs<Parts>) => any;
export type AnyGenericSelector = (getState: GetState) => any;

export interface BaseSelectPart extends BasePart {
  /**
   * Whether the Select Part is [b]ound to specific Parts of state. If
   * false, the Part will update whenever any piece of state changes.
   */
  b: boolean;
  f: typeof SELECT_PART;
  /**
   * The update method used for [s]etting values in state for other Parts.
   * It is a no-op on Select Parts; it exists to avoid unnecessary exceptions
   * if a Select Part is misused at runtime.
   */
  s: () => void;
}

export interface BoundSelectPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
> extends BaseSelectPart {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by the resolved values of the specific Parts in state provided.
   */
  <State = any>(state: State): MaybePromise<ReturnType<Selector>>;

  /**
   * The [g]etter used to derive a value based on the resolved value
   * for the Parts passed.
   */
  g: GetSelector<ReturnType<Selector>>;
}

export interface UnboundSelectPart<Selector extends AnyGenericSelector>
  extends BaseSelectPart {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by values in state.
   */
  <State = any>(state: State): ReturnType<Selector>;

  /**
   * The [g]etter used to derive a value based on the values in state.
   */
  g: Get<ReturnType<Selector>>;
}

export type AnyUpdater = (
  dispatch: Dispatch,
  getState: GetState,
  ...rest: any[]
) => any;

export type UpdatePartArgs<Updater extends AnyUpdater> = Updater extends (
  dispatch: Dispatch,
  getState: GetState,
  ...rest: infer Rest
) => any
  ? Rest
  : never;

export interface UpdatePartConfig<Updater extends AnyUpdater> {
  set: Updater;
}

export interface UpdatePart<Updater extends AnyUpdater> extends BasePart {
  /**
   * Thunk action creator, used for updating 1-n values in state.
   */
  (...rest: UpdatePartArgs<Updater>): Thunk<ReturnType<Updater>, any>;

  d: [];
  f: typeof UPDATE_PART;
  /**
   * The [g]etter used by other Parts to either retrieve a value in state or
   * derive a value from other stateful values. It is a no-op on Update Parts;
   * it exists to avoid unnecessary exceptions if a Select Part is misused
   * at runtime.
   */
  g: () => void;
  /**
   * The update method used to [s]et 1-n values in state.
   */
  s: Updater;
}

export interface StatefulUpdatePart<Updater extends AnyUpdater>
  extends UpdatePart<Updater> {
  /**
   * Returns the action type used whenever the Part updates its value
   * in state. Can be useful as a key for action handlers on non-Part
   * reducers, or in third-party tools like `redux-saga`'s `take`.
   */
  toString(): string;
}

export type AnyPart =
  | AnyStatefulPart
  | AnySelectPart
  | AnyUpdatePart
  | AnyProxyPart;
export type AnyComposedPart = ComposedPart<string, AnyStatefulPart[]>;
export type AnyPrimitivePart = PrimitivePart<string, any>;
export type AnyProxyPart =
  | BoundProxyPart<AnySelectablePart[], AnySelector, AnyUpdater>
  | UnboundProxyPart<AnySelector, AnyUpdater>;
export type AnyStatefulPart = StatefulPart<
  string,
  any,
  readonly AnyStatefulPart[],
  boolean
>;
export type AnySelectPart =
  | BoundSelectPart<AnySelectablePart[], AnySelector>
  | UnboundSelectPart<AnyGenericSelector>;
export type AnySelectablePart = AnyStatefulPart | AnySelectPart | AnyProxyPart;
export type AnyUpdatePart = UpdatePart<AnyUpdater>;
export type AnyUpdateablePart = AnyStatefulPart | AnyProxyPart | AnyUpdatePart;

export type AnyGetValue<State> = (
  ...args: any[]
) => State | FunctionalUpdate<State>;

export interface PartActionConfig<
  Part extends AnyStatefulPart,
  GetValue extends AnyGetValue<Part['i']>
> {
  getValue?: GetValue;
  type: string;
}

export interface BoundProxyPartConfig<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  parts: Parts;
  set: Updater;
}

export interface UnboundProxyPartConfig<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
> {
  get: Selector;
  isEqual?: IsEqual<ReturnType<Selector>>;
  part?: never;
  set: Updater;
}

export interface BaseProxyPart<Updater extends AnyUpdater> extends BasePart {
  /**
   * Thunk action creator, used for updating 1-n values in state.
   */
  update(...args: UpdatePartArgs<Updater>): Thunk<ReturnType<Updater>, any>;

  /**
   * Whether the Proxy Part is [b]ound to specific Parts of state. If
   * false, the Part will update whenever any piece of state changes.
   */
  b: boolean;
  f: typeof PROXY_PART;
}

export interface BoundProxyPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
> extends BaseProxyPart<Updater> {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by the resolved values of the specific Parts in state provided.
   */
  select<State>(state: State): MaybePromise<ReturnType<Selector>>;

  /**
   * The [g]etter used to derive a value based on the resolved value
   * for the Parts passed.
   */
  g: GetSelector<ReturnType<Selector>>;
  /**
   * The update method used to [s]et 1-n values in state.
   */
  s: Updater;
}

export interface UnboundProxyPart<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
> extends BaseProxyPart<Updater> {
  /**
   * Method that receives a store's `getState` method, and returns a value
   * derived by values in state.
   */
  select<State>(state: State): ReturnType<Selector>;

  /**
   * The [g]etter used to derive a value based on the values in state.
   */
  g: Get<ReturnType<Selector>>;
  /**
   * The update method used to [s]et 1-n values in state.
   */
  s: Updater;
}

const NO_DEPENDENTS = Object.freeze([]) as [];

function createBoundSelector<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(parts: Parts, get: Selector, isEqual: IsEqual) {
  type Values = SelectPartArgs<Parts>;
  type Result = MaybePromise<ReturnType<Selector>>;

  const size = parts.length;

  let values: Values;
  let result: Result;
  let stateVersion: number;

  return function select(
    getState: GetState,
    getVersion: GetVersion | undefined
  ): Result {
    const nextValues = [] as Values;

    let hasPromise = false;

    if (getVersion) {
      const nextVersion = getVersion();

      if (nextVersion === stateVersion) {
        return result;
      }

      stateVersion = nextVersion;
    }

    let hasChanged = !values;

    for (let index = 0; index < size; ++index) {
      nextValues[index] = parts[index]!.g(getState, getVersion);

      hasChanged = hasChanged || !is(values[index], nextValues[index]);
      hasPromise = hasPromise || isPromise(nextValues[index]);
    }

    values = nextValues;

    if (hasChanged) {
      cancelPromise(result);

      if (hasPromise) {
        const nextResult: Promise<ReturnType<Selector>> = Promise.all(
          nextValues
        ).then((resolvedValues) => get(...(resolvedValues as Values)));

        result = getCachedPromise(nextResult);
      } else {
        let nextResult = get(...nextValues);

        if (isPromise(nextResult)) {
          nextResult = getCachedPromise(nextResult);
        }

        if (result === undefined || !isEqual(result, nextResult)) {
          result = nextResult;
        }
      }
    }

    return result;
  };
}

function createComposedReducer<Part extends AnyStatefulPart>(
  part: Part
): Reducer<Part['i'], AnyAction> {
  type State = Part['i'];

  const { i: initialState, o: name, r: originalReducer } = part;

  return function reduce(
    state: State = initialState,
    action: AnyAction
  ): State {
    const prevState = state[name];
    const nextState = originalReducer(prevState, action);

    return is(prevState, nextState) ? state : { ...state, [name]: nextState };
  };
}

function createStatefulGet<Part extends AnyStatefulPart>(
  part: Part
): Get<Part['i']> {
  return function get(getState: GetState): Part['i'] {
    const path = part.p;

    let state: any = getState();

    for (let index = 0, length = path.length; index < length; ++index) {
      state = state[path[index]!];
    }

    return state;
  };
}

function createStateSelector<
  Selector extends (
    getState: GetState,
    getVersion: GetVersion | undefined
  ) => any
>(select: Selector) {
  return function selectFromState<State>(state: State) {
    const getState = createGetState(() => state);

    return select(getState, undefined);
  };
}

function createStatefulReduce<Part extends AnyStatefulPart>(
  part: Part
): Reducer<Part['i'], AnyAction> {
  return function reduce(state: Part['i'] = part.i, action: any) {
    return action.$$part === part.id && !is(state, action.value)
      ? action.value
      : state;
  };
}

function createStatefulSet<Part extends AnyStatefulPart>(
  part: Part
): Set<Part['i']> {
  return function set(dispatch, getState, update) {
    const nextValue = isFunctionalUpdate<Part['i']>(update)
      ? update(getState(part))
      : update;

    return dispatch(part(nextValue));
  };
}

function createUnboundSelector<Selector extends AnyGenericSelector>(
  get: Selector,
  isEqual: IsEqual
) {
  let result: ReturnType<Selector>;
  let stateVersion: number;

  return function select(
    getState: GetState,
    getVersion: GetVersion | undefined
  ): ReturnType<Selector> {
    if (getVersion) {
      const nextVersion = getVersion();

      if (nextVersion === stateVersion) {
        return result;
      }

      stateVersion = nextVersion;
    }

    const nextResult = get(getState);

    if (!isEqual(result, nextResult)) {
      cancelPromise(result);

      result = isPromise(nextResult)
        ? getCachedPromise(nextResult)
        : nextResult;
    }

    return result;
  };
}

function createUpdate<Updater extends AnyUpdater>(set: Updater) {
  return function update(...rest: UpdatePartArgs<Updater>) {
    return (dispatch: Dispatch, getState: GetState) =>
      set(dispatch, getState, ...rest);
  };
}

function getAllDescendantDependents(parts: readonly AnySelectablePart[]) {
  return parts.reduce((dependents, part) => {
    part.d.forEach((partDependent) => {
      if (isSelectPart(partDependent) || isProxyPart(partDependent)) {
        updateUniqueList(dependents, partDependent);
      }
    });

    if (isStatefulPart(part)) {
      dependents.push(...getAllDescendantDependents(part.c));
    }

    return dependents;
  }, [] as AnySelectablePart[]);
}

function getPrefixedType(path: string[], type: string): string {
  const prefix =
    path.length > 1 ? path.slice(0, path.length - 1).join('.') : path[0];
  const splitType = type.split('/');
  const baseType = splitType[splitType.length - 1]!;

  return `${prefix}/${baseType}`;
}

function isFunctionalUpdate<State>(
  value: any
): value is FunctionalUpdate<State> {
  return typeof value === 'function';
}

function updateSelectableDependents(
  dependents: readonly AnySelectablePart[],
  part: AnySelectablePart
) {
  dependents.forEach((dependent) => {
    updateUniqueList(dependent.d, part);

    // If the item is a nested state value, traverse up
    // its stateful dependents to ensure any updates to
    // state ancestors also trigger listeners.
    dependent.d.forEach((descendant) => {
      if (isStatefulPart(descendant)) {
        updateUniqueList(descendant.d, part);
      }
    });
  });
}

function updateStatefulDependents<State>(
  dependents: readonly AnyStatefulPart[],
  part: AnyStatefulPart,
  name: string
) {
  dependents.forEach((dependent) => {
    const path = [name, ...dependent.p];
    const reducer = createComposedReducer(dependent);
    const type = getPrefixedType(path, dependent.t);

    dependent.o = name;
    dependent.p = path;
    dependent.r = reducer;
    dependent.t = type;

    updateUniqueList(dependent.d, part);
    updateStatefulDependents<State>(dependent.c, part, name);
  });
}

export function createComposedPart<
  Name extends string,
  Parts extends Tuple<AnyStatefulPart>
>(config: ComposedPartConfig<Name, Parts>): ComposedPart<Name, Parts> {
  type State = CombinedPartsState<[...Parts]>;

  const { name, parts } = config;

  const initialState = parts.reduce((state, childPart) => {
    state[childPart.n as keyof State] = childPart.i;

    return state;
  }, {} as State);

  const part: ComposedPart<Name, Parts> = function actionCreator(
    nextValue: State
  ): PartAction<State> {
    return {
      $$part: part.id,
      type: part.t,
      value: nextValue,
    };
  };

  part.id = getId();
  part.toString = () => part.t;
  part.update = createPartUpdater(part);

  part.c = [...parts];
  part.d = getAllDescendantDependents(parts);
  part.f = COMPOSED_PART as ComposedPart<Name, Parts>['f'];
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = createStatefulReduce(part);
  part.s = createStatefulSet(part);
  part.t = getPrefixedType([name], `UPDATE_${toScreamingSnakeCase(name)}`);

  updateStatefulDependents<State>(parts, part, name);

  return part;
}

export function createPrimitivePart<Name extends string, State>(
  config: PrimitivePartConfig<Name, State>
): PrimitivePart<Name, State> {
  const { initialState, name } = config;

  const part: PrimitivePart<Name, State> = function actionCreator(
    nextValue: State
  ): PartAction<State> {
    return {
      $$part: part.id,
      type: part.t,
      value: nextValue,
    };
  };

  part.id = getId();
  part.toString = () => part.t;
  part.update = createPartUpdater(part);

  part.c = [];
  part.d = [];
  part.f = PRIMITIVE_PART as PrimitivePart<Name, State>['f'];
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = createStatefulReduce(part);
  part.s = createStatefulSet(part);
  part.t = getPrefixedType([name], `UPDATE_${toScreamingSnakeCase(name)}`);

  return part;
}

export function createBoundSelectPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(config: BoundSelectPartConfig<Parts, Selector>) {
  const { get, isEqual = is, parts } = config;

  const select = createBoundSelector(parts, get, isEqual);
  const part = createStateSelector(select) as BoundSelectPart<Parts, Selector>;

  part.id = getId();

  part.b = true;
  part.d = [];
  part.f = SELECT_PART as BoundSelectPart<Parts, Selector>['f'];
  part.g = select;
  part.s = noop;

  updateSelectableDependents(parts, part);

  return part;
}

export function createUnboundSelectPart<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector> {
  const { get, isEqual = is } = config;

  const select = createUnboundSelector(get, isEqual);
  const part = createStateSelector(select) as UnboundSelectPart<Selector>;

  part.id = getId();

  part.b = false;
  part.d = [];
  part.f = SELECT_PART as UnboundSelectPart<Selector>['f'];
  part.g = select;
  part.s = noop;

  return part;
}

export function createBoundProxyPart<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
>(
  config: BoundProxyPartConfig<Parts, Selector, Updater>
): BoundProxyPart<Parts, Selector, Updater> {
  const { get, isEqual = is, parts, set } = config;

  const select = createBoundSelector(parts, get, isEqual);
  const update = createUpdate(set);

  const part = {} as BoundProxyPart<Parts, Selector, Updater>;

  part.id = getId();
  part.select = createStateSelector(select);
  part.update = update;

  part.b = true;
  part.d = [];
  part.f = PROXY_PART as BoundProxyPart<Parts, Selector, Updater>['f'];
  part.g = select;
  part.s = set;

  updateSelectableDependents(parts, part);

  return part;
}

export function createUnboundProxyPart<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  config: UnboundProxyPartConfig<Selector, Updater>
): UnboundProxyPart<Selector, Updater> {
  const { get, isEqual = is, set } = config;

  const select = createUnboundSelector(get, isEqual);
  const update = createUpdate(set);

  const part = {} as UnboundProxyPart<Selector, Updater>;

  part.id = getId();
  part.select = createStateSelector(select);
  part.update = update;

  part.b = false;
  part.d = [];
  part.f = PROXY_PART as UnboundProxyPart<Selector, Updater>['f'];
  part.g = select;
  part.s = set;

  return part;
}

export function createUpdatePart<Updater extends AnyUpdater>(
  config: UpdatePartConfig<Updater>
): UpdatePart<Updater> {
  const { set } = config;

  const part = createUpdate(set) as unknown as UpdatePart<Updater>;

  part.id = getId();

  part.d = NO_DEPENDENTS;
  part.f = UPDATE_PART as UpdatePart<Updater>['f'];
  part.g = noop;
  part.s = set;

  return part;
}

export function createPartUpdater<Part extends AnyStatefulPart>(part: Part) {
  return function partUpdater<GetValue extends AnyGetValue<Part['i']>>(
    baseType: string,
    getValue: GetValue = identity as GetValue
  ) {
    let path = part.p;
    let type = getPrefixedType(path, baseType);

    function getType() {
      if (part.p !== path) {
        path = part.p;
        type = getPrefixedType(path, baseType);
      }

      return type;
    }

    function set(
      dispatch: Dispatch,
      getState: GetState<Part['i']>,
      ...rest: Parameters<GetValue>
    ) {
      const update = getValue(...rest);
      const nextValue = isFunctionalUpdate(update)
        ? update(getState(part))
        : update;

      return dispatch<PartAction<Part['i']>>({
        ...part(nextValue),
        type: getType(),
      });
    }

    // @ts-expect-error - `set` cannot determine the tuple from the rest parameters, but it works externally.
    const updatePart = createUpdatePart({ set });

    updatePart.toString = () => type;

    // @ts-expect-error - `set` cannot determine the tuple from the rest parameters, but it works externally.
    return updatePart as StatefulUpdatePart<typeof set>;
  } as StatefulPartUpdater<Part['i']>;
}

/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string>(
  name: Name,
  initialState: []
): PrimitivePart<Name, any[]>;

/**
 * Creates a Part for use in Redux state which is composed
 * of other Parts.
 */
export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  name: Name,
  parts: Parts
): ComposedPart<Name, Parts>;
/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitivePart<Name, State>;

/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the value of at
 * least one Part passed has changed.
 *
 * While the values in state selected are specific to the Parts passed,
 * the update method may be used to dispatch any action.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any,
  Updater extends AnyUpdater
>(
  parts: Parts,
  selector: Selector,
  updater: Updater
): BoundProxyPart<Parts, Selector, Updater>;
/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the state object
 * changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(selector: Selector, updater: Updater): UnboundProxyPart<Selector, Updater>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the value of at least one Part passed has changed.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends (...args: SelectPartArgs<Parts>) => any
>(parts: Parts, selector: Selector): BoundSelectPart<Parts, Selector>;
/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<Selector extends AnyGenericSelector>(
  selector: Selector
): UnboundSelectPart<Selector>;

/**
 * Creates an Update Part, which allows performing updates of values in
 * state. When used with `usePart`, it itself will never trigger an update.
 * As such, it is recommended to use this with `usePartUpdate` instead of
 * `usePart`.
 */
export function part<Updater extends AnyUpdater>(
  _: null,
  update: Updater
): UpdatePart<Updater>;

/**
 * Creates a Part for use in Redux state which is composed
 * of other Parts.
 */
export function part<Name extends string, Parts extends Tuple<AnyStatefulPart>>(
  config: ComposedPartConfig<Name, Parts>
): ComposedPart<Name, Parts>;
/**
 * Creates a Part for use in Redux state.
 */
export function part<Name extends string, State>(
  config: PrimitivePartConfig<Name, State>
): PrimitivePart<Name, State>;

/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the value of at
 * least one Part passed has changed.
 *
 * While the values in state selected are specific to the Parts passed,
 * the update method may be used to dispatch any action.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>,
  Updater extends AnyUpdater
>(
  config: BoundProxyPartConfig<Parts, Selector, Updater>
): BoundProxyPart<Parts, Selector, Updater>;
/**
 * Creates a Proxy Part, which allows deriving a value based on values
 * selected from state, but also performing updates of values in state.
 * When used with `usePart`, it will update whenever the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<
  Selector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  config: UnboundProxyPartConfig<Selector, Updater>
): UnboundProxyPart<Selector, Updater>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the value of at least one Part passed has changed.
 */
export function part<
  Parts extends Tuple<AnySelectablePart>,
  Selector extends AnySelector<Parts>
>(
  config: BoundSelectPartConfig<Parts, Selector>
): BoundSelectPart<Parts, Selector>;

/**
 * Creates a Select Part, which allows deriving a value based on values
 * selected from state. When used with `usePart`, it will update whenever
 * the state object changes.
 *
 * This only beneficial if being used with values in state that are not
 * using Parts. If you only are concerned with values in state that are
 * Parts, you should pass an array of those Parts before the selector.
 */
export function part<Selector extends AnyGenericSelector>(
  config: UnboundSelectPartConfig<Selector>
): UnboundSelectPart<Selector>;

/**
 * Creates an Update Part, which allows performing updates of values in
 * state. When used with `usePart`, it itself will never trigger an update.
 * As such, it is recommended to use this with `usePartUpdate` instead of
 * `usePart`.
 */
export function part<Updater extends AnyUpdater>(
  config: UpdatePartConfig<Updater>
): UpdatePart<Updater>;

export function part<
  Name extends string,
  State,
  Parts extends Tuple<AnyStatefulPart>,
  Selector extends AnySelector<Parts>,
  GenericSelector extends AnyGenericSelector,
  Updater extends AnyUpdater
>(
  first:
    | Name
    | Parts
    | ComposedPartConfig<Name, Parts>
    | PrimitivePartConfig<Name, State>
    | BoundProxyPartConfig<Parts, Selector, Updater>
    | UnboundProxyPartConfig<GenericSelector, Updater>
    | BoundSelectPartConfig<Parts, Selector>
    | UnboundSelectPartConfig<GenericSelector>
    | UpdatePartConfig<Updater>
    | GenericSelector
    | null,
  second?: State | Parts | Selector | Updater,
  third?: Updater
) {
  if (first == null) {
    if (isUpdater(second)) {
      return createUpdatePart({ set: second });
    }

    throw new Error(
      'You provided a nullish first argument which would create an Update Part, but provided an invalid updater ' +
        `as the second argument. A function was expected; received ${typeof second}.`
    );
  }

  if (typeof first === 'string') {
    if (isStatefulPartsList(second)) {
      return createComposedPart({
        name: first,
        parts: second,
      });
    }

    return createPrimitivePart({
      name: first,
      initialState: second,
    });
  }

  if (isSelectablePartsList(first)) {
    if (isSelector(second)) {
      return isUpdater(third)
        ? createBoundProxyPart({ get: second, parts: first, set: third })
        : createBoundSelectPart({ get: second, parts: first });
    }

    throw new Error(
      'You provided a list of Parts as the first argument, which would create a Select Part, but provided ' +
        `an invalid selector as the second argument. A function was expected; received ${typeof second}.`
    );
  }

  if (isPrimitiveConfig(first)) {
    return createPrimitivePart(first);
  }

  if (isUpdateConfig(first)) {
    return createUpdatePart(first);
  }

  if (isBoundProxyConfig(first)) {
    return createBoundProxyPart(first);
  }

  if (isUnboundProxyConfig(first)) {
    return createUnboundProxyPart(first);
  }

  if (isBoundSelectConfig(first)) {
    return createBoundSelectPart(first);
  }

  if (isUnboundSelectConfig(first)) {
    return createUnboundSelectPart(first as any);
  }

  if (isComposedConfig(first)) {
    return createComposedPart(first);
  }

  if (isSelector(first)) {
    return isUpdater(second)
      ? createUnboundProxyPart({ get: first, set: second })
      : createUnboundSelectPart({ get: first });
  }

  throw new Error(
    `The parameters passed are invalid for creating a Part; received [${Array.from(
      arguments,
      (parameter) => typeof parameter
    )}]`
  );
}
