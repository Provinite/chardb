import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueConsumerService } from './queue-consumer.service';
import { ItemPrizeHandler } from './handlers/item-prize.handler';
import { CharacterPrizeHandler } from './handlers/character-prize.handler';
import { DatabaseModule } from '../database/database.module';
import { ItemsModule } from '../items/items.module';
import { PendingOwnershipModule } from '../pending-ownership/pending-ownership.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ItemsModule,
    PendingOwnershipModule,
  ],
  providers: [
    QueueConsumerService,
    ItemPrizeHandler,
    CharacterPrizeHandler,
  ],
  exports: [QueueConsumerService],
})
export class QueueConsumerModule {}
