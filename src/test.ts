'use raw';

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
  id: RawArray<UInt8, 13>;
  data: Void<number, 4>;
}>;
