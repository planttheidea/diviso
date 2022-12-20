import type { Dispatch, Middleware, StoreEnhancer } from './store.mjs';
/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param middlewares The middleware chain to be applied.
 * @returns A store enhancer applying the middleware.
 *
 * @template Dispatch Dispatch signature added by a middleware.
 * @template State The type of the state supported by a middleware.
 */
export declare function applyMiddleware(): StoreEnhancer;
export declare function applyMiddleware<Dispatch1 extends Dispatch, State>(middleware1: Middleware<Dispatch1, State>): StoreEnhancer<{
    dispatch: Dispatch1;
}>;
export declare function applyMiddleware<Dispatch1 extends Dispatch, Dispatch2 extends Dispatch, State>(middleware1: Middleware<Dispatch1, State>, middleware2: Middleware<Dispatch2, State>): StoreEnhancer<{
    dispatch: Dispatch1 & Dispatch2;
}>;
export declare function applyMiddleware<Dispatch1 extends Dispatch, Dispatch2 extends Dispatch, Dispatch3 extends Dispatch, State>(middleware1: Middleware<Dispatch1, State>, middleware2: Middleware<Dispatch2, State>, middleware3: Middleware<Dispatch3, State>): StoreEnhancer<{
    dispatch: Dispatch1 & Dispatch2 & Dispatch3;
}>;
export declare function applyMiddleware<Dispatch1 extends Dispatch, Dispatch2 extends Dispatch, Dispatch3 extends Dispatch, Dispatch4 extends Dispatch, State>(middleware1: Middleware<Dispatch1, State>, middleware2: Middleware<Dispatch2, State>, middleware3: Middleware<Dispatch3, State>, middleware4: Middleware<Dispatch4, State>): StoreEnhancer<{
    dispatch: Dispatch1 & Dispatch2 & Dispatch3 & Dispatch4;
}>;
export declare function applyMiddleware<Dispatch1 extends Dispatch, Dispatch2 extends Dispatch, Dispatch3 extends Dispatch, Dispatch4 extends Dispatch, Dispatch5 extends Dispatch, State>(middleware1: Middleware<Dispatch1, State>, middleware2: Middleware<Dispatch2, State>, middleware3: Middleware<Dispatch3, State>, middleware4: Middleware<Dispatch4, State>, middleware5: Middleware<Dispatch5, State>): StoreEnhancer<{
    dispatch: Dispatch1 & Dispatch2 & Dispatch3 & Dispatch4 & Dispatch5;
}>;
export declare function applyMiddleware<Dispatch, State = any>(...middlewares: Middleware<any, State>[]): StoreEnhancer<{
    dispatch: Dispatch;
}>;
