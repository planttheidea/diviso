import { READ_ONLY_SLICE, READ_WRITE_SLICE, UPDATE_SLICE } from './flags';

import type {
  AnySelectSlice,
  AnyUpdateSlice,
  AnyStatefulSlice,
  AnyStatefulSliceAction,
} from './types';

export function compose(...funcs: Function[]) {
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return <T>(arg: T) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (a, b) =>
      (...args: any) =>
        a(b(...args))
  );
}

export function getDescendantSlices(
  slices: AnyStatefulSlice[] | readonly AnyStatefulSlice[]
): AnyStatefulSlice[] {
  let descendantSlices: AnyStatefulSlice[] = [];

  slices.forEach((slice) => {
    if (slice.c) {
      descendantSlices.push(...getDescendantSlices(slice.c));
    } else {
      descendantSlices.push(slice);
    }
  });

  return Array.from(new Set(descendantSlices));
}

let hashId = 0;

export function getId(name: string) {
  const string = `${name}_${hashId++}`;

  let index = string.length;
  let hashA = 5381;
  let hashB = 52711;
  let charCode;

  while (index--) {
    charCode = string.charCodeAt(index);

    hashA = (hashA * 33) ^ charCode;
    hashB = (hashB * 33) ^ charCode;
  }

  return (hashA >>> 0) * 4096 + (hashB >>> 0);
}

export const is =
  Object.is ||
  function is(x, y) {
    return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
  };

export function isSelectSlice(value: any): value is AnySelectSlice {
  return !!(value && READ_ONLY_SLICE & value.t);
}

export function isPlainObject(value: any) {
  return (
    !!value && (value.constructor === Object || value.constructor === null)
  );
}

export function isSliceAction(value: any): value is AnyStatefulSliceAction {
  return !!(value && value.$$slice);
}

export function isStatefulSlice(value: any): value is AnyStatefulSlice {
  return !!(value && READ_WRITE_SLICE & value.t);
}

export function isUpdateSlice(value: any): value is AnyUpdateSlice {
  return !!(value && UPDATE_SLICE & value.t);
}

export function toScreamingSnakeCase(string: string): string {
  return string
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join('_')
    .toUpperCase();
}
