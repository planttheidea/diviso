import type { ReducersMapObject } from 'redux';

export function isReducersMap(
  value: any
): value is ReducersMapObject<any, any> {
  return typeof value === 'object';
}
