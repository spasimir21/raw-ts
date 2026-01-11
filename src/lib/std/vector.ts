// @raw-ts-runtime-import-path(../runtime)

'use raw';

import { RawArray, RawPointer, RawTypeContainer, Struct, UInt32, Void } from '../types';
import { free, M, M_U8, malloc, mresize, NULL_PTR } from '../runtime';
import { pointerCast$, sizeOf$ } from '../macros';

type Vector<T extends RawTypeContainer> = Struct<{
  length: UInt32;
  valueSize: UInt32;
  capacity: UInt32;
  data: RawPointer<RawArray<T>>;
}>;

type UntypedVector = Struct<{
  length: UInt32;
  valueSize: UInt32;
  capacity: UInt32;
  data: RawPointer<Void>;
}>;

const VECTOR_SIZE = sizeOf$<UntypedVector>();

function vector_init(typedVector: Vector<RawTypeContainer>, valueSize: number, capacity: number): void {
  if (!Number.isInteger(valueSize) || valueSize <= 0)
    throw new Error(`${valueSize} is not a valid valueSize for vector!`);

  const vector = typedVector as any as UntypedVector;

  vector.length = 0 as UInt32;
  vector.capacity = 0 as UInt32;
  vector.valueSize = valueSize as UInt32;

  vector.data = NULL_PTR as RawPointer<Void>;
  vector_scale(typedVector, capacity);
}

function vector_deinit(typedVector: Vector<RawTypeContainer>): void {
  const vector = typedVector as any as UntypedVector;

  if (vector.data !== NULL_PTR) free(vector.data);

  vector.valueSize = 0 as UInt32;
  vector.length = 0 as UInt32;
  vector.capacity = 0 as UInt32;
  vector.data = NULL_PTR as RawPointer<Void>;
}

function vector_scale(typedVector: Vector<RawTypeContainer>, capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 0)
    throw new Error(`${capacity} is not a valid capacity for vector!`);

  const vector = typedVector as any as UntypedVector;

  const oldSize = vector.capacity * vector.valueSize;
  const newSize = capacity * vector.valueSize;

  vector.length = Math.min(vector.length, capacity) as UInt32;
  vector.capacity = capacity as UInt32;

  if (vector.data === NULL_PTR) {
    if (newSize > 0) vector.data = malloc(newSize);
    return;
  }

  if (newSize <= 0) {
    free(vector.data);
    vector.data = NULL_PTR as RawPointer<Void>;
    return;
  }

  if (mresize(vector.data, newSize)) return;

  const oldData = vector.data;
  vector.data = malloc(newSize);

  M_U8.copyWithin(vector.data, oldData, oldData + Math.min(oldSize, newSize));

  free(oldData);
}

function vector_ensure_capacity(typedVector: Vector<RawTypeContainer>, targetCapacity: number): void {
  const vector = typedVector as any as UntypedVector;
  if (vector.capacity >= targetCapacity) return;

  let capacity: number = vector.capacity;
  while (capacity < targetCapacity) capacity = capacity == 0 ? 1 : capacity * 2;

  vector_scale(typedVector, capacity);
}

function vector_push<T extends RawTypeContainer>(typedVector: Vector<T>): RawPointer<T> {
  const vector = typedVector as any as UntypedVector;

  vector_ensure_capacity(typedVector, vector.length + 1);
  vector.length++;

  return (vector.data + vector.valueSize * (vector.length - 1)) as RawPointer<T>;
}

// vector_at
// vector_splice
// vector_pop
// vector_shift
// vector_unshift
// vector_clear
// vector_delete
// vector_insert

export {
  VECTOR_SIZE,
  vector_init,
  vector_deinit,
  vector_scale,
  vector_ensure_capacity,
  vector_push,
  Vector,
  UntypedVector
};
