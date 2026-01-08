// @raw-ts-runtime-import-path(./memory)

'use raw';

import { JSPointer } from '../types';

function allocJSValue<T>(): JSPointer<T> {
  return 0 as JSPointer<T>;
}

function freeJSValue(pointer: JSPointer<any>): void {}

export { allocJSValue, freeJSValue };
