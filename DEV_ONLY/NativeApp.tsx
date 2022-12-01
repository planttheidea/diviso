import React, { useCallback, useEffect } from 'react';
import { type SlicesState } from '../src';
import {
  Provider as SlicesProvider,
  useDispatch,
  useSlice,
  useSliceUpdate,
  useSliceValue,
} from '../src/react';
import {
  activateToggleAction,
  activeToggleSlice,
  conditionalUpdate,
  deactivateToggleAction,
  descriptionSlice,
  firstNameSlice,
  fullNameSelect,
  idSlice,
  lastNameSlice,
  parentSlice,
  titleSlice,
  todosSlice,
} from './store/slices';
import { storeSlices } from './store/slices';
import { nativeStore as store } from './store';

console.log(store);
// console.log(store.getState(fullNameSelect));

type State = SlicesState<typeof storeSlices>;

store.subscribe(() => {
  const state = store.getState();

  console.log('update', state);
});

function useAfterTimeout(fn: () => void, ms: number) {
  useEffect(() => {
    setTimeout(fn, ms);
  }, []);
}

function Description() {
  const description = useSliceValue(descriptionSlice);
  const updateDescription = useSliceUpdate(descriptionSlice);

  useAfterTimeout(() => updateDescription('better description'), 2000);

  console.count('description');

  return <div>Description: {description}</div>;
}

function Owner() {
  const owner = useSliceValue(parentSlice);

  console.count('owner');

  return (
    <div>
      <div>Owner title: {owner.title}</div>
      <div>Owner todos: {JSON.stringify(owner.todos)}</div>
    </div>
  );
}

function Title() {
  const title = useSliceValue(titleSlice);
  const [, setTitle] = useSlice(conditionalUpdate);

  useAfterTimeout(() => setTitle(12345), 1000);
  useAfterTimeout(() => setTitle('next title'), 5000);

  console.count('title');

  return <div>Title: {title}</div>;
}

function Todos() {
  const [todos, updateTodos] = useSlice(todosSlice);
  const [, resetTodos] = useSlice(null, (_getState, dispatch) =>
    dispatch(todosSlice.reset())
  );

  console.count('todos');

  useAfterTimeout(
    () => updateTodos(['foo'], { type: 'custom action type' }),
    1000
  );
  useAfterTimeout(
    () => updateTodos((exitingTodos) => [...exitingTodos, 'bar']),
    2000
  );
  useAfterTimeout(resetTodos, 3000);

  return <div>Todos: {JSON.stringify(todos)}</div>;
}

function Toggle() {
  const setActive = useSliceUpdate(activeToggleSlice);
  const toggleActive = useCallback(
    () => setActive((prevActive) => !prevActive),
    [setActive]
  );

  // const activate = useCallback(
  //   () => setActive(true, { type: 'ACTIVATE' }),
  //   [setActive]
  // );
  // const deactivate = useCallback(
  //   () => setActive(false, { type: 'DEACTIVATE' }),
  //   [setActive]
  // );
  const dispatch = useDispatch();
  const activate = useCallback(
    () => dispatch(activateToggleAction()),
    [dispatch]
  );
  const deactivate = useCallback(
    () => dispatch(deactivateToggleAction()),
    [dispatch]
  );

  console.count('toggle');

  return (
    <div>
      <button type="button" onClick={toggleActive}>
        Toggle active
      </button>
      <button type="button" onClick={activate}>
        Activate
      </button>
      <button type="button" onClick={deactivate}>
        Deactivate
      </button>
    </div>
  );
}

function Active() {
  const active = useSliceValue(activeToggleSlice);

  console.count('active');

  return <div>Active: {String(active)}</div>;
}

function UserId() {
  const id = useSliceValue(idSlice);
  const updateLastName = useSliceUpdate(lastNameSlice);

  useAfterTimeout(() => updateLastName(`O'Testerson`), 1500);

  console.count('user id');

  return <div>Id: {id}</div>;
}

function UserName() {
  const firstName = useSliceValue(firstNameSlice);
  const lastName = useSliceValue(lastNameSlice);

  console.count('user name');

  return (
    <div>
      Name: {firstName} {lastName}
    </div>
  );
}

function UserNameStoreSelector() {
  const fullName = useSliceValue(fullNameSelect);

  console.count('stored selector');

  return <div>Stored selector: {fullName}</div>;
}

function UserNameInlineSelector() {
  const [fullName] = useSlice(
    [firstNameSlice, lastNameSlice],
    (first, last) => [first, last]
  );

  console.count('inline selector');

  return <div>Inline selector: {fullName.join(' | ')}</div>;
}

function UseNameComposedSelector() {
  const user = useSliceValue([fullNameSelect, idSlice], (fullName, id) =>
    JSON.stringify({ fullName, id })
  );

  console.count('user composed');

  return <div>User composed: {user}</div>;
}

function User() {
  console.count('user');

  return (
    <div>
      <UserId />
      <UserName />
    </div>
  );
}

export default function App() {
  return (
    <SlicesProvider store={store}>
      <main>
        <h1>App</h1>

        <Active />
        <Toggle />

        <br />

        <User />
        <UserNameStoreSelector />
        <UserNameInlineSelector />
        <UseNameComposedSelector />

        <br />

        <Title />
        <Description />
        <Todos />

        <br />

        <Owner />

        <br />
      </main>
    </SlicesProvider>
  );
}
