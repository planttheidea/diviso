import { isPromise } from './validate';

export interface PromiseCacheEntry<Result> {
  c: () => void;
  e: Error | null;
  p: Promise<Result>;
  r: Result | undefined;
  s: 'pending' | 'resolved' | 'rejected' | 'canceled';
}

const CACHE = new WeakMap<Promise<unknown>, PromiseCacheEntry<unknown>>();

export function cachePromise<Result>(
  promise: Promise<Result>
): Promise<Result> {
  const entry: PromiseCacheEntry<Result> = {
    c: () => {
      entry.s = 'canceled';
    },
    e: null,
    p: new Promise<Result>((resolve, reject) => {
      promise.then(
        (result) => {
          if (entry.s === 'canceled') {
            return resolve(undefined as Result);
          }

          entry.e = null;
          entry.r = result;
          entry.s = 'resolved';

          resolve(result);
        },
        (error) => {
          if (entry.s === 'canceled') {
            return resolve(undefined as Result);
          }

          entry.e = error;
          entry.r = undefined;
          entry.s = 'rejected';

          reject(error);
        }
      );
    }),
    r: undefined,
    s: 'pending',
  };

  CACHE.set(entry.p, entry);

  return entry.p;
}

export function cancelPromise(promise: Promise<unknown>): void {
  const entry = isPromise(promise) && CACHE.get(promise);

  if (entry) {
    entry.c();
  }
}

export function getCachedPromise<Result>(
  promise: Promise<Result>
): Result | Promise<Result> {
  const cached = CACHE.get(promise) as PromiseCacheEntry<Result> | undefined;

  return cached ? cached.p : cachePromise(promise);
}

export function getPromiseCacheEntry<Result>(
  promise: Promise<Result>
): PromiseCacheEntry<Result> | undefined {
  return CACHE.get(promise) as PromiseCacheEntry<Result>;
}
