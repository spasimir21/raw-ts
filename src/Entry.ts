'use raw';

import { Struct, UInt32, Void } from './lib/types';

type Entry<DataLength extends number = number> = Struct<{
  length: UInt32;
  data: Void<DataLength>;
}>;

export { Entry };
