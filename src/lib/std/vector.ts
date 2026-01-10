// @raw-ts-runtime-import-path(../runtime)

'use raw';

import { RawArray, RawPointer, RawTypeContainer, Struct, UInt32, Void } from '../types';
import { free, M_U8, malloc, mresize, NULL_PTR } from '../runtime';
import { sizeOf$ } from '../macros';

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
  const vector = typedVector as any as UntypedVector;

  vector.length = 0 as UInt32;
  vector.valueSize = valueSize as UInt32;

  vector.data = NULL_PTR as RawPointer<Void>;
  vector_scale(typedVector, capacity);
}

function vector_deinit(typedVector: Vector<RawTypeContainer>): void {
  const vector = typedVector as any as UntypedVector;

  if (vector.data !== NULL_PTR) free(vector.data);

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

  M_U8.copyWithin(vector.data, oldData, oldData + oldSize);

  free(oldData);
}

export { VECTOR_SIZE, vector_init, vector_deinit, vector_scale, Vector, UntypedVector };
