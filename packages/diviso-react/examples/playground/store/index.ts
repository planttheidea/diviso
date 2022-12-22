import createSagaMiddleware from 'redux-saga';
import { call, select, take } from 'redux-saga/effects';
import thunk from 'redux-thunk';
import {
  createStore,
  part,
  type AnyAction,
  type Middleware,
  type PartAction,
  type StoreState,
} from 'diviso';

import { storeParts, todosPart, type Todo } from './parts';

const legacy = (state = 'legacy', action: AnyAction) => {
  return action.type === 'LEGACY' ? 'modern' : state;
};

export type MyStore = typeof store;
export type State = StoreState<typeof storeParts, { legacy: string }>;

// const logging = true;
const logging = false;
const logger: Middleware<any, State> = () => (next) => (action) => {
  if (logging) {
    console.group(action);
    console.log('dispatching');
  }
  const result = next(action);
  if (logging) {
    console.log(result);
    console.log('finished');
    console.groupEnd();
  }
  return result;
};

const sagaMiddleware = createSagaMiddleware();

export const selectTodos = part([todosPart], (todos) => todos);

function* logTodos(action: PartAction<Todo[]>, before: Todo[]): Generator {
  console.log('-----------');
  yield call(console.log, 'before', before);
  yield call(console.log, 'action', action.value);
  yield call(console.log, 'state', yield select(selectTodos));
  console.log('-----------');
}

function* mySaga(): Generator {
  while (true) {
    const before = yield select(selectTodos);
    const action = yield take(todosPart);

    yield call(logTodos, action as PartAction<Todo[]>, before as Todo[]);
  }
}

function debounce<Fn extends (notify: () => void) => void>(fn: Fn, ms = 0): Fn {
  let id: ReturnType<typeof setTimeout> | null = null;

  return function (notify: () => void): void {
    if (id) {
      clearTimeout(id);
    }

    id = setTimeout(() => {
      fn(notify);
      id = null;
    }, ms);
  } as Fn;
}
const debouncedNotify = debounce((notify) => notify(), 0);

export const store = createStore({
  parts: storeParts,
  middleware: [sagaMiddleware, thunk, logger],
  notifier: debouncedNotify,
  otherReducer: { legacy },
});

sagaMiddleware.run(mySaga);
