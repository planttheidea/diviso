import { kindOf } from './utils';

import type { ActionCreator, ActionCreatorsMapObject, Dispatch } from './types';

function bindActionCreator<UnboundActionCreator extends ActionCreator<any>>(
  actionCreator: UnboundActionCreator,
  dispatch: Dispatch
) {
  return function (this: any, ...args: Parameters<UnboundActionCreator>) {
    return dispatch(actionCreator.apply(this, args));
  };
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
export function bindActionCreators<
  ActionType,
  ActionCreatorType extends ActionCreator<ActionType>
>(actionCreator: ActionCreatorType, dispatch: Dispatch): ActionCreatorType;

export function bindActionCreators<
  UnboundActionCreator extends ActionCreator<any>,
  BoundActionCreator extends ActionCreator<any>
>(actionCreator: UnboundActionCreator, dispatch: Dispatch): BoundActionCreator;

export function bindActionCreators<
  ActionType,
  ActionCreatorsMapObjectType extends ActionCreatorsMapObject<ActionType>
>(
  actionCreators: ActionCreatorsMapObjectType,
  dispatch: Dispatch
): ActionCreatorsMapObjectType;
export function bindActionCreators<
  UnboundActionCreatorsMapObject extends ActionCreatorsMapObject,
  BoundActionCreatorsMapObject extends ActionCreatorsMapObject
>(
  actionCreators: UnboundActionCreatorsMapObject,
  dispatch: Dispatch
): BoundActionCreatorsMapObject;

export function bindActionCreators(
  actionCreators: ActionCreator<any> | ActionCreatorsMapObject,
  dispatch: Dispatch
) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, but instead received: '${kindOf(
        actionCreators
      )}'. ` +
        `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    );
  }

  const boundActionCreators: ActionCreatorsMapObject = {};
  for (const key in actionCreators) {
    const actionCreator = actionCreators[key];
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }
  return boundActionCreators;
}
