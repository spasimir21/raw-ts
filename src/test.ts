'use raw';

import {
  Bool,
  Float32,
  Float64,
  JSPointer,
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

type B = Struct<{
  cool: UInt32;
  id: JSPointer<string>;
}>;

type A = Struct<{
  bool: Float64;
  id: UInt32<1 | 2 | 3>;
  child: B;
  children: RawArray<RawPointer<Bool>>;
}>;

const a: A = null as any;

const n: number = 5;

a.children[5]!.value$;
addressOf$(a.children[5]!.value$);
