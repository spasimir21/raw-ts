'use raw';

import { alignmentOf$, offsetOf$, sizeOf$, typeDescriptorOf$ } from './lib/macros';
import { Float32, Float64, RawArray, RawPointer, Struct, UInt32 } from './lib/types';

enum IDK {
  test,
  cool,
  nice
}

type A = Struct<{
  id: UInt32<IDK>;
  bool: Float32;
  children: RawArray<RawPointer<A>>;
}>;

typeDescriptorOf$<A>();

const size = offsetOf$<A, 'id'>();

console.dir(size, { depth: null });
