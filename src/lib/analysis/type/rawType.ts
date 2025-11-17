import { RAW_TYPE_INFO_PROPERTY_NAME } from '../../common';
import type TS from 'typescript';

const isRawType = (type: TS.Type) => type.getProperty(RAW_TYPE_INFO_PROPERTY_NAME) != null;

export { isRawType };
