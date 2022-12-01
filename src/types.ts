import type {
  COMPOSED_SLICE,
  SELECT_SLICE,
  PRIMITIVE_SLICE,
  UPDATE_SLICE,
} from './flags';

export type Tuple<Type> = readonly [Type] | readonly Type[];

export type SliceId = number;

export interface Action<Type = any> {
  type: Type;
}

export interface AnyAction extends Action {
  $$slice?: SliceId;
  meta?: any;
  value?: any;
}

export type Reducer<
  State = any,
  DispatchedAction extends Action = AnyAction
> = (state: State | undefined, action: DispatchedAction) => State;

export interface Dispatch<DispatchedAction extends Action = AnyAction> {
  <Type extends DispatchedAction>(action: Type): Type;
}

declare const $CombinedState: unique symbol;

interface EmptyObject {
  readonly [$CombinedState]?: undefined;
}

export type CombinedState<State> = EmptyObject & State;

export type PreloadedState<State> = Required<State> extends EmptyObject
  ? State extends CombinedState<infer NestedState>
    ? {
        [Key in keyof NestedState]?: NestedState[Key] extends object
          ? PreloadedState<NestedState[Key]>
          : NestedState[Key];
      }
    : State
  : {
      [Key in keyof State]: State[Key] extends
        | string
        | number
        | boolean
        | symbol
        ? State[Key]
        : PreloadedState<State[Key]>;
    };

export type Observable<T> = {
  subscribe: (observer: Observer<T>) => { unsubscribe: Unsubscribe };

  ['@@observable'](): Observable<T>;
};

/**
 * An Observer is used to receive data from an Observable, and is supplied as
 * an argument to subscribe.
 */
export type Observer<T> = {
  next?(value: T): void;
};

export interface Store<
  State = any,
  DispatchableAction extends Action = AnyAction
> {
  [extraKey: string]: any;

  dispatch: Dispatch<DispatchableAction>;
  getState: GetState<State>;
  replaceReducer<NextState, NextDispatchableAction extends Action>(
    nextReducer: Reducer<NextState, NextDispatchableAction>
  ): void;
  subscribe(listener: Listener): Unsubscribe;
  subscribeToSlice: SubscribeToSlice;
  ['@@observable'](): Observable<State>;
}

type ConfigureEnhancersCallback<State, DispatchableAction extends Action> = (
  defaultEnhancers: Array<StoreEnhancer<State, DispatchableAction>>
) => Array<StoreEnhancer<State, DispatchableAction>>;

export interface StoreConfig<
  Slices extends readonly AnyStatefulSlice[],
  DispatchableAction extends Action
> {
  devTools?: boolean;
  enhancers?:
    | Array<StoreEnhancer<SlicesState<Slices>, DispatchableAction>>
    | ConfigureEnhancersCallback<SlicesState<Slices>, DispatchableAction>;
  middlewares?: Middleware[];
  notifier?: Notifier;
  preloadedState?: PreloadedState<SlicesState<Slices>>;
  slices: Slices;
}

export type StoreEnhancer<State, DispatchableAction extends Action> = (
  createStore: StoreCreator<State, DispatchableAction>
) => StoreCreator<State, DispatchableAction>;

export type StoreCreator<State, DispatchableAction extends Action> = (
  reducer: Reducer<State, DispatchableAction>,
  preloadedState: PreloadedState<State> | undefined,
  enhancer?: StoreEnhancer<State, DispatchableAction> | undefined
) => Store<State, DispatchableAction>;

export interface MiddlewareAPI<
  MiddlewareDispatch extends Dispatch = Dispatch,
  State = any
> {
  dispatch: MiddlewareDispatch;
  getState: GetState<State>;
}

export interface Middleware<
  State = any,
  MiddlewareDispatch extends Dispatch = Dispatch
> {
  (api: MiddlewareAPI<MiddlewareDispatch, State>): (
    next: MiddlewareDispatch
  ) => (
    action: MiddlewareDispatch extends Dispatch<infer Action> ? Action : never
  ) => any;
}

export type FunctionalUpdate<Value> = (current: Value) => Value;

export type Read<State> = (getState: GetState) => State;
export type Write<State> = <Meta, Result extends void | Promise<void>>(
  getState: GetState,
  dispatch: Dispatch,
  update: State | FunctionalUpdate<State>,
  overrides?: StatefulSliceActionOverrides<Meta>
) => Result;

export interface StatefulSliceActionOverrides<Meta> {
  meta?: Meta;
  type?: AnyStatefulSliceAction['type'];
}

export type Listener = () => void;
export type Unsubscribe = () => void;
export type Notify = () => void;
export type Notifier = (notify: Notify) => void;

export type SliceState<StatefulSlice extends AnyStatefulSlice> = {
  [Name in StatefulSlice as StatefulSlice['n']]: StatefulSlice['d'];
};

export type SourceResult<Source> = Source extends AnyStatefulSlice
  ? Source['d']
  : Source extends AnySelectSlice
  ? ReturnType<Source['select']>
  : any;

export type CombineState<
  PrevState,
  Slices extends Tuple<AnyStatefulSlice>
> = Slices extends [
  infer Head extends AnyStatefulSlice,
  ...infer Tail extends Tuple<AnyStatefulSlice>
]
  ? CombineState<PrevState & SliceState<Head>, Tail>
  : {} extends PrevState
  ? Record<string, any>
  : PrevState;

export type ExtendState<State, StoreExtensions> = [StoreExtensions] extends [
  never
]
  ? State
  : Omit<State, keyof StoreExtensions> & StoreExtensions;

export type SlicesState<Slices extends Tuple<AnyStatefulSlice>> = CombineState<
  {},
  [...Slices]
>;
export type AnySlicesState = SlicesState<AnyStatefulSlice[]>;

export interface GetState<
  State = any,
  Source extends AnySelectSlice | AnyStatefulSlice =
    | AnySelectSlice
    | AnyStatefulSlice
> {
  (): State;
  (source: Source): SourceResult<Source>;
}

export type SubscribeToSlice = (
  slice: AnyStatefulSlice,
  listener: Listener
) => Unsubscribe;

export type IsEqual<Value> = (a: Value, b: Value) => boolean;

type MergeSelectSliceArgs<
  Args extends any[],
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>
> = Sources extends [
  infer Head extends AnySelectSlice | AnyStatefulSlice,
  ...infer Tail extends Tuple<AnySelectSlice | AnyStatefulSlice>
]
  ? MergeSelectSliceArgs<[...Args, SourceResult<Head>], Tail>
  : Args;

export type SelectSliceArgs<
  Sources extends Tuple<AnySelectSlice | AnyStatefulSlice>
> = MergeSelectSliceArgs<[], [...Sources]>;

export interface BaseSlice {
  i: SliceId;
}
export interface BaseStatefulSlice<Name extends string, State>
  extends BaseSlice {
  action: <Meta>(
    nextValue: State,
    overrides?: StatefulSliceActionOverrides<Meta>
  ) => StatefulSliceAction<State, Meta>;
  reset: <Meta>(
    overrides?: StatefulSliceActionOverrides<Meta>
  ) => StatefulSliceAction<State, Meta>;
  toString: () => Name;

  d: State;
  h: StatefulSliceReducer<State>;
  n: Name;
  o: string;
  p: string[];
  r: Read<State>;
  s: AnyStatefulSlice[];
  w: Write<State>;
}
export interface PrimitiveSlice<Name extends string, State>
  extends BaseStatefulSlice<Name, State> {
  c: null;
  t: typeof PRIMITIVE_SLICE;
}
export interface SelectSlice<Handler extends (...args: any[]) => any>
  extends BaseSlice {
  reset: never;
  select: Read<ReturnType<Handler>>;

  d: never;
  e: IsEqual<ReturnType<Handler>>;
  h: Handler;
  r: Read<ReturnType<Handler>>;
  s: AnyStatefulSlice[];
  t: typeof SELECT_SLICE;
  w: never;
}
export interface ComposedSlice<Name extends string, State>
  extends BaseStatefulSlice<Name, State> {
  c: readonly AnyStatefulSlice[];
  t: typeof COMPOSED_SLICE;
}

export type StatefulSlice<
  Name extends string,
  State,
  Composed
> = Composed extends true
  ? ComposedSlice<Name, State>
  : PrimitiveSlice<Name, State>;

export interface StatefulSliceConfig<State> {
  handle?: (state: State, action: any) => State;
  read?: Read<State>;
  write?: Write<State>;
  type?: string;
}

export interface PrimitiveSliceConfig<State>
  extends StatefulSliceConfig<State> {
  initialState: State;
}

export interface ComposedSliceConfig<Slices extends readonly AnyStatefulSlice[]>
  extends StatefulSliceConfig<SlicesState<[...Slices]>> {
  slices: Slices;
}

export interface StatefulSliceAction<State, Meta> {
  $$slice: SliceId;
  meta?: Meta;
  value: State;
  type: string;
}

export interface StatefulSliceActionOverrides<Meta> {
  meta?: Meta;
  type?: AnyStatefulSliceAction['type'];
}

export interface StatefulSliceReducer<State> {
  (state: State, action: AnyAction): State;
}

export interface UseSliceValueInstance<Selection> {
  h: boolean;
  v: Selection | null;
}

export type UpdateSliceArgs<Handler extends (...args: any[]) => any> =
  Handler extends (
    getState: GetState,
    dispatch: Dispatch,
    ...rest: infer Rest
  ) => any
    ? Rest
    : never;

export type UpdateSliceHandler = (
  getState: GetState,
  dispatch: Dispatch,
  ...args: any[]
) => any;

export interface UpdateSlice<Handler extends UpdateSliceHandler>
  extends BaseSlice {
  update: Handler;

  d: never;
  r: never;
  s: [];
  t: typeof UPDATE_SLICE;
  w: Handler;
}

export type UseUpdateSliceHandler<Handler extends UpdateSliceHandler> = (
  ...args: UpdateSliceArgs<Handler>
) => ReturnType<Handler>;

export type AnySlice = AnyStatefulSlice | AnySelectSlice | AnyUpdateSlice;
export type AnyComposedSlice = StatefulSlice<string, any, true>;
export type AnyPrimitiveSlice = StatefulSlice<string, any, false>;
export type AnyStatefulSlice = AnyComposedSlice | AnyPrimitiveSlice;
export type AnyStatefulSliceAction = StatefulSliceAction<any, any>;
export type AnyStatefulSliceReducer = StatefulSliceReducer<any>;
export type AnySelectSlice = SelectSlice<(...args: any[]) => any>;
export type AnyUpdateSlice = UpdateSlice<UpdateSliceHandler>;
