/*
  typeDescriptorOf$<Type>()
  sizeOf$<Type>()
  alignmentOf$<Type>()
  offsetOf$<Type, 'Field'>()
  pointerCast$<Type>(pointer)
  referenceCast$<Type>(refValue)
  addressOf$(value)
*/

import { RawTypeContainer, RawTypeDescriptorOf, StructTypeInfo } from '../types';
import { RAW_TYPE_INFO_PROPERTY_NAME, USE_RAW_TS_DIRECTIVE } from '../constants';

const throwMacroError = () => {
  throw new Error(
    `This is only a build-time macro and it seems like it hasn\'t been transpiled properly! Did you forget a "${USE_RAW_TS_DIRECTIVE}" directive?`
  );
};

const typeDescriptorOf$ = <T extends RawTypeContainer>(): RawTypeDescriptorOf<T> =>
  throwMacroError();

const sizeOf$ = <T extends RawTypeContainer>(): number => throwMacroError();

const alignmentOf$ = <T extends RawTypeContainer>(): number => throwMacroError();

const offsetOf$ = <
  T extends RawTypeContainer<StructTypeInfo>,
  F extends Exclude<keyof T, typeof RAW_TYPE_INFO_PROPERTY_NAME>
>(): number => throwMacroError();

export { typeDescriptorOf$, sizeOf$, alignmentOf$, offsetOf$ };
