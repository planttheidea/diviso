import { Dispatch, GetState } from './store';

export type IsAny<T, True, False = never> =
  // test if we are going the left AND right path in the condition
  true | false extends (T extends never ? true : false) ? True : False;

export type IsEqual<Type = any> = (a: Type, b: Type) => boolean;

export type AnyFn<Args extends any[], Result> = (...a: Args) => Result;

export type FunctionalUpdate<State> = (prev: State) => State;

export type MaybePromise<Value> = Value | Promise<Value>;

export type NoInfer<T> = [T][T extends any ? 0 : never];

export type ResolvedValue<Value> = Value extends Promise<infer Result>
  ? ResolvedValue<Result>
  : Value;

export type Thunk<Result, State> = (
  dispatch: Dispatch,
  getState: GetState<State>
) => Result;

export type Tuple<Type> = readonly [Type] | readonly Type[];

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
