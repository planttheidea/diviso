import { noop } from 'diviso-shared';
import { updateUniqueList } from './utils';
import { isPartAction, isSelectablePart } from './validate';

import type { Action, AnyAction } from './actions';
import type {
  AnySelectPart,
  AnySelectablePart,
  AnyStatefulPart,
  CombinedPartsState,
  PartId,
  PartState,
} from './part';
import type { Reducer } from './reducer';
import type {
  Dispatch,
  GetState,
  GetVersion,
  Listener,
  Notifier,
  Notify,
  PartMap,
  PreloadedState,
  Store,
  StoreEnhancer,
  StoreEnhancerStoreCreator,
  SubscribeToPart,
  Unsubscribe,
} from './store';

export interface EnhancerConfig {
  notifier: Notifier;
  partMap: PartMap;
}

export type Enhancer<
  Parts extends readonly AnyStatefulPart[],
  DispatchableAction extends Action = AnyAction
> = StoreEnhancer<
  PartsStoreExtensions<CombinedPartsState<Parts>, DispatchableAction>
>;

export type EnhancerStoreCreator<
  Parts extends readonly AnyStatefulPart[],
  DispatchableAction extends Action = AnyAction
> = StoreEnhancerStoreCreator<
  PartsStoreExtensions<CombinedPartsState<Parts>, DispatchableAction>
>;

export interface PartsStoreExtensions<
  State = any,
  DispatchableAction extends Action = AnyAction
> {
  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will be
   * considered the **next** state of the tree, and the change listeners will
   * be notified.
   *
   * The base implementation only supports plain object actions. If you want
   * to dispatch a Promise, an Observable, a thunk, or something else, you
   * need to wrap your store creating function into the corresponding
   * middleware. For example, see the documentation for the `redux-thunk`
   * package. Even the middleware will eventually dispatch plain object
   * actions using this method.
   *
   * @param action A plain object representing “what changed”. It is a good
   *   idea to keep actions serializable so you can record and replay user
   *   sessions, or use the time travelling `redux-devtools`. An action must
   *   have a `type` property which may not be `undefined`. It is a good idea
   *   to use string constants for action types.
   *
   * @returns For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  dispatch: Dispatch<DispatchableAction>;
  /**
   * Reads the state tree managed by the store, or if a Part is passed, returns
   * the state specific to that Part.
   *
   * @param [part] The part to get the state of.
   * @returns The state requested.
   */
  getState: GetState<State>;
  /**
   * Returns the version of state, which updates whenever the reference changes.
   */
  getVersion: GetVersion;
  /**
   * Adds a change listener, which is called any time state changes. You may then
   * call getState() to read the current state tree inside the callback.
   *
   * You may call dispatch() from a change listener, with the following caveats:
   *
   * 1. The subscriptions are snapshotted just before every dispatch() call. If you
   *    subscribe or unsubscribe while the listeners are being invoked, this will not
   *    have any effect on the dispatch() that is currently in progress. However, the
   *    next dispatch() call, whether nested or not, will use a more recent snapshot
   *    of the subscription list.
   * 2. The listener should not expect to see all states changes, as the state might
   *    have been updated multiple times during a nested dispatch() before the listener
   *    is called. It is, however, guaranteed that all subscribers registered before the
   *    dispatch() started will be called with the latest state by the time it exits.
   *
   * @param listener A callback to be invoked whenver state changes.
   * @returns A function to remove this change listener.
   */
  subscribe: Store['subscribe'];
  /**
   * Adds a change listener. It will be called any time an action is dispatched, and some
   * part of the state tree may potentially have changed. You may then call getState() to
   * read the current state tree inside the callback.
   *
   * You may call dispatch() from a change listener, with the following caveats:
   *
   * 1. The subscriptions are snapshotted just before every dispatch() call. If you
   *    subscribe or unsubscribe while the listeners are being invoked, this will not
   *    have any effect on the dispatch() that is currently in progress. However, the
   *    next dispatch() call, whether nested or not, will use a more recent snapshot
   *    of the subscription list.
   * 2. The listener should not expect to see all states changes, as the state might
   *    have been updated multiple times during a nested dispatch() before the listener
   *    is called. It is, however, guaranteed that all subscribers registered before the
   *    dispatch() started will be called with the latest state by the time it exits.
   *
   * @param listener A callback to be invoked whenver state changes.
   * @returns A function to remove this change listener.
   */
  subscribeToDispatch: Store['subscribe'];
  /**
   * Adds a change listener, which is called any time state changes. You may then
   * call getState() to read the current state tree inside the callback.
   *
   * You may call dispatch() from a change listener, with the following caveats:
   *
   * 1. The subscriptions are snapshotted just before every dispatch() call. If you
   *    subscribe or unsubscribe while the listeners are being invoked, this will not
   *    have any effect on the dispatch() that is currently in progress. However, the
   *    next dispatch() call, whether nested or not, will use a more recent snapshot
   *    of the subscription list.
   * 2. The listener should not expect to see all states changes, as the state might
   *    have been updated multiple times during a nested dispatch() before the listener
   *    is called. It is, however, guaranteed that all subscribers registered before the
   *    dispatch() started will be called with the latest state by the time it exits.
   *
   * @param part The part that, when updated, will notify the listener.
   * @param listener A callback to be invoked whenver state for the part changes.
   * @returns A function to remove this change listener.
   */
  subscribeToPart: SubscribeToPart;
}

export function createGetState<State>(
  originalGetState: Store<State>['getState'],
  getVersion?: GetVersion
): GetState<State> {
  function getState<Part extends AnySelectPart | AnyStatefulPart>(
    part?: Part
  ): Part extends any ? PartState<Part> : State {
    return part && isSelectablePart(part)
      ? part.g(getState, getVersion)
      : originalGetState();
  }

  return getState;
}

export function createEnhancer<
  Parts extends readonly AnyStatefulPart[],
  DispatchableAction extends Action = AnyAction
>({ notifier, partMap }: EnhancerConfig): Enhancer<Parts, DispatchableAction> {
  type PartedState = CombinedPartsState<Parts>;

  return function enhancer(createStore) {
    return function enhance<StoreReducer extends Reducer>(
      reducer: StoreReducer,
      preloadedState: PreloadedState<PartedState> | undefined
    ) {
      const partListenerMap = {} as Record<
        number,
        [Listener[] | null, Listener[]]
      >;

      const batch = notifier || ((notify: Notify) => notify());
      const store = createStore(reducer, preloadedState);
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;
      const originalSubscribe = store.subscribe;

      let notifyPartsQueue: AnySelectablePart[] = [];
      let storeListeners: Listener[] | null = [];
      let nextStoreListeners = storeListeners!;
      let version = 0;

      /**
       * Add the Part id as a unique entry to the queue to be notified, ensuring that any dependents
       * that also need to be notified are included and in the order needed for future gets.
       */
      function addPartsToNotify(
        partsToNotify: PartId[],
        part: AnySelectablePart
      ) {
        let index = partsToNotify.indexOf(part.id);

        if (index === -1) {
          partsToNotify.push(part.id);
        } else {
          for (
            const maxIndex = partsToNotify.length - 1;
            index < maxIndex;
            ++index
          ) {
            partsToNotify[index] = partsToNotify[index + 1]!;
          }

          partsToNotify[index] = part.id;
        }

        for (let index = 0; index < part.d.length; ++index) {
          addPartsToNotify(partsToNotify, part.d[index]!);
        }
      }

      function dispatch(action: any) {
        const prev = originalGetState();
        const result = originalDispatch(action);
        const next = originalGetState();

        if (prev !== next) {
          if (isPartAction(action)) {
            const id = action.$$part;
            const part = partMap[id];

            if (!part) {
              throw new Error(
                `Part with id ${id} not found. Is it included in this store?`
              );
            }

            // Only queue the part notification if state has changed, otherwise
            // it will cause unnecessary work.
            queuePartsToNotify(part);
          }

          version++;
          notify();
        }

        return result;
      }

      const getState = createGetState(originalGetState, () => version);

      function getVersion(): number {
        return version;
      }

      function notify() {
        batch(notifyListeners);
      }

      function notifyListeners() {
        const listeners = (storeListeners = nextStoreListeners);

        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]!();
        }

        const nextNotifyPartsQueue = notifyPartsQueue;

        notifyPartsQueue = [];

        // Delay the construction of parts to notify until notification is required, in case there are
        // timing concidences related to parts added / removed as dependents, which could impact
        // the notification tree.
        const partsToNotify: PartId[] = [];
        for (let index = 0; index < nextNotifyPartsQueue.length; ++index) {
          addPartsToNotify(partsToNotify, nextNotifyPartsQueue[index]!);
        }

        for (let index = 0; index < partsToNotify.length; ++index) {
          const partListeners = partListenerMap[partsToNotify[index]!];

          if (!partListeners) {
            continue;
          }

          const listeners = (partListeners[0] = partListeners[1]);

          for (let index = 0; index < listeners.length; ++index) {
            listeners[index]!();
          }
        }
      }

      function queuePartsToNotify(part: AnyStatefulPart): AnyStatefulPart[] {
        const descendantParts: AnyStatefulPart[] = [];

        for (let index = 0; index < part.c.length; ++index) {
          queuePartsToNotify(part.c[index]!);
        }

        updateUniqueList(notifyPartsQueue, part);

        return descendantParts;
      }

      function subscribe(listener: Listener): Unsubscribe {
        if (typeof listener !== 'function') {
          throw new Error(
            `Expected the listener to be a function; received '${typeof listener}'`
          );
        }

        let subscribed = true;
        updateStoreListeners(listener, true);

        return () => {
          if (!subscribed) {
            return;
          }

          subscribed = false;
          updateStoreListeners(listener, false);
        };
      }

      function subscribeToPart(part: AnySelectablePart, listener: Listener) {
        if (typeof listener !== 'function') {
          throw new Error(
            `Expected the listener to be a function; received '${typeof listener}'`
          );
        }

        if (!isSelectablePart(part)) {
          return noop;
        }

        if (!partListenerMap[part.id]) {
          const initialListeners: Listener[] = [];

          partListenerMap[part.id] = [initialListeners, initialListeners];
        }

        if ((part as any).b === false) {
          subscribe(listener);
        }

        let subscribed = true;
        updatePartListeners(part, listener, true);

        return () => {
          if (!subscribed) {
            return;
          }

          subscribed = false;
          updatePartListeners(part, listener, false);
        };
      }

      function updatePartListeners(
        part: AnySelectablePart,
        listener: Listener,
        add: boolean
      ) {
        const partListeners = partListenerMap[part.id]!;

        let [, nextPartListeners] = partListeners;

        if (nextPartListeners === partListeners[0]) {
          nextPartListeners = partListeners[1] = nextPartListeners.slice(0);
        }

        if (add) {
          nextPartListeners.push(listener);
        } else {
          const index = nextPartListeners.indexOf(listener);

          if (index === 0 && nextPartListeners.length === 1) {
            delete partListenerMap[part.id];
          } else if (index !== -1) {
            nextPartListeners.splice(index, 1);
            partListeners[0] = null;
          }
        }
      }

      function updateStoreListeners(listener: Listener, add: boolean) {
        if (nextStoreListeners === storeListeners) {
          nextStoreListeners = storeListeners.slice(0);
        }

        if (add) {
          nextStoreListeners.push(listener);
        } else {
          nextStoreListeners.splice(nextStoreListeners.indexOf(listener), 1);
          storeListeners = null;
        }
      }

      return {
        ...store,
        dispatch,
        getState,
        getVersion,
        subscribe,
        subscribeToDispatch: originalSubscribe,
        subscribeToPart,
      };
    };
  } as Enhancer<Parts, DispatchableAction>;
}
