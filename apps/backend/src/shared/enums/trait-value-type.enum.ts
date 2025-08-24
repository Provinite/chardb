import { registerEnumType } from '@nestjs/graphql';

/** Types of values that traits can store */
export enum TraitValueType {
  /** String/text value */
  STRING = 'string',
  /** Timestamp/date value */
  TIMESTAMP = 'timestamp', 
  /** Integer/numeric value */
  INTEGER = 'integer',
  /** Enumerated value (from predefined list) */
  ENUM = 'enum',
}

registerEnumType(TraitValueType, {
  name: 'TraitValueType',
  description: 'Types of values that traits can store',
  valuesMap: {
    STRING: {
      description: 'String/text value',
    },
    TIMESTAMP: {
      description: 'Timestamp/date value',
    },
    INTEGER: {
      description: 'Integer/numeric value',
    },
    ENUM: {
      description: 'Enumerated value from predefined list',
    },
  },
});