'use raw';

import { typeDescriptorOf$ } from './lib/macros';
import {
  Bool,
  Float32,
  JSPointer,
  RawArray,
  RawPointer,
  Struct,
  UInt16,
  UInt8,
  Union,
  Void
} from './lib/types';

type A = Struct<{
  id: Void<number, 4>;
}>;

const descriptor = typeDescriptorOf$<A>();

console.log(descriptor);
