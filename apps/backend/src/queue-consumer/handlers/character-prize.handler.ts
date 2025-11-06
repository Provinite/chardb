import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { ExternalAccountProvider } from '@chardb/database';
import { DatabaseService } from '../../database/database.service';
import { PendingOwnershipService } from '../../pending-ownership/pending-ownership.service';
import { PrizeEventDto } from '../dto/prize-event.dto';

@Injectable()
export class CharacterPrizeHandler {
  private readonly logger = new Logger(CharacterPrizeHandler.name);
  private readonly tracer = trace.getTracer('chardb-character-prize-handler', '1.0.0');

  constructor(
    private readonly db: DatabaseService,
    private readonly pendingOwnershipService: PendingOwnershipService,
  ) {}

  async handle(event: PrizeEventDto) {
    const span = this.tracer.startSpan('handle_character_prize', {
      attributes: {
        'prize.discord_guild_id': event.discordGuildId,
        'prize.discord_user_id': event.discordUserId,
        'prize.character_id': event.characterId,
      },
    });

    try {
      await context.with(trace.setSpan(context.active(), span), async () => {
        this.logger.log(
          `Handling CHARACTER_AWARDED for guild ${event.discordGuildId}, user ${event.discordUserId}, character ${event.characterId}`,
        );

        if (!event.characterId) {
          throw new BadRequestException('characterId is required for CHARACTER_AWARDED events');
        }

        // Step 1: Look up the character
        const character = await this.db.character.findUnique({
          where: { id: event.characterId },
          include: {
            species: {
              include: {
                community: true,
              },
            },
            owner: true,
          },
        });

        if (!character) {
          throw new NotFoundException(`Character not found: ${event.characterId}`);
        }

        span.setAttributes({
          'prize.character_name': character.name,
          'prize.species_id': character.speciesId ?? 'none',
          'prize.current_owner_id': character.ownerId ?? 'orphaned',
        });

        // Step 2: Verify character is orphaned (ownerId = null)
        if (character.ownerId !== null) {
          throw new BadRequestException(
            `Character ${event.characterId} is already owned by user ${character.ownerId}. Only orphaned characters can be awarded.`,
          );
        }

        this.logger.log(`Character ${character.name} is orphaned, proceeding with ownership transfer`);

        // Step 3: Verify character's species belongs to the community associated with the Discord guild
        // (This is optional validation - the user said no validation needed, but it's good practice)
        const community = character.species?.community;
        if (community && community.discordGuildId !== event.discordGuildId) {
          this.logger.warn(
            `Character's community Discord guild (${community.discordGuildId}) doesn't match event guild (${event.discordGuildId})`,
          );
        }

        span.setAttributes({
          'prize.community_id': community?.id,
          'prize.community_name': community?.name,
        });

        // Step 4: Transfer ownership using PendingOwnershipService
        // This will auto-claim if Discord account is already linked, or create pending ownership
        const result = await this.pendingOwnershipService.createForCharacter(
          event.characterId,
          ExternalAccountProvider.DISCORD,
          event.discordUserId,
        );

        if (result.claimed) {
          span.setAttributes({
            'prize.auto_claimed': true,
            'prize.owner_id': result.ownerId,
          });

          this.logger.log(
            `✅ Character ${character.name} auto-claimed by user ${result.ownerId} (Discord account already linked)`,
          );
        } else {
          span.setAttributes({
            'prize.auto_claimed': false,
            'prize.pending_ownership_id': result.pendingOwnership?.id,
          });

          this.logger.log(
            `✅ Created pending ownership for character ${character.name}. Will be claimed when Discord user ${event.discordUserId} links their account.`,
          );
        }

        span.setStatus({ code: SpanStatusCode.OK });
      });
    } catch (error) {
      this.logger.error(`Error handling character prize: ${error.message}`, error.stack);
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}
