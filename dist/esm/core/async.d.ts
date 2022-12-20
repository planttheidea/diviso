export interface PromiseCacheEntry<Result> {
    c: () => void;
    e: Error | null;
    p: Promise<Result>;
    r: Result | undefined;
    s: 'pending' | 'resolved' | 'rejected' | 'canceled';
}
export declare function cachePromise<Result>(promise: Promise<Result>): Promise<Result>;
export declare function cancelPromise(promise: Promise<unknown>): void;
export declare function getCachedPromise<Result>(promise: Promise<Result>): Result | Promise<Result>;
export declare function getPromiseCacheEntry<Result>(promise: Promise<Result>): PromiseCacheEntry<Result> | undefined;
