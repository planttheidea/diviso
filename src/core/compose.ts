import type { AnyFn } from './utils';

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for the
 * resulting composite function.
 *
 * @param funcs The functions to compose.
 * @returns A function obtained by composing the argument functions from right
 *   to left. For example, `compose(f, g, h)` is identical to doing
 *   `(...args) => f(g(h(...args)))`.
 */
export function compose(): <Result>(a: Result) => Result;

export function compose<F extends AnyFn<any, any>>(f: F): F;

/* two functions */
export function compose<A, Args extends any[], Result>(
  f1: (a: A) => Result,
  f2: AnyFn<Args, A>
): AnyFn<Args, Result>;

/* three functions */
export function compose<A, B, Args extends any[], Result>(
  f1: (b: B) => Result,
  f2: (a: A) => B,
  f3: AnyFn<Args, A>
): AnyFn<Args, Result>;

/* four functions */
export function compose<A, B, C, Args extends any[], Result>(
  f1: (c: C) => Result,
  f2: (b: B) => C,
  f3: (a: A) => B,
  f4: AnyFn<Args, A>
): AnyFn<Args, Result>;

/* rest */
export function compose<Result>(
  f1: (a: any) => Result,
  ...funcs: AnyFn<any, any>[]
): (...args: any[]) => Result;

export function compose<Result>(
  ...funcs: AnyFn<any, any>[]
): (...args: any[]) => Result;

export function compose<Fns extends AnyFn<any, any>[]>(...funcs: Fns) {
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return <Arg>(arg: Arg) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (a, b) =>
      (...args: any[]) =>
        a(b(...args))
  );
}
