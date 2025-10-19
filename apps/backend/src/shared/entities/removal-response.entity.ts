import { ObjectType, Field } from '@nestjs/graphql';

/**
 * Generic response entity for removal operations
 */
@ObjectType({
  description: 'Response confirming successful removal of an entity',
})
export class RemovalResponse {
  /** Whether the entity was successfully removed */
  @Field({ description: 'Whether the entity was successfully removed' })
  removed: boolean;

  /** Optional message about the removal */
  @Field({ nullable: true, description: 'Optional message about the removal' })
  message?: string;
}
