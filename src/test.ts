'use raw';

import { Vector, vector_deinit, vector_init, vector_push, VECTOR_SIZE } from './lib/std';
import { free, getMemoryAnalysis, initializeMemory, M, malloc } from './lib/runtime';
import { addressOf$, sizeOf$ } from './lib/macros';
import { UInt32 } from './lib/types';

initializeMemory();

const vector = malloc<Vector<UInt32>>(VECTOR_SIZE).value$;

vector_init(vector, sizeOf$<UInt32>(), 0);

for (let i = 0; i < 12; i++) {
  vector_push(vector).value$ = i as UInt32;
}

const view = new Uint32Array(M, addressOf$(vector) - 8, 64);
console.log(view);

vector_deinit(vector);
free(addressOf$(vector));

console.log(view);

console.log(getMemoryAnalysis());
