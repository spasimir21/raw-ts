'use raw';

import { RawArray, RawPointer, Struct, UInt32 } from './lib/types';
import { typeDescriptorOf$ } from './lib/macros';

enum IDK {
  test,
  cool,
  nice
}

type A = Struct<{
  id: UInt32<IDK>;
  children: RawArray<RawPointer<A>>;
}>;

const descriptor = typeDescriptorOf$<A>();

console.dir(descriptor, { depth: null });
