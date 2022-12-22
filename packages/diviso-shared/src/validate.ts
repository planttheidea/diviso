import { SELECTABLE_PART, UPDATEABLE_PART } from './flags';

import type { AnySelectablePart, AnyUpdateablePart } from 'diviso';

export function isPromise(value: any): value is Promise<unknown> {
  return !!value && typeof value.then === 'function';
}

export function isSelectablePart(value: any): value is AnySelectablePart {
  return !!(value && value.f & SELECTABLE_PART);
}

export function isUpdateablePart(value: any): value is AnyUpdateablePart {
  return !!(value && value.f & UPDATEABLE_PART);
}
