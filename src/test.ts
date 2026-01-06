'use raw';

import {
  Float32,
  Float64,
  RawArray,
  RawPointer,
  Struct,
  UInt32,
  UInt8,
  Union,
  Void
} from './lib/types';
import {
  addressOf$,
  alignmentOf$,
  offsetOf$,
  pointerCast$,
  referenceCast$,
  sizeOf$,
  typeDescriptorOf$
} from './lib/macros';

enum IDK {
  test,
  cool,
  nice
}

type A = Struct<{
  id: UInt32<1 | 2 | 3>;
  bool: Float64;
  children: RawArray<RawPointer<A>>;
}>;

typeDescriptorOf$<A>();

// const size = offsetOf$<A, 'children'>();

// console.dir(size, { depth: null });

const a: A = null as any;
