/*
  typeDescriptorOf$<Type>()
  sizeOf$<Type>()
  alignmentOf$<Type>()
  addressOf$(value)
  offsetOf$<Type, 'Field'>()
  pointerCast$<Type>(pointer)
  voidCast$<Type>(voidValue)
  castToVoid$(refValue)
*/

import { RawTypeContainer, RawTypeDescriptorOf } from '../types';
import { USE_RAW_TS_DIRECTIVE } from '../constants';

const throwMacroError = () => {
  throw new Error(
    `This is only a build-time macro and it seems like it hasn\'t been transpiled properly! Did you forget a "${USE_RAW_TS_DIRECTIVE}" directive?`
  );
};

const typeDescriptorOf$ = <T extends RawTypeContainer>(): RawTypeDescriptorOf<T> =>
  throwMacroError();

export { typeDescriptorOf$ };
