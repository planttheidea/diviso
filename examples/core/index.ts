import './styles.css';

import { createStore, part } from '../../src/core';

const primitivePart = part('primitive', 'value');
const composedPart = part('composed', [primitivePart]);

const store = createStore({ parts: [composedPart] as const });

console.log('primitive', store.getState(primitivePart));
console.log('composed', store.getState(composedPart));
console.log('state', store.getState());

console.log(store);

store.subscribe(() => {
  console.log('store changed', store.getState());
});

store.subscribeToDispatch(() => {
  console.log('dispatched', store.getState());
});

store.subscribeToPart(primitivePart, () => {
  console.log('updated primitive', store.getState(primitivePart));
});

store.dispatch(primitivePart('next value'));

console.log('primitive', store.getState(primitivePart));
console.log('composed', store.getState(composedPart));
console.log('state', store.getState());
