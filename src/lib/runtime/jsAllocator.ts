// @raw-ts-runtime-import-path(./memory)

'use raw';

import { JSPointer } from '../types';
import { M_JS } from './memory';

let jsValueFreeListHead: number = -1;

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
  if (jsValueFreeListHead < 0) {
    M_JS.push(null);
    return (M_JS.length - 1) as JSPointer<T>;
  }

  if (typeof M_JS[jsValueFreeListHead] !== 'number') throw new Error('JS values list has been corrupted!');

  JS_VALUES_INFO.totalFreeSize--;

  const pointer = jsValueFreeListHead as JSPointer<T>;

  jsValueFreeListHead = M_JS[pointer];
  M_JS[pointer] = null;

  return pointer;
}

function freeJSValue(pointer: JSPointer<any>): void {
  if (
    pointer < 0 ||
    pointer > M_JS.length - 1 ||
    !Number.isInteger(pointer) ||
    typeof M_JS[pointer] === 'number'
  )
    return;

  JS_VALUES_INFO.totalFreeSize++;

  M_JS[pointer] = jsValueFreeListHead;
  jsValueFreeListHead = pointer;
}

export { JS_VALUES_INFO, allocJSValue, freeJSValue };
