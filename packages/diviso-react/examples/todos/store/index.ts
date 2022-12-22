import { type PartAction, createStore } from 'diviso';
import createSagaMiddleware from 'redux-saga';
import { call, select, take } from 'redux-saga/effects';
import { descriptionPart } from './description';
import { titlePart } from './title';
import { type Todo, selectTodos, todosPart } from './todos';

const sagaMiddleware = createSagaMiddleware();

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

export const store = createStore({
  parts: [descriptionPart, titlePart, todosPart] as const,
  middleware: [sagaMiddleware],
});

sagaMiddleware.run(mySaga);
