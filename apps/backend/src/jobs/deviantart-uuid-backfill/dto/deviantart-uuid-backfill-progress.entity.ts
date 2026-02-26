import { ObjectType, Field, ID, Int } from "@nestjs/graphql";

@ObjectType()
export class DeviantartUuidBackfillRecordResult {
  @Field(() => ID)
  pendingOwnershipId: string;

  @Field(() => ID, { nullable: true })
  characterId?: string;

  @Field(() => ID, { nullable: true })
  itemId?: string;

  @Field()
  oldValue: string;

  @Field({ nullable: true })
  newValue?: string;

  @Field()
  success: boolean;

  @Field({ nullable: true })
  error?: string;

  @Field()
  claimed: boolean;

  @Field(() => ID, { nullable: true })
  claimedByUserId?: string;
}

@ObjectType()
export class DeviantartUuidBackfillProgress {
  @Field()
  jobId: string;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  processed: number;

  @Field(() => Int)
  succeeded: number;

  @Field(() => Int)
  failed: number;

  @Field(() => Int)
  claimed: number;

  @Field(() => DeviantartUuidBackfillRecordResult, { nullable: true })
  currentRecord?: DeviantartUuidBackfillRecordResult;

  @Field()
  done: boolean;

  @Field()
  cancelled: boolean;
}
