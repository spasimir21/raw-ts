'use raw';

import { initializeMemory, M_U32, malloc } from './lib/runtime';

initializeMemory({
  initialRawMemorySize: 1024 * 5
});

malloc(1);

console.log(M_U32);
