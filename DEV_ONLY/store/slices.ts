import { createSlice } from '../../src';

export const todosSlice = createSlice('todos', {
  initialState: [] as string[],
});
export const titleSlice = createSlice('title', { initialState: 'Todos' });

export const conditionalUpdate = createSlice(
  null,
  (_getState, dispatch, nextTitle) => {
    if (typeof nextTitle !== 'string') {
      return console.error('Invalid title');
    }

    return dispatch(titleSlice.action(nextTitle));
  }
);
export const resetTodosUpdate = createSlice(null, (_getState, dispatch) =>
  dispatch(todosSlice.reset())
);

export const activeToggleSlice = createSlice('active', false);
export const deactivateToggleAction = () =>
  activeToggleSlice.action(false, { type: 'DEACTIVATE' });
export const activateToggleAction = () =>
  activeToggleSlice.action(true, { type: 'ACTIVATE' });

export const parentSlice = createSlice('parent', {
  slices: [todosSlice, titleSlice] as const,
});

export const firstNameSlice = createSlice('first', 'Testy');
export const lastNameSlice = createSlice('last', 'McTesterson');
export const nameSlice = createSlice('name', firstNameSlice, lastNameSlice);
export const fullNameSelect = createSlice(
  [firstNameSlice, lastNameSlice],
  (firstName, lastName) => `${firstName} ${lastName}`
);
export const idSlice = createSlice('id', {
  initialState: 'asdfsfdasfdsdsgafds',
});
export const userSlice = createSlice('user', {
  slices: [idSlice, nameSlice] as const,
});

export const descriptionSlice = createSlice('description', {
  initialState: 'Hello!',
});

export const storeSlices = [
  parentSlice,
  descriptionSlice,
  userSlice,
  activeToggleSlice,
] as const;
