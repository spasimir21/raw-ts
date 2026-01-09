'use raw';

import { free, initializeMemory, M_U32, malloc, validateFreeLists } from './lib/runtime';
import { RawPointer, Void } from './lib/types';

initializeMemory({
  initialRawMemorySize: 1024 * 5
});

interface Chunk {
  pointer: number;
  size: number;
  value: number;
}

const chunks: Chunk[] = [];

const validate = () => {
  for (const chunk of chunks) {
    for (let i = chunk.pointer >> 2; i < (chunk.pointer >> 2) + chunk.size; i++) {
      if (M_U32[i] !== chunk.value) {
        console.log('KUREC!!!');
        break;
      }
    }
  }
};

let totalSize = 0;

for (let i = 0; i < 1000; i++) {
  const size = Math.floor(64 + Math.random() * 512);
  totalSize += size * 4;
  const pointer = malloc(size * 4);
  const value = Math.floor(Math.random() * 128_000);
  M_U32.fill(value, pointer >> 2, (pointer >> 2) + size);
  chunks.push({ size, pointer, value });
}

validate();

console.log(totalSize);

chunks.sort(() => 0.5 - Math.random());

for (let i = 0; i < 500; i++) {
  const chunk = chunks.shift()!;
  free(chunk.pointer as RawPointer<Void>);
  totalSize -= chunk.size * 4;
}

validate();

console.log(totalSize);

for (let i = 0; i < 500; i++) {
  const size = Math.floor(64 + Math.random() * 512);
  totalSize += size * 4;
  const pointer = malloc(size * 4);
  const value = Math.floor(Math.random() * 128_000);
  M_U32.fill(value, pointer >> 2, (pointer >> 2) + size);
  chunks.push({ size, pointer, value });
}

console.log(
  Math.min(...chunks.map(c => c.size * 4)),
  chunks.reduce((s, c) => s + c.size * 4, 0) / chunks.length,
  Math.max(...chunks.map(c => c.size * 4))
);

validate();

console.log(totalSize);

validateFreeLists();
