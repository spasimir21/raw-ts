'use raw';

import { Float32, Float64, RawArray, RawPointer, Struct, UInt32 } from './lib/types';
import { alignmentOf$, offsetOf$, sizeOf$, typeDescriptorOf$ } from './lib/macros';

enum IDK {
  test,
  cool,
  nice
}

type A = Struct<{
  id: UInt32<IDK>;
  bool: Float64;
  children: RawArray<RawPointer<A>>;
}>;

typeDescriptorOf$<A>();

const size = offsetOf$<A, 'children'>();

console.dir(size, { depth: null });
