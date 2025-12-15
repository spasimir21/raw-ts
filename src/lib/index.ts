'use raw';

import { typeDescriptorOf$ } from './macros';
import { Entry } from '../Entry';

const descriptor = typeDescriptorOf$<Entry>();

console.log(descriptor);
