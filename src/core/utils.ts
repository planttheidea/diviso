import { isDate, isError } from './validate';

import type { AnyStatefulPart, PartAction, PartId, PartMap } from './types';

export function createInternalActionType(type: string): string {
  const randomString = Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.');

  return `@@redux/${type}${randomString}`;
}

export function createProbeUnknownAction() {
  return createInternalActionType('PROBE_UNKNOWN_ACTION');
}

export function getActionPartId(action: PartAction): PartId {
  return action.$$part;
}

export function getActionPartIdDevTools(action: {
  action: PartAction;
}): PartId {
  return action.action.$$part;
}

export function getConstructorName(value: any): string | null {
  return typeof value.constructor === 'function'
    ? value.constructor.name
    : null;
}

let idCounter = 0;
export function getId(): PartId {
  let id = ++idCounter;

  id = ((id >> 16) ^ id) * 0x45d9f3b;
  id = ((id >> 16) ^ id) * 0x45d9f3b;

  return (id >> 16) ^ id;
}

export function getStatefulPartMap(parts: readonly AnyStatefulPart[]): PartMap {
  let partMap = {} as PartMap;

  parts.forEach((part) => {
    partMap[part.id] = part;

    if (part.c) {
      partMap = { ...partMap, ...getStatefulPartMap(part.c) };
    }
  });

  return partMap;
}

export function identity<Value>(value: Value): Value {
  return value;
}

export const isFallback: typeof Object.is = function (x, y) {
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};

export const is = Object.is || isFallback;

export function kindOf(value: any): string {
  if (value === void 0) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  switch (type) {
    case 'boolean':
    case 'string':
    case 'number':
    case 'symbol':
    case 'function':
    case 'bigint': {
      return type;
    }
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (isDate(value)) {
    return 'date';
  }

  if (isError(value)) {
    return 'error';
  }

  const constructorName = getConstructorName(value);

  switch (constructorName) {
    case 'Symbol':
    case 'Promise':
    case 'WeakMap':
    case 'WeakSet':
    case 'Map':
    case 'Set':
      return constructorName;
  }

  // other
  return Object.prototype.toString
    .call(value)
    .slice(8, -1)
    .toLowerCase()
    .replace(/\s/g, '');
}

export function noop() {}

export function toScreamingSnakeCase(string: string): string {
  return string
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join('_')
    .toUpperCase();
}

export function updateUniqueList(list: any[], item: any): void {
  if (!~list.indexOf(item)) {
    list.push(item);
  }
}

export function warn(message: string): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }

  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
  } catch (e) {} // eslint-disable-line no-empty
}
