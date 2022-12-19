import type { AnySelectablePart } from 'types';

export type Listener = () => void;
export type Notify = () => void;
export type Notifier = (notify: Notify) => void;
export type Subscribe = (listener: Listener) => Unsubscribe;
export type SubscribeToPart = (
  part: AnySelectablePart,
  listener: Listener
) => Unsubscribe;
export type Unsubscribe = () => void;
