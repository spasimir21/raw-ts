'use raw';

import { free, getMemoryAnalysis, initializeMemory, M, malloc } from './lib/runtime';
import { Vector, vector_deinit, vector_init, VECTOR_SIZE } from './lib/std';
import { addressOf$, sizeOf$ } from './lib/macros';
import { UInt32 } from './lib/types';

initializeMemory();

const vector = malloc<Vector<UInt32>>(VECTOR_SIZE).value$;

vector_init(vector, sizeOf$<UInt32>(), 16);

const data = vector.data.value$;

for (let i = 0; i < 12; i++) {
  data[i] = i as UInt32;
  vector.length++;
}

const view = new Uint32Array(M, addressOf$(vector) - 8, 64);
console.log(view);

vector_deinit(vector);
free(addressOf$(vector));

console.log(view);

console.log(getMemoryAnalysis());
