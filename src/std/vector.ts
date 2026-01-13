// @raw-ts-runtime-import-path(../runtime)

'use raw';

import { RawArray, RawPointer, RawTypeContainer, Struct, UInt32, Void } from '../types';
import { free, malloc, mresize, NULL_PTR } from '../runtime';
import { memmove, memset } from '../runtime/memory';
import { addressOf$, sizeOf$ } from '../macros';

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

function vector_init(typedVector: Vector<RawTypeContainer>, valueSize: number, capacity: number = 0): void {
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

  memset(addressOf$(vector), 0, VECTOR_SIZE);
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

  memmove(vector.data, oldData, Math.min(oldSize, newSize));

  free(oldData);
}

function vector_ensureCapacity(typedVector: Vector<RawTypeContainer>, targetCapacity: number): void {
  const vector = typedVector as any as UntypedVector;
  if (vector.capacity >= targetCapacity) return;

  let capacity: number = vector.capacity;
  while (capacity < targetCapacity) capacity = capacity == 0 ? 2 : capacity * 2;

  vector_scale(typedVector, capacity);
}

function vector_at<T extends RawTypeContainer>(typedVector: Vector<T>, index: number): RawPointer<T> {
  if (!Number.isInteger(index)) throw new Error(`${index} is an invalid index for a vector!`);

  const vector = typedVector as any as UntypedVector;

  if (index < 0) {
    index += vector.length;
    if (index < 0) index = 0;
  }

  if (index < 0 || index >= vector.length) throw new Error(`${index} is out of bounds for vector!`);

  return (vector.data + index * vector.valueSize) as RawPointer<T>;
}

function vector_splice(
  vector: Vector<RawTypeContainer>,
  index: number,
  deleteCount: number,
  insertCount: 0,
  zeroInserted?: boolean
): void;
function vector_splice<T extends RawTypeContainer>(
  vector: Vector<T>,
  index: number,
  deleteCount: number,
  insertCount: 1,
  zeroInserted?: boolean
): RawPointer<T>;
function vector_splice<T extends RawTypeContainer>(
  vector: Vector<T>,
  index: number,
  deleteCount: number,
  insertCount: number,
  zeroInserted?: boolean
): RawArray<T>;
function vector_splice(
  typedVector: Vector<RawTypeContainer>,
  index: number,
  deleteCount: number,
  insertCount: number,
  zeroInserted: boolean = false
): RawPointer<RawTypeContainer> | RawArray<RawTypeContainer> {
  if (!Number.isInteger(index)) throw new Error(`${index} is an invalid index for a vector!`);

  const vector = typedVector as any as UntypedVector;

  if (index < 0) {
    index += vector.length;
    if (index < 0) index = 0;
  }

  if (index < 0 || index > vector.length) throw new Error(`${index} is out of bounds for vector!`);

  if (!Number.isInteger(deleteCount) || deleteCount < 0)
    throw new Error(`${deleteCount} is an invalid delete count for vector splice!`);

  if (!Number.isInteger(insertCount) || insertCount < 0)
    throw new Error(`${insertCount} is an invalid insert count for vector splice!`);

  deleteCount = Math.min(deleteCount, vector.length - index);
  if (insertCount === 0 && deleteCount === 0) return NULL_PTR as RawPointer<RawTypeContainer>;

  const oldLength = vector.length;
  const newLength = oldLength + insertCount - deleteCount;

  vector_ensureCapacity(typedVector, newLength);
  vector.length = newLength as UInt32;

  if (vector.data === NULL_PTR) return NULL_PTR as RawPointer<RawTypeContainer>;

  const valueSize = vector.valueSize;
  const start: number = vector.data + index * valueSize;

  if (insertCount !== deleteCount && index + deleteCount < oldLength)
    memmove(
      start + insertCount * valueSize,
      start + deleteCount * valueSize,
      (oldLength - index - deleteCount) * valueSize
    );

  if (zeroInserted && insertCount > 0) memset(start, 0, insertCount * valueSize);

  return start as RawPointer<RawTypeContainer> | RawArray<RawTypeContainer>;
}

const vector_push = <T extends RawTypeContainer>(vector: Vector<T>, zeroInserted?: boolean) =>
  vector_splice(vector, (vector as any as UntypedVector).length, 0, 1, zeroInserted);

const vector_pop = <T extends RawTypeContainer>(vector: Vector<T>): void => vector_splice(vector, -1, 1, 0);

const vector_unshift = <T extends RawTypeContainer>(vector: Vector<T>, zeroInserted?: boolean) =>
  vector_splice(vector, 0, 0, 1, zeroInserted);

const vector_shift = <T extends RawTypeContainer>(vector: Vector<T>): void => vector_splice(vector, 0, 1, 0);

const vector_clear = <T extends RawTypeContainer>(vector: Vector<T>) =>
  vector_splice(vector, 0, (vector as any as UntypedVector).length, 0);

const vector_delete = <T extends RawTypeContainer>(vector: Vector<T>, index: number, count: number) =>
  vector_splice(vector, index, count, 0);

const vector_insert: (<T extends RawTypeContainer>(
  vector: Vector<T>,
  index: number,
  count: 1,
  zeroInserted?: boolean
) => RawPointer<T>) &
  (<T extends RawTypeContainer>(
    vector: Vector<T>,
    index: number,
    count: number,
    zeroInserted?: boolean
  ) => RawArray<T>) = (
  vector: Vector<RawTypeContainer>,
  index: number,
  count: number,
  zeroInserted?: boolean
) => vector_splice(vector, index, 0, count, zeroInserted) as any;

export {
  VECTOR_SIZE,
  vector_init,
  vector_deinit,
  vector_scale,
  vector_ensureCapacity,
  vector_at,
  vector_splice,
  vector_push,
  vector_pop,
  vector_unshift,
  vector_shift,
  vector_clear,
  vector_delete,
  vector_insert,
  Vector,
  UntypedVector
};
