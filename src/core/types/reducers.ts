import type { Action, AnyAction } from './actions';
import type { AnyStatefulPart } from './part';
import type { PartMap } from './store';

/**
 * ActionObject *reducer* (also called a *reducing function*) is a function that accepts
 * an accumulation and a value and returns a new accumulation. They are used
 * to reduce a collection of values down to a single value
 *
 * Reducers are not unique to Redux—they are a fundamental concept in
 * functional programming.  Even most non-functional languages, like
 * JavaScript, have a built-in API for reducing. In JavaScript, it's
 * `Array.prototype.reduce()`.
 *
 * In Redux, the accumulated value is the state object, and the values being
 * accumulated are actions. Reducers calculate a new state given the previous
 * state and an action. They must be *pure functions*—functions that return
 * the exact same output for given inputs. They should also be free of
 * side-effects. This is what enables exciting features like hot reloading and
 * time travel.
 *
 * Reducers are the most important concept in Redux.
 *
 * *Do not put API calls into reducers.*
 */
export type Reducer<State = any, ActionObject extends Action = AnyAction> = (
  state: State | undefined,
  action: ActionObject
) => State;

/**
 * Object whose values correspond to different reducer functions.
 */
export type ReducersMapObject<
  State = any,
  ActionObject extends Action = AnyAction
> = {
  [Key in keyof State]: Reducer<State[Key], ActionObject>;
};

/**
 * Infer a combined state shape from a `ReducersMapObject`.
 */
export type StateFromReducersMapObject<MapObject> =
  MapObject extends ReducersMapObject
    ? {
        [Key in keyof MapObject]: MapObject[Key] extends Reducer<
          infer State,
          any
        >
          ? State
          : never;
      }
    : never;

/**
 * Infer reducer union type from a `ReducersMapObject`.
 */
export type ReducerFromReducersMapObject<MapObject> = MapObject extends {
  [Key in keyof MapObject]: infer Source;
}
  ? Source extends Reducer<any, any>
    ? Source
    : never
  : never;

/**
 * Infer action type from a reducer function.
 */
export type ActionFromReducer<Source> = Source extends Reducer<
  any,
  infer ActionObject
>
  ? ActionObject
  : never;

/**
 * Infer action union type from a `ReducersMapObject`.
 */
export type ActionFromReducersMapObject<MapObject> =
  MapObject extends ReducersMapObject
    ? ActionFromReducer<ReducerFromReducersMapObject<MapObject>>
    : never;

export interface CreateReducerConfig<
  Parts extends readonly AnyStatefulPart[],
  OtherReducerState,
  DispatchableAction extends AnyAction
> {
  otherReducer?:
    | Reducer<OtherReducerState, DispatchableAction>
    | ReducersMapObject<OtherReducerState, DispatchableAction>
    | undefined;
  partMap: PartMap;
  parts: Parts;
}
