import thunkMiddleware from 'redux-thunk';

function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce(
    (a, b) => (...args) => a(b(...args))
  );
}

function applyMiddleware(...middlewares) {
  return (createStore) => (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState);
    let dispatch = () => {
      throw new Error(
        "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch."
      );
    };
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action, ...args) => dispatch(
        action,
        ...args
      )
    };
    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);
    return {
      ...store,
      dispatch
    };
  };
}

const PRIMITIVE_PART = 1;
const COMPOSED_PART = 2;
const SELECT_PART = 4;
const UPDATE_PART = 8;
const PROXY_PART = 16;
const STATEFUL_PART = PRIMITIVE_PART | COMPOSED_PART;
const SELECTABLE_PART = STATEFUL_PART | SELECT_PART | PROXY_PART;
const PART = PRIMITIVE_PART | COMPOSED_PART | SELECT_PART | UPDATE_PART | PROXY_PART;

function isBoundProxyConfig(value) {
  return typeof value === "object" && value !== null && "get" in value && "set" in value && "parts" in value;
}
function isBoundSelectConfig(value) {
  return typeof value === "object" && value !== null && "get" in value && !("set" in value) && "parts" in value;
}
function isComposedConfig(value) {
  return typeof value === "object" && value !== null && "parts" in value;
}
function isDate(value) {
  if (value instanceof Date)
    return true;
  return typeof value.toDateString === "function" && typeof value.getDate === "function" && typeof value.setDate === "function";
}
function isError(value) {
  return value instanceof Error || typeof value.message === "string" && value.constructor && typeof value.constructor.stackTraceLimit === "number";
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(value) === proto;
}
function isPartAction(value) {
  return typeof value === "object" && value !== null && typeof value.$$part === "number";
}
function isPrimitiveConfig(value) {
  return typeof value === "object" && value !== null && "initialState" in value;
}
function isPromise(value) {
  return !!value && typeof value.then === "function";
}
function isProxyPart(value) {
  return !!(value && value.f & PROXY_PART);
}
function isReducersMap(value) {
  return typeof value === "object";
}
function isSelectPart(value) {
  return !!(value && value.f & SELECT_PART);
}
function isSelectablePart(value) {
  return !!(value && value.f & SELECTABLE_PART);
}
function isSelectablePartsList(value) {
  return Array.isArray(value) && isSelectablePart(value[0]);
}
function isSelector(value) {
  return typeof value === "function" && !(value.f & PART);
}
function isStatefulPart(value) {
  return !!(value && value.f & STATEFUL_PART);
}
function isStatefulPartsList(value) {
  return Array.isArray(value) && isStatefulPart(value[0]);
}
function isUnboundProxyConfig(value) {
  return typeof value === "object" && value !== null && "get" in value && "set" in value && !("parts" in value);
}
function isUnboundSelectConfig(value) {
  return typeof value === "object" && value !== null && "get" in value && !("set" in value) && !("parts" in value);
}
function isUpdateConfig(value) {
  return typeof value === "object" && value !== null && "set" in value && !("get" in value) && !("parts" in value);
}
function isUpdater(value) {
  return typeof value === "function" && !(value.f & PART);
}

function createInternalActionType(type) {
  const randomString = Math.random().toString(36).substring(7).split("").join(".");
  return `@@redux/${type}${randomString}`;
}
function getConstructorName(value) {
  return typeof value.constructor === "function" ? value.constructor.name : null;
}
let idCounter = 0;
function getId() {
  let id = ++idCounter;
  id = (id >> 16 ^ id) * 73244475;
  id = (id >> 16 ^ id) * 73244475;
  return id >> 16 ^ id;
}
function getStatefulPartMap(parts) {
  let partMap = {};
  parts.forEach((part) => {
    partMap[part.id] = part;
    if (part.c) {
      partMap = { ...partMap, ...getStatefulPartMap(part.c) };
    }
  });
  return partMap;
}
function identity(value) {
  return value;
}
const isFallback = function(x, y) {
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};
const is = Object.is || isFallback;
function kindOf(value) {
  if (value === void 0) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  const type = typeof value;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function":
    case "bigint": {
      return type;
    }
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (isDate(value)) {
    return "date";
  }
  if (isError(value)) {
    return "error";
  }
  const constructorName = getConstructorName(value);
  switch (constructorName) {
    case "Symbol":
    case "Promise":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase().replace(/\s/g, "");
}
function noop() {
}
function toScreamingSnakeCase(string) {
  return string.replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map((word) => word.toLowerCase()).join("_").toUpperCase();
}
function updateUniqueList(list, item) {
  if (!~list.indexOf(item)) {
    list.push(item);
  }
}

const $$observable = /* @__PURE__ */ (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
const INIT_ACTION_TYPE = createInternalActionType("INIT");
const REPLACE_ACTION_TYPE = createInternalActionType("REPLACE");

const composeWithDevTools = typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function() {
  if (arguments.length === 0) {
    return;
  }
  if (typeof arguments[0] === "object") {
    return compose;
  }
  return compose.apply(null, arguments);
};

function createGetState$1(originalGetState, getVersion) {
  function getState(part) {
    return part && isSelectablePart(part) ? part.g(getState, getVersion) : originalGetState();
  }
  return getState;
}
function createEnhancer({ notifier, partMap }) {
  return function enhancer(createStore) {
    return function enhance(reducer, preloadedState) {
      const partListenerMap = {};
      const batch = notifier || ((notify2) => notify2());
      const store = createStore(reducer, preloadedState);
      const originalDispatch = store.dispatch;
      const originalGetState = store.getState;
      const originalSubscribe = store.subscribe;
      let notifyPartsQueue = [];
      let storeListeners = [];
      let nextStoreListeners = storeListeners;
      let version = 0;
      function addPartsToNotify(partsToNotify, part) {
        let index = partsToNotify.indexOf(part.id);
        if (index === -1) {
          partsToNotify.push(part.id);
        } else {
          for (const maxIndex = partsToNotify.length - 1; index < maxIndex; ++index) {
            partsToNotify[index] = partsToNotify[index + 1];
          }
          partsToNotify[index] = part.id;
        }
        for (let index2 = 0; index2 < part.d.length; ++index2) {
          addPartsToNotify(partsToNotify, part.d[index2]);
        }
      }
      function dispatch(action) {
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
            queuePartsToNotify(part);
          }
          version++;
          notify();
        }
        return result;
      }
      const getState = createGetState$1(originalGetState, () => version);
      function getVersion() {
        return version;
      }
      function notify() {
        batch(notifyListeners);
      }
      function notifyListeners() {
        const listeners = storeListeners = nextStoreListeners;
        for (let index = 0; index < listeners.length; ++index) {
          listeners[index]();
        }
        const nextNotifyPartsQueue = notifyPartsQueue;
        notifyPartsQueue = [];
        const partsToNotify = [];
        for (let index = 0; index < nextNotifyPartsQueue.length; ++index) {
          addPartsToNotify(partsToNotify, nextNotifyPartsQueue[index]);
        }
        for (let index = 0; index < partsToNotify.length; ++index) {
          const partListeners = partListenerMap[partsToNotify[index]];
          if (!partListeners) {
            continue;
          }
          const listeners2 = partListeners[0] = partListeners[1];
          for (let index2 = 0; index2 < listeners2.length; ++index2) {
            listeners2[index2]();
          }
        }
      }
      function queuePartsToNotify(part) {
        const descendantParts = [];
        for (let index = 0; index < part.c.length; ++index) {
          queuePartsToNotify(part.c[index]);
        }
        updateUniqueList(notifyPartsQueue, part);
        return descendantParts;
      }
      function subscribe(listener) {
        if (typeof listener !== "function") {
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
      function subscribeToPart(part, listener) {
        if (typeof listener !== "function") {
          throw new Error(
            `Expected the listener to be a function; received '${typeof listener}'`
          );
        }
        if (!isSelectablePart(part)) {
          return noop;
        }
        if (!partListenerMap[part.id]) {
          const initialListeners = [];
          partListenerMap[part.id] = [initialListeners, initialListeners];
        }
        if (part.b === false) {
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
      function updatePartListeners(part, listener, add) {
        const partListeners = partListenerMap[part.id];
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
      function updateStoreListeners(listener, add) {
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
        subscribeToPart
      };
    };
  };
}

function combineOtherReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};
  reducerKeys.forEach((key) => {
    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  });
  const finalReducerKeys = Object.keys(finalReducers);
  const length = finalReducerKeys.length;
  return function reducer(state = {}, action) {
    const nextState = {};
    let hasChanged = false;
    for (let i = 0; i < length; i++) {
      const key = finalReducerKeys[i];
      const previousStateForKey = state[key];
      const nextStateForKey = finalReducers[key](previousStateForKey, action);
      if (typeof nextStateForKey === "undefined") {
        const actionType = action && action.type;
        throw new Error(
          `When called with an action of type ${actionType ? `"${String(actionType)}"` : "(unknown type)"}, the part reducer for key "${String(key)}" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.`
        );
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || !is(previousStateForKey, nextStateForKey);
    }
    return hasChanged ? nextState : state;
  };
}
function createReducer({
  otherReducer,
  partMap,
  parts
}) {
  const partsReducer = function partsReducer2(state, action) {
    const part = partMap[action.$$part];
    if (!part) {
      throw new ReferenceError(
        `Part with ID \`${action.$$part}\` was not provided to the partitioner for inclusion in state. Please add it to the list of parts provided to \`createPartitioner\`.`
      );
    }
    const owner = part.o;
    const prev = state[owner];
    const next = part.r(prev, action);
    return is(prev, next) ? state : { ...state, [owner]: next };
  };
  if (!otherReducer) {
    return function reducer(state = getInitialState(parts), action) {
      return isPartAction(action) ? partsReducer(state, action) : state;
    };
  }
  const additionalReducer = isReducersMap(otherReducer) ? combineOtherReducers(otherReducer) : otherReducer;
  if (typeof additionalReducer !== "function") {
    throw new ReferenceError(
      `\`otherReducer\` provided was expected to be a function or a map of reducers; received ${typeof otherReducer}`
    );
  }
  return function reducer(state, action) {
    if (state === void 0) {
      return {
        ...getInitialState(parts),
        ...additionalReducer(void 0, action)
      };
    }
    if (isPartAction(action)) {
      return partsReducer(state, action);
    }
    const nextOtherState = additionalReducer(
      state,
      action
    );
    return is(state, nextOtherState) ? state : { ...state, ...nextOtherState };
  };
}
function getInitialState(parts) {
  const initialState = {};
  for (let index = 0; index < parts.length; ++index) {
    const part = parts[index];
    initialState[part.n] = part.r(
      void 0,
      {}
    );
  }
  return initialState;
}

const IS_PRODUCTION = true;
function createGetState(originalGetState, getVersion) {
  function getState(part) {
    return part && isSelectablePart(part) ? part.g(getState, getVersion) : originalGetState();
  }
  return getState;
}
function createBaseStore(reducer, preloadedState) {
  let currentReducer = reducer;
  let currentState = preloadedState;
  let dispatching = false;
  let dispatchListeners = [];
  let nextDispatchListeners = dispatchListeners;
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        `Actions must be plain objects. Instead, the actual type was: '${kindOf(
          action
        )}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`
      );
    }
    if (typeof action.type === "undefined") {
      throw new Error(
        'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.'
      );
    }
    if (dispatching) {
      throw new Error("Reducers may not dispatch actions.");
    }
    try {
      dispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      dispatching = false;
    }
    const listeners = dispatchListeners = nextDispatchListeners;
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }
    return action;
  }
  function getState() {
    if (dispatching) {
      throw new Error(
        "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store."
      );
    }
    return currentState;
  }
  function observable() {
    const outerSubscribe = subscribe;
    return {
      subscribe(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new TypeError(
            `Expected the observer to be an object. Instead, received: '${kindOf(
              observer
            )}'`
          );
        }
        function observeState() {
          const observerAsObserver = observer;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }
        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return { unsubscribe };
      },
      [$$observable]() {
        return this;
      }
    };
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error(
        `Expected the nextReducer to be a function. Instead, received: '${kindOf(
          nextReducer
        )}`
      );
    }
    currentReducer = nextReducer;
    dispatch({ type: REPLACE_ACTION_TYPE });
    return store;
  }
  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error(
        `Expected the listener to be a function. Instead, received: '${kindOf(
          listener
        )}'`
      );
    }
    if (dispatching) {
      throw new Error(
        "You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details."
      );
    }
    let isSubscribed = true;
    updateDispatchListeners(listener, true);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (dispatching) {
        throw new Error(
          "You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details."
        );
      }
      isSubscribed = false;
      updateDispatchListeners(listener, false);
    };
  }
  function updateDispatchListeners(listener, add) {
    if (nextDispatchListeners === dispatchListeners) {
      nextDispatchListeners = dispatchListeners.slice(0);
    }
    if (add) {
      nextDispatchListeners.push(listener);
    } else {
      nextDispatchListeners.splice(nextDispatchListeners.indexOf(listener), 1);
      dispatchListeners = null;
    }
  }
  dispatch({ type: INIT_ACTION_TYPE });
  const store = {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  };
  return store;
}
function createStore(options) {
  const {
    devTools = true,
    enhancers,
    middleware = [thunkMiddleware],
    notifier = defaultNotifier,
    otherReducer,
    parts,
    preloadedState
  } = options || {};
  const partMap = getStatefulPartMap(parts);
  const partsEnhancer = createEnhancer({ notifier, partMap });
  const reducer = createReducer({ otherReducer, partMap, parts });
  const middlewareEnhancer = applyMiddleware(...middleware);
  const finalCompose = devTools ? composeWithDevTools({
    trace: !IS_PRODUCTION,
    ...typeof devTools === "object" && devTools
  }) : compose;
  let storeEnhancers = [middlewareEnhancer, partsEnhancer];
  if (Array.isArray(enhancers)) {
    storeEnhancers = [middlewareEnhancer, ...enhancers, partsEnhancer];
  } else if (typeof enhancers === "function") {
    storeEnhancers = enhancers(storeEnhancers);
  }
  const composedEnhancer = finalCompose(
    ...storeEnhancers
  );
  const createStore2 = composedEnhancer(createBaseStore);
  return createStore2(
    reducer,
    preloadedState
  );
}
function defaultNotifier(notify) {
  notify();
}

const CACHE = /* @__PURE__ */ new WeakMap();
function cachePromise(promise) {
  const entry = {
    c: () => {
      entry.s = "canceled";
    },
    e: null,
    p: new Promise((resolve, reject) => {
      promise.then(
        (result) => {
          if (entry.s === "canceled") {
            return resolve(void 0);
          }
          entry.e = null;
          entry.r = result;
          entry.s = "resolved";
          resolve(result);
        },
        (error) => {
          if (entry.s === "canceled") {
            return resolve(void 0);
          }
          entry.e = error;
          entry.r = void 0;
          entry.s = "rejected";
          reject(error);
        }
      );
    }),
    r: void 0,
    s: "pending"
  };
  CACHE.set(entry.p, entry);
  return entry.p;
}
function cancelPromise(promise) {
  const entry = isPromise(promise) && CACHE.get(promise);
  if (entry) {
    entry.c();
  }
}
function getCachedPromise(promise) {
  const cached = CACHE.get(promise);
  return cached ? cached.p : cachePromise(promise);
}

const NO_DEPENDENTS = Object.freeze([]);
function createBoundSelector(parts, get, isEqual) {
  const size = parts.length;
  let values;
  let result;
  let stateVersion;
  return function select(getState, getVersion) {
    const nextValues = [];
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
      nextValues[index] = parts[index].g(getState, getVersion);
      hasChanged = hasChanged || !is(values[index], nextValues[index]);
      hasPromise = hasPromise || isPromise(nextValues[index]);
    }
    values = nextValues;
    if (hasChanged) {
      cancelPromise(result);
      if (hasPromise) {
        const nextResult = Promise.all(
          nextValues
        ).then((resolvedValues) => get(...resolvedValues));
        result = getCachedPromise(nextResult);
      } else {
        let nextResult = get(...nextValues);
        if (isPromise(nextResult)) {
          nextResult = getCachedPromise(nextResult);
        }
        if (result === void 0 || !isEqual(result, nextResult)) {
          result = nextResult;
        }
      }
    }
    return result;
  };
}
function createComposedReducer(part2) {
  const { i: initialState, o: name, r: originalReducer } = part2;
  return function reduce(state = initialState, action) {
    const prevState = state[name];
    const nextState = originalReducer(prevState, action);
    return is(prevState, nextState) ? state : { ...state, [name]: nextState };
  };
}
function createStatefulGet(part2) {
  return function get(getState) {
    const path = part2.p;
    let state = getState();
    for (let index = 0, length = path.length; index < length; ++index) {
      state = state[path[index]];
    }
    return state;
  };
}
function createStateSelector(select) {
  return function selectFromState(state) {
    const getState = createGetState(() => state);
    return select(getState, void 0);
  };
}
function createStatefulReduce(part2) {
  return function reduce(state = part2.i, action) {
    return action.$$part === part2.id && !is(state, action.value) ? action.value : state;
  };
}
function createStatefulSet(part2) {
  return function set(dispatch, getState, update) {
    const nextValue = isFunctionalUpdate(update) ? update(getState(part2)) : update;
    return dispatch(part2(nextValue));
  };
}
function createUnboundSelector(get, isEqual) {
  let result;
  let stateVersion;
  return function select(getState, getVersion) {
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
      result = isPromise(nextResult) ? getCachedPromise(nextResult) : nextResult;
    }
    return result;
  };
}
function createUpdate(set) {
  return function update(...rest) {
    return (dispatch, getState) => set(dispatch, getState, ...rest);
  };
}
function getAllDescendantDependents(parts) {
  return parts.reduce((dependents, part2) => {
    part2.d.forEach((partDependent) => {
      if (isSelectPart(partDependent) || isProxyPart(partDependent)) {
        updateUniqueList(dependents, partDependent);
      }
    });
    if (isStatefulPart(part2)) {
      dependents.push(...getAllDescendantDependents(part2.c));
    }
    return dependents;
  }, []);
}
function getPrefixedType(path, type) {
  const prefix = path.length > 1 ? path.slice(0, path.length - 1).join(".") : path[0];
  const splitType = type.split("/");
  const baseType = splitType[splitType.length - 1];
  return `${prefix}/${baseType}`;
}
function isFunctionalUpdate(value) {
  return typeof value === "function";
}
function updateSelectableDependents(dependents, part2) {
  dependents.forEach((dependent) => {
    updateUniqueList(dependent.d, part2);
    dependent.d.forEach((descendant) => {
      if (isStatefulPart(descendant)) {
        updateUniqueList(descendant.d, part2);
      }
    });
  });
}
function updateStatefulDependents(dependents, part2, name) {
  dependents.forEach((dependent) => {
    const path = [name, ...dependent.p];
    const reducer = createComposedReducer(dependent);
    const type = getPrefixedType(path, dependent.t);
    dependent.o = name;
    dependent.p = path;
    dependent.r = reducer;
    dependent.t = type;
    updateUniqueList(dependent.d, part2);
    updateStatefulDependents(dependent.c, part2, name);
  });
}
function createComposedPart(config) {
  const { name, parts } = config;
  const initialState = parts.reduce((state, childPart) => {
    state[childPart.n] = childPart.i;
    return state;
  }, {});
  const part2 = function actionCreator(nextValue) {
    return {
      $$part: part2.id,
      type: part2.t,
      value: nextValue
    };
  };
  part2.id = getId();
  part2.toString = () => part2.t;
  part2.update = createPartUpdater(part2);
  part2.c = [...parts];
  part2.d = getAllDescendantDependents(parts);
  part2.f = COMPOSED_PART;
  part2.g = createStatefulGet(part2);
  part2.i = initialState;
  part2.n = name;
  part2.o = name;
  part2.p = [name];
  part2.r = createStatefulReduce(part2);
  part2.s = createStatefulSet(part2);
  part2.t = getPrefixedType([name], `UPDATE_${toScreamingSnakeCase(name)}`);
  updateStatefulDependents(parts, part2, name);
  return part2;
}
function createPrimitivePart(config) {
  const { initialState, name } = config;
  const part2 = function actionCreator(nextValue) {
    return {
      $$part: part2.id,
      type: part2.t,
      value: nextValue
    };
  };
  part2.id = getId();
  part2.toString = () => part2.t;
  part2.update = createPartUpdater(part2);
  part2.c = [];
  part2.d = [];
  part2.f = PRIMITIVE_PART;
  part2.g = createStatefulGet(part2);
  part2.i = initialState;
  part2.n = name;
  part2.o = name;
  part2.p = [name];
  part2.r = createStatefulReduce(part2);
  part2.s = createStatefulSet(part2);
  part2.t = getPrefixedType([name], `UPDATE_${toScreamingSnakeCase(name)}`);
  return part2;
}
function createBoundSelectPart(config) {
  const { get, isEqual = is, parts } = config;
  const select = createBoundSelector(parts, get, isEqual);
  const part2 = createStateSelector(select);
  part2.id = getId();
  part2.b = true;
  part2.d = [];
  part2.f = SELECT_PART;
  part2.g = select;
  part2.s = noop;
  updateSelectableDependents(parts, part2);
  return part2;
}
function createUnboundSelectPart(config) {
  const { get, isEqual = is } = config;
  const select = createUnboundSelector(get, isEqual);
  const part2 = createStateSelector(select);
  part2.id = getId();
  part2.b = false;
  part2.d = [];
  part2.f = SELECT_PART;
  part2.g = select;
  part2.s = noop;
  return part2;
}
function createBoundProxyPart(config) {
  const { get, isEqual = is, parts, set } = config;
  const select = createBoundSelector(parts, get, isEqual);
  const update = createUpdate(set);
  const part2 = {};
  part2.id = getId();
  part2.select = createStateSelector(select);
  part2.update = update;
  part2.b = true;
  part2.d = [];
  part2.f = PROXY_PART;
  part2.g = select;
  part2.s = set;
  updateSelectableDependents(parts, part2);
  return part2;
}
function createUnboundProxyPart(config) {
  const { get, isEqual = is, set } = config;
  const select = createUnboundSelector(get, isEqual);
  const update = createUpdate(set);
  const part2 = {};
  part2.id = getId();
  part2.select = createStateSelector(select);
  part2.update = update;
  part2.b = false;
  part2.d = [];
  part2.f = PROXY_PART;
  part2.g = select;
  part2.s = set;
  return part2;
}
function createUpdatePart(config) {
  const { set } = config;
  const part2 = createUpdate(set);
  part2.id = getId();
  part2.d = NO_DEPENDENTS;
  part2.f = UPDATE_PART;
  part2.g = noop;
  part2.s = set;
  return part2;
}
function createPartUpdater(part2) {
  return function partUpdater(baseType, getValue = identity) {
    let path = part2.p;
    let type = getPrefixedType(path, baseType);
    function getType() {
      if (part2.p !== path) {
        path = part2.p;
        type = getPrefixedType(path, baseType);
      }
      return type;
    }
    function set(dispatch, getState, ...rest) {
      const update = getValue(...rest);
      const nextValue = isFunctionalUpdate(update) ? update(getState(part2)) : update;
      return dispatch({
        ...part2(nextValue),
        type: getType()
      });
    }
    const updatePart = createUpdatePart({ set });
    updatePart.toString = () => type;
    return updatePart;
  };
}
function part(first, second, third) {
  if (first == null) {
    if (isUpdater(second)) {
      return createUpdatePart({ set: second });
    }
    throw new Error(
      `You provided a nullish first argument which would create an Update Part, but provided an invalid updater as the second argument. A function was expected; received ${typeof second}.`
    );
  }
  if (typeof first === "string") {
    if (isStatefulPartsList(second)) {
      return createComposedPart({
        name: first,
        parts: second
      });
    }
    return createPrimitivePart({
      name: first,
      initialState: second
    });
  }
  if (isSelectablePartsList(first)) {
    if (isSelector(second)) {
      return isUpdater(third) ? createBoundProxyPart({ get: second, parts: first, set: third }) : createBoundSelectPart({ get: second, parts: first });
    }
    throw new Error(
      `You provided a list of Parts as the first argument, which would create a Select Part, but provided an invalid selector as the second argument. A function was expected; received ${typeof second}.`
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
    return createUnboundSelectPart(first);
  }
  if (isComposedConfig(first)) {
    return createComposedPart(first);
  }
  if (isSelector(first)) {
    return isUpdater(second) ? createUnboundProxyPart({ get: first, set: second }) : createUnboundSelectPart({ get: first });
  }
  throw new Error(
    `The parameters passed are invalid for creating a Part; received [${Array.from(
      arguments,
      (parameter) => typeof parameter
    )}]`
  );
}

export { compose, createStore, part };
