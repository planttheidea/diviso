import type { PartId } from './part.mjs';
import type { Dispatch } from './store.mjs';
/**
 * An *action* is a plain object that represents an intention to change the
 * state. Actions are the only way to get data into the store. Any data,
 * whether from UI events, network callbacks, or other sources such as
 * WebSockets needs to eventually be dispatched as actions.
 *
 * Actions must have a `type` field that indicates the type of action being
 * performed. Types can be defined as constants and imported from another
 * module. It's better to use strings for `type` than Symbols because strings
 * are serializable.
 *
 * Other than `type`, the structure of an action object is really up to you.
 * If you're interested, check out Flux Standard Action for recommendations on
 * how actions should be constructed.
 */
export interface Action<Type = any> {
    type: Type;
}
/**
 * An Action type which accepts any other properties.
 * This is mainly for the use of the `Reducer` type.
 * This is not part of `Action` itself to prevent types that extend `Action` from
 * having an index signature.
 */
export interface AnyAction extends Action {
    [extraProps: string]: any;
}
export interface PartAction<Value = any> extends Action {
    $$part: PartId;
    value: Value;
}
/**
 * An *action creator* is, quite simply, a function that creates an action. Do
 * not confuse the two terms—again, an action is a payload of information, and
 * an action creator is a factory that creates an action.
 *
 * Calling an action creator only produces an action, but does not dispatch
 * it. You need to call the store's `dispatch` function to actually cause the
 * mutation. Sometimes we say *bound action creators* to mean functions that
 * call an action creator and immediately dispatch its result to a specific
 * store instance.
 *
 * If an action creator needs to read the current state, perform an API call,
 * or cause a side effect, like a routing transition, it should return an
 * async action instead of an action.
 */
export interface ActionCreator<ActionObject, Params extends any[] = any[]> {
    (...args: Params): ActionObject;
}
/**
 * Object whose values are action creator functions.
 */
export interface ActionCreatorsMapObject<ActionObject = any, Params extends any[] = any[]> {
    [key: string]: ActionCreator<ActionObject, Params>;
}
/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass an action creator as the first argument,
 * and get a dispatch wrapped function in return.
 *
 * @param actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
export declare function bindActionCreators<ActionType, ActionCreatorType extends ActionCreator<ActionType>>(actionCreator: ActionCreatorType, dispatch: Dispatch): ActionCreatorType;
export declare function bindActionCreators<UnboundActionCreator extends ActionCreator<any>, BoundActionCreator extends ActionCreator<any>>(actionCreator: UnboundActionCreator, dispatch: Dispatch): BoundActionCreator;
export declare function bindActionCreators<ActionType, ActionCreatorsMapObjectType extends ActionCreatorsMapObject<ActionType>>(actionCreators: ActionCreatorsMapObjectType, dispatch: Dispatch): ActionCreatorsMapObjectType;
export declare function bindActionCreators<UnboundActionCreatorsMapObject extends ActionCreatorsMapObject, BoundActionCreatorsMapObject extends ActionCreatorsMapObject>(actionCreators: UnboundActionCreatorsMapObject, dispatch: Dispatch): BoundActionCreatorsMapObject;
