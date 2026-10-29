import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType({
  description:
    "Progress of the job that looks up Discord names for pending owners.",
})
export class DiscordNameBackfillStatus {
  @Field()
  running: boolean;

  @Field(() => Int, { description: "Discord accounts to look up." })
  total: number;

  @Field(() => Int)
  processed: number;

  @Field(() => Int, { description: "Accounts whose names were recorded." })
  updated: number;

  @Field(() => Int, {
    description: "Accounts Discord says do not exist, such as deleted ones.",
  })
  notFound: number;

  @Field(() => Int, {
    description:
      "Accounts that could not be looked up because Discord was unreachable " +
      "or rate limited. A rerun will try them again.",
  })
  failed: number;

  @Field({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  finishedAt?: Date;
}
