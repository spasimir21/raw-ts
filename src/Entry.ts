'use raw';

import { Struct, UInt32, Void } from './lib/types';

type Entry = Struct<{
  length: UInt32;
  data: Void;
}>;

export { Entry };
