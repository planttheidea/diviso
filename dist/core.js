'use strict';

var thunkMiddleware = require('redux-thunk');

function compose() {
  for (var _len = arguments.length, funcs = new Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }
  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce(function (a, b) {
    return function () {
      return a(b.apply(void 0, arguments));
    };
  });
}

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

function applyMiddleware() {
  for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }
  return function (createStore) {
    return function (reducer, preloadedState) {
      var store = createStore(reducer, preloadedState);
      var _dispatch = function dispatch() {
        throw new Error('Dispatching while constructing your middleware is not allowed. ' + 'Other middleware would not be applied to this dispatch.');
      };
      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch(action) {
          for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
          }
          return _dispatch.apply(void 0, [action].concat(args));
        }
      };
      var chain = middlewares.map(function (middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = compose.apply(void 0, chain)(store.dispatch);
      return _extends({}, store, {
        dispatch: _dispatch
      });
    };
  };
}

var PRIMITIVE_PART = 0x1;
var COMPOSED_PART = 0x2;
var SELECT_PART = 0x4;
var UPDATE_PART = 0x8;
var PROXY_PART = 0x10;
var STATEFUL_PART = PRIMITIVE_PART | COMPOSED_PART;
var SELECTABLE_PART = STATEFUL_PART | SELECT_PART | PROXY_PART;
var PART = PRIMITIVE_PART | COMPOSED_PART | SELECT_PART | UPDATE_PART | PROXY_PART;

function isBoundProxyConfig(value) {
  return typeof value === 'object' && value !== null && 'get' in value && 'set' in value && 'parts' in value;
}
function isBoundSelectConfig(value) {
  return typeof value === 'object' && value !== null && 'get' in value && !('set' in value) && 'parts' in value;
}
function isComposedConfig(value) {
  return typeof value === 'object' && value !== null && 'parts' in value;
}
function isDate(value) {
  if (value instanceof Date) return true;
  return typeof value.toDateString === 'function' && typeof value.getDate === 'function' && typeof value.setDate === 'function';
}
function isError(value) {
  return value instanceof Error || typeof value.message === 'string' && value.constructor && typeof value.constructor.stackTraceLimit === 'number';
}
function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  var proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(value) === proto;
}
function isPartAction(value) {
  return typeof value === 'object' && value !== null && typeof value.$$part === 'number';
}
function isPrimitiveConfig(value) {
  return typeof value === 'object' && value !== null && 'initialState' in value;
}
function isPromise(value) {
  return !!value && typeof value.then === 'function';
}
function isProxyPart(value) {
  return !!(value && value.f & PROXY_PART);
}
function isReducersMap(value) {
  return typeof value === 'object';
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
  return typeof value === 'function' && !(value.f & PART);
}
function isStatefulPart(value) {
  return !!(value && value.f & STATEFUL_PART);
}
function isStatefulPartsList(value) {
  return Array.isArray(value) && isStatefulPart(value[0]);
}
function isUnboundProxyConfig(value) {
  return typeof value === 'object' && value !== null && 'get' in value && 'set' in value && !('parts' in value);
}
function isUnboundSelectConfig(value) {
  return typeof value === 'object' && value !== null && 'get' in value && !('set' in value) && !('parts' in value);
}
function isUpdateConfig(value) {
  return typeof value === 'object' && value !== null && 'set' in value && !('get' in value) && !('parts' in value);
}
function isUpdater(value) {
  return typeof value === 'function' && !(value.f & PART);
}

function createInternalActionType(type) {
  var randomString = Math.random().toString(36).substring(7).split('').join('.');
  return "@@redux/" + type + randomString;
}
function getConstructorName(value) {
  return typeof value.constructor === 'function' ? value.constructor.name : null;
}
var idCounter = 0;
function getId() {
  var id = ++idCounter;
  id = (id >> 16 ^ id) * 0x45d9f3b;
  id = (id >> 16 ^ id) * 0x45d9f3b;
  return id >> 16 ^ id;
}
function getStatefulPartMap(parts) {
  var partMap = {};
  parts.forEach(function (part) {
    partMap[part.id] = part;
    if (part.c) {
      partMap = _extends({}, partMap, getStatefulPartMap(part.c));
    }
  });
  return partMap;
}
function identity(value) {
  return value;
}
var isFallback = function isFallback(x, y) {
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};
var is = Object.is || isFallback;
function kindOf(value) {
  if (value === void 0) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  var type = typeof value;
  switch (type) {
    case 'boolean':
    case 'string':
    case 'number':
    case 'symbol':
    case 'function':
    case 'bigint':
      {
        return type;
      }
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (isDate(value)) {
    return 'date';
  }
  if (isError(value)) {
    return 'error';
  }
  var constructorName = getConstructorName(value);
  switch (constructorName) {
    case 'Symbol':
    case 'Promise':
    case 'WeakMap':
    case 'WeakSet':
    case 'Map':
    case 'Set':
      return constructorName;
  }
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase().replace(/\s/g, '');
}
function noop() {}
function toScreamingSnakeCase(string) {
  return string.replace(/\W+/g, ' ').split(/ |\B(?=[A-Z])/).map(function (word) {
    return word.toLowerCase();
  }).join('_').toUpperCase();
}
function updateUniqueList(list, item) {
  if (!~list.indexOf(item)) {
    list.push(item);
  }
}

var $$observable = function () {
  return typeof Symbol === 'function' && Symbol.observable || '@@observable';
}();
var INIT_ACTION_TYPE = createInternalActionType('INIT');
var REPLACE_ACTION_TYPE = createInternalActionType('REPLACE');

var composeWithDevTools = typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function () {
  if (arguments.length === 0) {
    return;
  }
  if (typeof arguments[0] === 'object') {
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
function createEnhancer(_ref) {
  var notifier = _ref.notifier,
    partMap = _ref.partMap;
  return function enhancer(createStore) {
    return function enhance(reducer, preloadedState) {
      var partListenerMap = {};
      var batch = notifier || function (notify) {
        return notify();
      };
      var store = createStore(reducer, preloadedState);
      var originalDispatch = store.dispatch;
      var originalGetState = store.getState;
      var originalSubscribe = store.subscribe;
      var notifyPartsQueue = [];
      var storeListeners = [];
      var nextStoreListeners = storeListeners;
      var version = 0;
      function addPartsToNotify(partsToNotify, part) {
        var index = partsToNotify.indexOf(part.id);
        if (index === -1) {
          partsToNotify.push(part.id);
        } else {
          for (var maxIndex = partsToNotify.length - 1; index < maxIndex; ++index) {
            partsToNotify[index] = partsToNotify[index + 1];
          }
          partsToNotify[index] = part.id;
        }
        for (var _index = 0; _index < part.d.length; ++_index) {
          addPartsToNotify(partsToNotify, part.d[_index]);
        }
      }
      function dispatch(action) {
        var prev = originalGetState();
        var result = originalDispatch(action);
        var next = originalGetState();
        if (prev !== next) {
          if (isPartAction(action)) {
            var id = action.$$part;
            var part = partMap[id];
            if (!part) {
              throw new Error("Part with id " + id + " not found. Is it included in this store?");
            }
            queuePartsToNotify(part);
          }
          version++;
          notify();
        }
        return result;
      }
      var getState = createGetState$1(originalGetState, function () {
        return version;
      });
      function getVersion() {
        return version;
      }
      function notify() {
        batch(notifyListeners);
      }
      function notifyListeners() {
        var listeners = storeListeners = nextStoreListeners;
        for (var index = 0; index < listeners.length; ++index) {
          listeners[index]();
        }
        var nextNotifyPartsQueue = notifyPartsQueue;
        notifyPartsQueue = [];
        var partsToNotify = [];
        for (var _index2 = 0; _index2 < nextNotifyPartsQueue.length; ++_index2) {
          addPartsToNotify(partsToNotify, nextNotifyPartsQueue[_index2]);
        }
        for (var _index3 = 0; _index3 < partsToNotify.length; ++_index3) {
          var partListeners = partListenerMap[partsToNotify[_index3]];
          if (!partListeners) {
            continue;
          }
          var _listeners = partListeners[0] = partListeners[1];
          for (var _index4 = 0; _index4 < _listeners.length; ++_index4) {
            _listeners[_index4]();
          }
        }
      }
      function queuePartsToNotify(part) {
        var descendantParts = [];
        for (var index = 0; index < part.c.length; ++index) {
          queuePartsToNotify(part.c[index]);
        }
        updateUniqueList(notifyPartsQueue, part);
        return descendantParts;
      }
      function subscribe(listener) {
        if (typeof listener !== 'function') {
          throw new Error("Expected the listener to be a function; received '" + typeof listener + "'");
        }
        var subscribed = true;
        updateStoreListeners(listener, true);
        return function () {
          if (!subscribed) {
            return;
          }
          subscribed = false;
          updateStoreListeners(listener, false);
        };
      }
      function subscribeToPart(part, listener) {
        if (typeof listener !== 'function') {
          throw new Error("Expected the listener to be a function; received '" + typeof listener + "'");
        }
        if (!isSelectablePart(part)) {
          return noop;
        }
        if (!partListenerMap[part.id]) {
          var initialListeners = [];
          partListenerMap[part.id] = [initialListeners, initialListeners];
        }
        if (part.b === false) {
          subscribe(listener);
        }
        var subscribed = true;
        updatePartListeners(part, listener, true);
        return function () {
          if (!subscribed) {
            return;
          }
          subscribed = false;
          updatePartListeners(part, listener, false);
        };
      }
      function updatePartListeners(part, listener, add) {
        var partListeners = partListenerMap[part.id];
        var nextPartListeners = partListeners[1];
        if (nextPartListeners === partListeners[0]) {
          nextPartListeners = partListeners[1] = nextPartListeners.slice(0);
        }
        if (add) {
          nextPartListeners.push(listener);
        } else {
          var index = nextPartListeners.indexOf(listener);
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
      return _extends({}, store, {
        dispatch: dispatch,
        getState: getState,
        getVersion: getVersion,
        subscribe: subscribe,
        subscribeToDispatch: originalSubscribe,
        subscribeToPart: subscribeToPart
      });
    };
  };
}

function combineOtherReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};
  reducerKeys.forEach(function (key) {
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  });
  var finalReducerKeys = Object.keys(finalReducers);
  var length = finalReducerKeys.length;
  return function reducer(state, action) {
    if (state === void 0) {
      state = {};
    }
    var nextState = {};
    var hasChanged = false;
    for (var i = 0; i < length; i++) {
      var key = finalReducerKeys[i];
      var previousStateForKey = state[key];
      var nextStateForKey = finalReducers[key](previousStateForKey, action);
      if (typeof nextStateForKey === 'undefined') {
        var actionType = action && action.type;
        throw new Error("When called with an action of type " + (actionType ? "\"" + String(actionType) + "\"" : '(unknown type)') + ", the part reducer for key \"" + String(key) + "\" returned undefined. " + "To ignore an action, you must explicitly return the previous state. " + "If you want this reducer to hold no value, you can return null instead of undefined.");
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || !is(previousStateForKey, nextStateForKey);
    }
    return hasChanged ? nextState : state;
  };
}
function createReducer(_ref) {
  var otherReducer = _ref.otherReducer,
    partMap = _ref.partMap,
    parts = _ref.parts;
  var partsReducer = function partsReducer(state, action) {
    var _extends2;
    var part = partMap[action.$$part];
    if (!part) {
      throw new ReferenceError("Part with ID `" + action.$$part + "` was not provided to the partitioner for inclusion in state. " + 'Please add it to the list of parts provided to `createPartitioner`.');
    }
    var owner = part.o;
    var prev = state[owner];
    var next = part.r(prev, action);
    return is(prev, next) ? state : _extends({}, state, (_extends2 = {}, _extends2[owner] = next, _extends2));
  };
  if (!otherReducer) {
    return function reducer(state, action) {
      if (state === void 0) {
        state = getInitialState(parts);
      }
      return isPartAction(action) ? partsReducer(state, action) : state;
    };
  }
  var additionalReducer = isReducersMap(otherReducer) ? combineOtherReducers(otherReducer) : otherReducer;
  if (typeof additionalReducer !== 'function') {
    throw new ReferenceError("`otherReducer` provided was expected to be a function or a map of reducers; received " + typeof otherReducer);
  }
  return function reducer(state, action) {
    if (state === undefined) {
      return _extends({}, getInitialState(parts), additionalReducer(undefined, action));
    }
    if (isPartAction(action)) {
      return partsReducer(state, action);
    }
    var nextOtherState = additionalReducer(state, action);
    return is(state, nextOtherState) ? state : _extends({}, state, nextOtherState);
  };
}
function getInitialState(parts) {
  var initialState = {};
  for (var index = 0; index < parts.length; ++index) {
    var part = parts[index];
    initialState[part.n] = part.r(undefined, {});
  }
  return initialState;
}

var IS_PRODUCTION = "production" === 'production';
function createGetState(originalGetState, getVersion) {
  function getState(part) {
    return part && isSelectablePart(part) ? part.g(getState, getVersion) : originalGetState();
  }
  return getState;
}
function createBaseStore(reducer, preloadedState) {
  var _store;
  var currentReducer = reducer;
  var currentState = preloadedState;
  var dispatching = false;
  var dispatchListeners = [];
  var nextDispatchListeners = dispatchListeners;
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error("Actions must be plain objects. Instead, the actual type was: '" + kindOf(action) + "'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.");
    }
    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
    }
    if (dispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }
    try {
      dispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      dispatching = false;
    }
    var listeners = dispatchListeners = nextDispatchListeners;
    for (var i = 0; i < listeners.length; i++) {
      var _listener = listeners[i];
      _listener();
    }
    return action;
  }
  function getState() {
    if (dispatching) {
      throw new Error('You may not call store.getState() while the reducer is executing. ' + 'The reducer has already received the state as an argument. ' + 'Pass it down from the top reducer instead of reading it from the store.');
    }
    return currentState;
  }
  function observable() {
    var _ref;
    var outerSubscribe = subscribe;
    return _ref = {
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError("Expected the observer to be an object. Instead, received: '" + kindOf(observer) + "'");
        }
        function observeState() {
          var observerAsObserver = observer;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }
        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe: unsubscribe
        };
      }
    }, _ref[$$observable] = function () {
      return this;
    }, _ref;
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error("Expected the nextReducer to be a function. Instead, received: '" + kindOf(nextReducer));
    }
    currentReducer = nextReducer;
    dispatch({
      type: REPLACE_ACTION_TYPE
    });
    return store;
  }
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error("Expected the listener to be a function. Instead, received: '" + kindOf(listener) + "'");
    }
    if (dispatching) {
      throw new Error('You may not call store.subscribe() while the reducer is executing. ' + 'If you would like to be notified after the store has been updated, subscribe from a ' + 'component and invoke store.getState() in the callback to access the latest state. ' + 'See https://redux.js.org/api/store#subscribelistener for more details.');
    }
    var isSubscribed = true;
    updateDispatchListeners(listener, true);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (dispatching) {
        throw new Error('You may not unsubscribe from a store listener while the reducer is executing. ' + 'See https://redux.js.org/api/store#subscribelistener for more details.');
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
  dispatch({
    type: INIT_ACTION_TYPE
  });
  var store = (_store = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _store[$$observable] = observable, _store);
  return store;
}
function createStore(options) {
  var _ref2 = options || {},
    _ref2$devTools = _ref2.devTools,
    devTools = _ref2$devTools === void 0 ? true : _ref2$devTools,
    enhancers = _ref2.enhancers,
    _ref2$middleware = _ref2.middleware,
    middleware = _ref2$middleware === void 0 ? [thunkMiddleware] : _ref2$middleware,
    _ref2$notifier = _ref2.notifier,
    notifier = _ref2$notifier === void 0 ? defaultNotifier : _ref2$notifier,
    otherReducer = _ref2.otherReducer,
    parts = _ref2.parts,
    preloadedState = _ref2.preloadedState;
  var partMap = getStatefulPartMap(parts);
  var partsEnhancer = createEnhancer({
    notifier: notifier,
    partMap: partMap
  });
  var reducer = createReducer({
    otherReducer: otherReducer,
    partMap: partMap,
    parts: parts
  });
  var middlewareEnhancer = applyMiddleware.apply(void 0, middleware);
  var finalCompose = devTools ? composeWithDevTools(_extends({
    trace: !IS_PRODUCTION
  }, typeof devTools === 'object' && devTools)) : compose;
  var storeEnhancers = [middlewareEnhancer, partsEnhancer];
  if (Array.isArray(enhancers)) {
    storeEnhancers = [middlewareEnhancer].concat(enhancers, [partsEnhancer]);
  } else if (typeof enhancers === 'function') {
    storeEnhancers = enhancers(storeEnhancers);
  }
  var composedEnhancer = finalCompose.apply(void 0, storeEnhancers);
  var createStore = composedEnhancer(createBaseStore);
  return createStore(reducer, preloadedState);
}
function defaultNotifier(notify) {
  notify();
}

var CACHE = new WeakMap();
function cachePromise(promise) {
  var entry = {
    c: function c() {
      entry.s = 'canceled';
    },
    e: null,
    p: new Promise(function (resolve, reject) {
      promise.then(function (result) {
        if (entry.s === 'canceled') {
          return resolve(undefined);
        }
        entry.e = null;
        entry.r = result;
        entry.s = 'resolved';
        resolve(result);
      }, function (error) {
        if (entry.s === 'canceled') {
          return resolve(undefined);
        }
        entry.e = error;
        entry.r = undefined;
        entry.s = 'rejected';
        reject(error);
      });
    }),
    r: undefined,
    s: 'pending'
  };
  CACHE.set(entry.p, entry);
  return entry.p;
}
function cancelPromise(promise) {
  var entry = isPromise(promise) && CACHE.get(promise);
  if (entry) {
    entry.c();
  }
}
function getCachedPromise(promise) {
  var cached = CACHE.get(promise);
  return cached ? cached.p : cachePromise(promise);
}

var NO_DEPENDENTS = Object.freeze([]);
function createBoundSelector(parts, get, isEqual) {
  var size = parts.length;
  var values;
  var result;
  var stateVersion;
  return function select(getState, getVersion) {
    var nextValues = [];
    var hasPromise = false;
    if (getVersion) {
      var nextVersion = getVersion();
      if (nextVersion === stateVersion) {
        return result;
      }
      stateVersion = nextVersion;
    }
    var hasChanged = !values;
    for (var index = 0; index < size; ++index) {
      nextValues[index] = parts[index].g(getState, getVersion);
      hasChanged = hasChanged || !is(values[index], nextValues[index]);
      hasPromise = hasPromise || isPromise(nextValues[index]);
    }
    values = nextValues;
    if (hasChanged) {
      cancelPromise(result);
      if (hasPromise) {
        var nextResult = Promise.all(nextValues).then(function (resolvedValues) {
          return get.apply(void 0, resolvedValues);
        });
        result = getCachedPromise(nextResult);
      } else {
        var _nextResult = get.apply(void 0, nextValues);
        if (isPromise(_nextResult)) {
          _nextResult = getCachedPromise(_nextResult);
        }
        if (result === undefined || !isEqual(result, _nextResult)) {
          result = _nextResult;
        }
      }
    }
    return result;
  };
}
function createComposedReducer(part) {
  var initialState = part.i,
    name = part.o,
    originalReducer = part.r;
  return function reduce(state, action) {
    var _extends2;
    if (state === void 0) {
      state = initialState;
    }
    var prevState = state[name];
    var nextState = originalReducer(prevState, action);
    return is(prevState, nextState) ? state : _extends({}, state, (_extends2 = {}, _extends2[name] = nextState, _extends2));
  };
}
function createStatefulGet(part) {
  return function get(getState) {
    var path = part.p;
    var state = getState();
    for (var index = 0, length = path.length; index < length; ++index) {
      state = state[path[index]];
    }
    return state;
  };
}
function createStateSelector(select) {
  return function selectFromState(state) {
    var getState = createGetState(function () {
      return state;
    });
    return select(getState, undefined);
  };
}
function createStatefulReduce(part) {
  return function reduce(state, action) {
    if (state === void 0) {
      state = part.i;
    }
    return action.$$part === part.id && !is(state, action.value) ? action.value : state;
  };
}
function createStatefulSet(part) {
  return function set(dispatch, getState, update) {
    var nextValue = isFunctionalUpdate(update) ? update(getState(part)) : update;
    return dispatch(part(nextValue));
  };
}
function createUnboundSelector(get, isEqual) {
  var result;
  var stateVersion;
  return function select(getState, getVersion) {
    if (getVersion) {
      var nextVersion = getVersion();
      if (nextVersion === stateVersion) {
        return result;
      }
      stateVersion = nextVersion;
    }
    var nextResult = get(getState);
    if (!isEqual(result, nextResult)) {
      cancelPromise(result);
      result = isPromise(nextResult) ? getCachedPromise(nextResult) : nextResult;
    }
    return result;
  };
}
function createUpdate(set) {
  return function update() {
    for (var _len = arguments.length, rest = new Array(_len), _key = 0; _key < _len; _key++) {
      rest[_key] = arguments[_key];
    }
    return function (dispatch, getState) {
      return set.apply(void 0, [dispatch, getState].concat(rest));
    };
  };
}
function getAllDescendantDependents(parts) {
  return parts.reduce(function (dependents, part) {
    part.d.forEach(function (partDependent) {
      if (isSelectPart(partDependent) || isProxyPart(partDependent)) {
        updateUniqueList(dependents, partDependent);
      }
    });
    if (isStatefulPart(part)) {
      dependents.push.apply(dependents, getAllDescendantDependents(part.c));
    }
    return dependents;
  }, []);
}
function getPrefixedType(path, type) {
  var prefix = path.length > 1 ? path.slice(0, path.length - 1).join('.') : path[0];
  var splitType = type.split('/');
  var baseType = splitType[splitType.length - 1];
  return prefix + "/" + baseType;
}
function isFunctionalUpdate(value) {
  return typeof value === 'function';
}
function updateSelectableDependents(dependents, part) {
  dependents.forEach(function (dependent) {
    updateUniqueList(dependent.d, part);
    dependent.d.forEach(function (descendant) {
      if (isStatefulPart(descendant)) {
        updateUniqueList(descendant.d, part);
      }
    });
  });
}
function updateStatefulDependents(dependents, part, name) {
  dependents.forEach(function (dependent) {
    var path = [name].concat(dependent.p);
    var reducer = createComposedReducer(dependent);
    var type = getPrefixedType(path, dependent.t);
    dependent.o = name;
    dependent.p = path;
    dependent.r = reducer;
    dependent.t = type;
    updateUniqueList(dependent.d, part);
    updateStatefulDependents(dependent.c, part, name);
  });
}
function createComposedPart(config) {
  var name = config.name,
    parts = config.parts;
  var initialState = parts.reduce(function (state, childPart) {
    state[childPart.n] = childPart.i;
    return state;
  }, {});
  var part = function actionCreator(nextValue) {
    return {
      $$part: part.id,
      type: part.t,
      value: nextValue
    };
  };
  part.id = getId();
  part.toString = function () {
    return part.t;
  };
  part.update = createPartUpdater(part);
  part.c = [].concat(parts);
  part.d = getAllDescendantDependents(parts);
  part.f = COMPOSED_PART;
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = createStatefulReduce(part);
  part.s = createStatefulSet(part);
  part.t = getPrefixedType([name], "UPDATE_" + toScreamingSnakeCase(name));
  updateStatefulDependents(parts, part, name);
  return part;
}
function createPrimitivePart(config) {
  var initialState = config.initialState,
    name = config.name;
  var part = function actionCreator(nextValue) {
    return {
      $$part: part.id,
      type: part.t,
      value: nextValue
    };
  };
  part.id = getId();
  part.toString = function () {
    return part.t;
  };
  part.update = createPartUpdater(part);
  part.c = [];
  part.d = [];
  part.f = PRIMITIVE_PART;
  part.g = createStatefulGet(part);
  part.i = initialState;
  part.n = name;
  part.o = name;
  part.p = [name];
  part.r = createStatefulReduce(part);
  part.s = createStatefulSet(part);
  part.t = getPrefixedType([name], "UPDATE_" + toScreamingSnakeCase(name));
  return part;
}
function createBoundSelectPart(config) {
  var get = config.get,
    _config$isEqual = config.isEqual,
    isEqual = _config$isEqual === void 0 ? is : _config$isEqual,
    parts = config.parts;
  var select = createBoundSelector(parts, get, isEqual);
  var part = createStateSelector(select);
  part.id = getId();
  part.b = true;
  part.d = [];
  part.f = SELECT_PART;
  part.g = select;
  part.s = noop;
  updateSelectableDependents(parts, part);
  return part;
}
function createUnboundSelectPart(config) {
  var get = config.get,
    _config$isEqual2 = config.isEqual,
    isEqual = _config$isEqual2 === void 0 ? is : _config$isEqual2;
  var select = createUnboundSelector(get, isEqual);
  var part = createStateSelector(select);
  part.id = getId();
  part.b = false;
  part.d = [];
  part.f = SELECT_PART;
  part.g = select;
  part.s = noop;
  return part;
}
function createBoundProxyPart(config) {
  var get = config.get,
    _config$isEqual3 = config.isEqual,
    isEqual = _config$isEqual3 === void 0 ? is : _config$isEqual3,
    parts = config.parts,
    set = config.set;
  var select = createBoundSelector(parts, get, isEqual);
  var update = createUpdate(set);
  var part = {};
  part.id = getId();
  part.select = createStateSelector(select);
  part.update = update;
  part.b = true;
  part.d = [];
  part.f = PROXY_PART;
  part.g = select;
  part.s = set;
  updateSelectableDependents(parts, part);
  return part;
}
function createUnboundProxyPart(config) {
  var get = config.get,
    _config$isEqual4 = config.isEqual,
    isEqual = _config$isEqual4 === void 0 ? is : _config$isEqual4,
    set = config.set;
  var select = createUnboundSelector(get, isEqual);
  var update = createUpdate(set);
  var part = {};
  part.id = getId();
  part.select = createStateSelector(select);
  part.update = update;
  part.b = false;
  part.d = [];
  part.f = PROXY_PART;
  part.g = select;
  part.s = set;
  return part;
}
function createUpdatePart(config) {
  var set = config.set;
  var part = createUpdate(set);
  part.id = getId();
  part.d = NO_DEPENDENTS;
  part.f = UPDATE_PART;
  part.g = noop;
  part.s = set;
  return part;
}
function createPartUpdater(part) {
  return function partUpdater(baseType, getValue) {
    if (getValue === void 0) {
      getValue = identity;
    }
    var path = part.p;
    var type = getPrefixedType(path, baseType);
    function getType() {
      if (part.p !== path) {
        path = part.p;
        type = getPrefixedType(path, baseType);
      }
      return type;
    }
    function set(dispatch, getState) {
      for (var _len2 = arguments.length, rest = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        rest[_key2 - 2] = arguments[_key2];
      }
      var update = getValue.apply(void 0, rest);
      var nextValue = isFunctionalUpdate(update) ? update(getState(part)) : update;
      return dispatch(_extends({}, part(nextValue), {
        type: getType()
      }));
    }
    var updatePart = createUpdatePart({
      set: set
    });
    updatePart.toString = function () {
      return type;
    };
    return updatePart;
  };
}
function part(first, second, third) {
  if (first == null) {
    if (isUpdater(second)) {
      return createUpdatePart({
        set: second
      });
    }
    throw new Error('You provided a nullish first argument which would create an Update Part, but provided an invalid updater ' + ("as the second argument. A function was expected; received " + typeof second + "."));
  }
  if (typeof first === 'string') {
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
      return isUpdater(third) ? createBoundProxyPart({
        get: second,
        parts: first,
        set: third
      }) : createBoundSelectPart({
        get: second,
        parts: first
      });
    }
    throw new Error('You provided a list of Parts as the first argument, which would create a Select Part, but provided ' + ("an invalid selector as the second argument. A function was expected; received " + typeof second + "."));
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
    return isUpdater(second) ? createUnboundProxyPart({
      get: first,
      set: second
    }) : createUnboundSelectPart({
      get: first
    });
  }
  throw new Error("The parameters passed are invalid for creating a Part; received [" + Array.from(arguments, function (parameter) {
    return typeof parameter;
  }) + "]");
}

exports.compose = compose;
exports.createStore = createStore;
exports.part = part;
