import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SqsModule } from "@ssut/nestjs-sqs";
import { PrizeQueueHandler } from "./handlers/prize-queue.handler";
import { ItemPrizeHandler } from "./handlers/item-prize.handler";
import { CharacterPrizeHandler } from "./handlers/character-prize.handler";
import { DatabaseModule } from "../database/database.module";
import { ItemsModule } from "../items/items.module";
import { PendingOwnershipModule } from "../pending-ownership/pending-ownership.module";

export function sqsModuleFactory(configService: ConfigService) {
  const enabled = configService.get("AWS_SQS_ENABLED", "true") !== "false";
  const queueUrl = configService.get<string>("AWS_SQS_QUEUE_URL", "");
  const region = configService.get<string>("AWS_REGION", "us-east-1");

  if (!enabled || !queueUrl) {
    return { consumers: [], producers: [] };
  }

  return {
    consumers: [
      {
        name: "prize-distribution",
        queueUrl: queueUrl,
        region: region,
        batchSize: 5,
        waitTimeSeconds: 5,
      },
    ],
    producers: [],
  };
}

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ItemsModule,
    PendingOwnershipModule,
    SqsModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: sqsModuleFactory,
    }),
  ],
  providers: [PrizeQueueHandler, ItemPrizeHandler, CharacterPrizeHandler],
})
export class QueueConsumerModule {}
