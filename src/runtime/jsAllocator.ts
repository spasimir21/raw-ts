// @raw-ts-runtime-import-path(./memory)

'use raw';

import { JSPointer } from '../types';
import { M_JS } from './memory';

const JS_FREE_SET = new Set<number>();
const JS_FREE_LIST: number[] = [];

const JS_VALUES_INFO = {
  totalFreeSize: 0,
  get totalSize() {
    return M_JS.length;
  },
  get totalUsedSize() {
    return M_JS.length - this.totalFreeSize;
  },
  get usedRatio() {
    return 1 - this.totalFreeSize / M_JS.length;
  }
};

function allocJSValue<T>(): JSPointer<T> {
  if (JS_FREE_LIST.length === 0) {
    M_JS.push(null);
    return (M_JS.length - 1) as JSPointer<T>;
  }

  const pointer = JS_FREE_LIST.pop()! as JSPointer<T>;

  JS_FREE_SET.delete(pointer);
  JS_VALUES_INFO.totalFreeSize--;

  return pointer;
}

function freeJSValue(pointer: JSPointer<any>): void {
  if (JS_FREE_SET.has(pointer)) return;

  M_JS[pointer] = null;
  JS_FREE_LIST.push(pointer);

  JS_VALUES_INFO.totalFreeSize++;
  JS_FREE_SET.add(pointer);
}

export { JS_VALUES_INFO, allocJSValue, freeJSValue };
