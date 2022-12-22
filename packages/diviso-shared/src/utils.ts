export const isFallback: typeof Object.is = function (x, y) {
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};

export const is = Object.is || isFallback;

export function noop() {}
