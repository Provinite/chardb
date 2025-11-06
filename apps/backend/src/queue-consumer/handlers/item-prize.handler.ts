import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { ExternalAccountProvider } from '@chardb/database';
import { DatabaseService } from '../../database/database.service';
import { ItemsService } from '../../items/items.service';
import { PrizeEventDto } from '../dto/prize-event.dto';

@Injectable()
export class ItemPrizeHandler {
  private readonly logger = new Logger(ItemPrizeHandler.name);
  private readonly tracer = trace.getTracer('chardb-item-prize-handler', '1.0.0');

  constructor(
    private readonly db: DatabaseService,
    private readonly itemsService: ItemsService,
  ) {}

  async handle(event: PrizeEventDto) {
    const span = this.tracer.startSpan('handle_item_prize', {
      attributes: {
        'prize.discord_guild_id': event.discordGuildId,
        'prize.discord_user_id': event.discordUserId,
        'prize.item_type_id': event.itemTypeId,
        'prize.quantity': event.quantity || 1,
      },
    });

    try {
      await context.with(trace.setSpan(context.active(), span), async () => {
        this.logger.log(
          `Handling ITEM_AWARDED for guild ${event.discordGuildId}, user ${event.discordUserId}, itemType ${event.itemTypeId}`,
        );

        if (!event.itemTypeId) {
          throw new BadRequestException('itemTypeId is required for ITEM_AWARDED events');
        }

        // Step 1: Lookup community by Discord guild ID
        const community = await this.db.community.findFirst({
          where: { discordGuildId: event.discordGuildId },
        });

        if (!community) {
          throw new NotFoundException(
            `Community not found for Discord guild ID: ${event.discordGuildId}`,
          );
        }

        span.setAttributes({
          'prize.community_id': community.id,
          'prize.community_name': community.name,
        });

        this.logger.log(`Found community: ${community.name} (${community.id})`);

        // Step 2: Validate item type exists and belongs to community
        const itemType = await this.db.itemType.findUnique({
          where: { id: event.itemTypeId },
          include: { community: true },
        });

        if (!itemType) {
          throw new NotFoundException(`ItemType not found: ${event.itemTypeId}`);
        }

        if (itemType.communityId !== community.id) {
          throw new BadRequestException(
            `ItemType ${event.itemTypeId} does not belong to community ${community.id}`,
          );
        }

        span.setAttributes({
          'prize.item_type_name': itemType.name,
          'prize.item_type_stackable': itemType.isStackable,
        });

        this.logger.log(`Validated item type: ${itemType.name}`);

        // Step 3: Grant item using ItemsService
        // This will handle pending ownership if Discord account not linked
        const quantity = event.quantity || 1;

        const item = await this.itemsService.grantItem({
          itemTypeId: event.itemTypeId,
          quantity,
          pendingOwner: {
            provider: ExternalAccountProvider.DISCORD,
            providerAccountId: event.discordUserId,
          },
        });

        span.setAttributes({
          'prize.item_id': item.id,
          'prize.granted': true,
        });

        this.logger.log(
          `✅ Successfully granted ${quantity}x ${itemType.name} to Discord user ${event.discordUserId}`,
        );

        span.setStatus({ code: SpanStatusCode.OK });
      });
    } catch (error) {
      this.logger.error(`Error handling item prize: ${error.message}`, error.stack);
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}
