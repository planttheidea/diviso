export interface PromiseCacheEntry<Result> {
  c: () => void;
  e: Error | null;
  p: Promise<Result>;
  r: Result | undefined;
  s: 'pending' | 'resolved' | 'rejected' | 'canceled';
}
