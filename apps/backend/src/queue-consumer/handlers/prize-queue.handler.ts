import { Injectable, Logger } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { Message } from '@aws-sdk/client-sqs';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PrizeEventDto, PrizeEventType } from '../dto/prize-event.dto';
import { ItemPrizeHandler } from './item-prize.handler';
import { CharacterPrizeHandler } from './character-prize.handler';

@Injectable()
export class PrizeQueueHandler {
  private readonly logger = new Logger(PrizeQueueHandler.name);
  private readonly tracer = trace.getTracer('chardb-prize-queue', '1.0.0');

  constructor(
    private readonly itemPrizeHandler: ItemPrizeHandler,
    private readonly characterPrizeHandler: CharacterPrizeHandler,
  ) {}

  @SqsMessageHandler('prize-distribution', false)
  async handleMessage(message: Message) {
    const span = this.tracer.startSpan('sqs.process_message', {
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'aws_sqs',
        'messaging.message_id': message.MessageId,
        'messaging.operation': 'process',
      },
    });

    try {
      await context.with(trace.setSpan(context.active(), span), async () => {
        this.logger.log(`Processing message: ${message.MessageId}`);

        // Parse and validate message body
        const prizeEvent = await this.parseAndValidateMessage(message);

        span.setAttributes({
          'prize.event_type': prizeEvent.eventType,
          'prize.discord_guild_id': prizeEvent.discordGuildId,
          'prize.discord_user_id': prizeEvent.discordUserId,
        });

        // Route to appropriate handler based on event type
        switch (prizeEvent.eventType) {
          case PrizeEventType.ITEM_AWARDED:
            await this.itemPrizeHandler.handle(prizeEvent);
            break;
          case PrizeEventType.CHARACTER_AWARDED:
            await this.characterPrizeHandler.handle(prizeEvent);
            break;
          default:
            throw new Error(`Unknown event type: ${prizeEvent.eventType}`);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        this.logger.log(`✅ Successfully processed message: ${message.MessageId}`);
      });
    } catch (error) {
      this.logger.error(
        `❌ Error processing message ${message.MessageId}: ${error.message}`,
        error.stack,
      );

      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

      // Re-throw to let SQS handle retries and DLQ
      throw error;
    } finally {
      span.end();
    }
  }

  private async parseAndValidateMessage(message: Message): Promise<PrizeEventDto> {
    if (!message.Body) {
      throw new Error('Message body is empty');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(message.Body);
    } catch (error) {
      throw new Error(`Invalid JSON in message body: ${error.message}`);
    }

    // Convert plain object to DTO class instance
    const prizeEvent = plainToClass(PrizeEventDto, parsed);

    // Validate DTO
    const errors = await validate(prizeEvent);
    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('; ');
      throw new Error(`Message validation failed: ${errorMessages}`);
    }

    return prizeEvent;
  }
}
