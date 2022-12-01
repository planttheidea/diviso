import {
  COMPOSED_SLICE,
  SELECT_SLICE,
  PRIMITIVE_SLICE,
  UPDATE_SLICE,
} from './flags';
import {
  getDescendantSlices,
  getId,
  is,
  isSelectSlice,
  isStatefulSlice,
  toScreamingSnakeCase,
} from './utils';

import type {
  AnyAction,
  AnySelectSlice,
  AnyStatefulSlice,
  ComposedSlice,
  ComposedSliceConfig,
  Dispatch,
  FunctionalUpdate,
  GetState,
  IsEqual,
  PrimitiveSlice,
  PrimitiveSliceConfig,
  Read,
  SelectSlice,
  SelectSliceArgs,
  StatefulSlice,
  StatefulSliceAction,
  StatefulSliceActionOverrides,
  SlicesState,
  Tuple,
  Write,
  UpdateSlice,
  UpdateSliceHandler,
} from './types';

const sliceArray = Array.prototype.slice;

function isFunctionalUpdate<Value>(
  value: any
): value is FunctionalUpdate<Value> {
  return typeof value === 'function';
}

function createAction<S extends AnyStatefulSlice>(
  slice: S,
  typeOverride: string | undefined
) {
  type State = S['d'];

  const type = typeOverride || toScreamingSnakeCase(`Update ${slice.n}`);

  return function <Meta>(
    nextState: State,
    overrides?: StatefulSliceActionOverrides<Meta>
  ): StatefulSliceAction<State, Meta> {
    const action = {
      $$slice: slice.i,
      value: nextState,
      type,
    } as StatefulSliceAction<State, Meta>;

    if (overrides) {
      if (overrides.meta) {
        action.meta = overrides.meta;
      }

      if (overrides.type) {
        action.type = overrides.type;
      }
    }

    return action;
  };
}

function createReset<S extends AnyStatefulSlice>(slice: S) {
  type State = S['d'];

  const type = toScreamingSnakeCase(`Reset ${slice.n}`);

  return function <Meta>(
    overrides?: StatefulSliceActionOverrides<Meta>
  ): StatefulSliceAction<State, Meta> {
    const action = {
      $$slice: slice.i,
      value: slice.d,
      type,
    } as StatefulSliceAction<State, Meta>;

    if (overrides) {
      if (overrides.meta) {
        action.meta = overrides.meta;
      }

      if (overrides.type) {
        action.type = overrides.type;
      }
    }

    return action;
  };
}

function createDefaultComposedHandle<S extends AnyStatefulSlice>(slice: S) {
  type State = S['d'];

  return function handle(state: State = slice.d, action: AnyAction): State {
    return action.$$slice === slice.i && !is(state[slice.n], action.value)
      ? { ...state, [slice.n]: action.value }
      : slice.d;
  };
}

function createDefaultPrimitiveHandle<S extends AnyStatefulSlice>(slice: S) {
  type State = S['d'];

  return function handle(state: State = slice.d, action: AnyAction): State {
    return action.$$slice === slice.i && !is(state, action.value)
      ? action.value
      : state;
  };
}

function createDefaultRead<S extends AnyStatefulSlice>(slice: S) {
  return function read(getState: GetState): S['d'] {
    return getState(slice);
  };
}

function createDefaultWrite<S extends AnyStatefulSlice>(slice: S) {
  return function write<Meta>(
    getState: GetState,
    dispatch: Dispatch,
    update: S['d'] | FunctionalUpdate<S['d']>,
    overrides?: StatefulSliceActionOverrides<Meta>
  ) {
    const nextState = isFunctionalUpdate(update)
      ? update(getState(slice))
      : update;

    dispatch(slice.action(nextState, overrides));
  } as Write<S['d']>;
}

function createComposedSlice<
  Name extends string,
  ChildSlices extends readonly AnyStatefulSlice[]
>(name: Name, config: ComposedSliceConfig<ChildSlices>) {
  type ComposedState = SlicesState<[...ChildSlices]>;

  const initialState = config.slices.reduce((state, childSlice) => {
    state[childSlice.n as keyof ComposedState] = childSlice.d;

    return state;
  }, {} as ComposedState);

  const slice = {
    toString: () => name,

    c: config.slices,
    d: initialState,
    i: getId(name),
    n: name,
    p: [name],
    s: getDescendantSlices(config.slices),
    t: COMPOSED_SLICE,
  } as unknown as StatefulSlice<Name, ComposedState, true>;

  slice.s.forEach((descendantSlice) => {
    const originalHandler = descendantSlice.h;
    const parentName = descendantSlice.o;

    descendantSlice.h = (state: Record<string, any>, action: AnyAction) => ({
      ...state,
      [parentName]: originalHandler(state[parentName], action),
    });
    descendantSlice.o = name;
    descendantSlice.p = [name, ...descendantSlice.p];
    descendantSlice.i = getId(descendantSlice.p.join('_'));
  });

  slice.h = config.handle || createDefaultComposedHandle(slice);
  slice.r = config.read || createDefaultRead(slice);
  slice.w = config.write || createDefaultWrite(slice);

  slice.action = createAction(slice, config.type);
  slice.reset = createReset(slice);

  return slice;
}

function createPrimitiveSlice<Name extends string, State>(
  name: Name,
  config: PrimitiveSliceConfig<State>
) {
  const slice = {
    toString: () => name,

    c: null,
    d: config.initialState,
    h: config.handle,
    i: getId(name),
    n: name,
    o: name,
    p: [name],
    r: config.read,
    t: PRIMITIVE_SLICE,
    w: config.write,
  } as unknown as StatefulSlice<Name, State, false>;

  slice.h = config.handle || createDefaultPrimitiveHandle(slice);
  slice.r = config.read || createDefaultRead(slice);
  slice.s = [slice];
  slice.w = config.write || createDefaultWrite(slice);

  slice.action = createAction(slice, config.type);
  slice.reset = createReset(slice);

  return slice;
}

function createSelect<
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  Handler extends (...args: SelectSliceArgs<Sources>) => any
>(
  sources: Sources,
  handler: Handler,
  isEqual: IsEqual<ReturnType<Handler>>
): Read<ReturnType<Handler>> {
  type Values = SelectSliceArgs<Sources>;
  type Result = ReturnType<Handler>;

  const length = sources.length;

  let values: Values;
  let result: Result;

  return function select(getState: GetState): Result {
    if (!values) {
      values = sources.map((source) =>
        isStatefulSlice(source) ? getState(source) : source.select(getState)
      ) as Values;

      return (result = handler(...values));
    }

    const nextValues = [] as Values;

    let valuesChanged = false;

    for (let index = 0; index < length; ++index) {
      const source = sources[index];

      nextValues[index] = isStatefulSlice(source)
        ? getState(source)
        : source.select(getState);
      valuesChanged =
        valuesChanged || isEqual(values[index], nextValues[index]);
    }

    values = nextValues;

    return valuesChanged ? (result = handler(...values)) : result;
  };
}

export function createSelectSlice<
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any
>(
  sources: Sources,
  handler: SourcesHandler,
  isEqual: IsEqual<ReturnType<SourcesHandler>> = is
) {
  const subscriptionSources = Array.from(
    sources.reduce<Set<AnyStatefulSlice>>((slices, source) => {
      if (isStatefulSlice(source)) {
        slices.add(source);
      } else if (isSelectSlice(source)) {
        source.s!.forEach((sourceSlice: AnyStatefulSlice) => {
          slices.add(sourceSlice);
        });
      } else {
        throw new Error('Invalid source provided to slice select');
      }

      return slices;
    }, new Set())
  );
  const select = createSelect(sources, handler as SourcesHandler, isEqual);

  const slice = {
    select,

    e: isEqual,
    h: handler,
    i: getId('SelectSlice'),
    r: select,
    s: subscriptionSources,
    t: SELECT_SLICE,
  } as SelectSlice<SourcesHandler>;

  return slice;
}

export function createUpdateSlice<Handler extends UpdateSliceHandler>(
  handler: Handler
) {
  const slice = {
    update: handler,

    i: getId('UpdateSlice'),
    s: [],
    t: UPDATE_SLICE,
    w: handler,
  } as UpdateSlice<Handler>;

  return slice;
}

function isComposedConfig(
  value: any
): value is ComposedSliceConfig<AnyStatefulSlice[]> {
  return !!value && typeof value === 'object' && 'slices' in value;
}

function isPrimitiveConfig(value: any): value is PrimitiveSliceConfig<any> {
  return !!value && typeof value === 'object' && 'initialState' in value;
}

function isSelectSources(
  value: any
): value is Tuple<AnySelectSlice | AnyStatefulSlice> {
  return Array.isArray(value);
}

export function createSlice<Name extends string, State>(
  name: Name,
  config: PrimitiveSliceConfig<State>
): PrimitiveSlice<Name, State>;
export function createSlice<
  Name extends string,
  ChildSlices extends readonly AnyStatefulSlice[]
>(
  name: Name,
  config: ComposedSliceConfig<ChildSlices>
): ComposedSlice<Name, SlicesState<[...ChildSlices]>>;

export function createSlice<Name extends string, State>(
  name: Name,
  initialState: State
): PrimitiveSlice<Name, State>;
export function createSlice<
  Name extends string,
  ChildSlices extends readonly AnyStatefulSlice[]
>(
  name: Name,
  ...slices: ChildSlices
): ComposedSlice<Name, SlicesState<[...ChildSlices]>>;

export function createSlice<
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any
>(
  sources: Sources,
  handler: SourcesHandler,
  isEqual?: IsEqual<ReturnType<SourcesHandler>>
): SelectSlice<SourcesHandler>;

export function createSlice<UpdateHandler extends UpdateSliceHandler>(
  _ignored: null | undefined,
  handler: UpdateHandler
): UpdateSlice<UpdateHandler>;

export function createSlice<
  Name extends string,
  State,
  ChildSlices extends readonly AnyStatefulSlice[],
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>,
  SourcesHandler extends (...args: SelectSliceArgs<Sources>) => any,
  UpdateHandler extends UpdateSliceHandler
>(
  name: Name | Sources | null,
  config?:
    | PrimitiveSliceConfig<State>
    | ComposedSliceConfig<ChildSlices>
    | AnyStatefulSlice
    | State
    | SourcesHandler
    | UpdateHandler,
  maybeIsEqual?: IsEqual<ReturnType<SourcesHandler>>
) {
  if (!name) {
    return createUpdateSlice(config as UpdateHandler);
  }

  if (isSelectSources(name)) {
    return createSelectSlice(
      name as Sources,
      config as SourcesHandler,
      maybeIsEqual
    );
  }

  if (isComposedConfig(config)) {
    return createComposedSlice(name, config);
  }

  if (isPrimitiveConfig(config)) {
    return createPrimitiveSlice(name, config);
  }

  if (isStatefulSlice(config)) {
    // eslint-disable-next-line prefer-rest-params
    return createComposedSlice(name, { slices: sliceArray.call(arguments, 1) });
  }

  return createPrimitiveSlice(name, { initialState: config });
}
