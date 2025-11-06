import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PrizeEventDto, PrizeEventType } from './dto/prize-event.dto';
import { ItemPrizeHandler } from './handlers/item-prize.handler';
import { CharacterPrizeHandler } from './handlers/character-prize.handler';

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private readonly tracer = trace.getTracer('chardb-queue-consumer', '1.0.0');
  private sqsClient: SQSClient;
  private queueUrl: string;
  private isPolling = false;
  private pollingIntervalId?: NodeJS.Timeout;
  private readonly maxMessages = 5;
  private readonly waitTimeSeconds = 5;
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly itemPrizeHandler: ItemPrizeHandler,
    private readonly characterPrizeHandler: CharacterPrizeHandler,
  ) {
    const awsRegion = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.queueUrl = this.configService.get<string>('AWS_SQS_QUEUE_URL', '');
    this.enabled = this.configService.get<boolean>('AWS_SQS_ENABLED', true);

    this.sqsClient = new SQSClient({
      region: awsRegion,
      // Credentials automatically loaded from ECS task role or local AWS config
    });

    this.logger.log(`🔧 Queue consumer initialized with region: ${awsRegion}`);
    if (!this.enabled) {
      this.logger.warn('⚠️  Queue consumer is DISABLED (AWS_SQS_ENABLED=false)');
    }
    if (!this.queueUrl) {
      this.logger.warn('⚠️  AWS_SQS_QUEUE_URL not configured');
    }
  }

  async onModuleInit() {
    if (this.enabled && this.queueUrl) {
      this.startPolling();
    } else {
      this.logger.warn('Queue consumer not started - disabled or missing queue URL');
    }
  }

  async onModuleDestroy() {
    await this.stopPolling();
  }

  private startPolling() {
    if (this.isPolling) {
      this.logger.warn('Polling already started');
      return;
    }

    this.isPolling = true;
    this.logger.log(`🚀 Starting to poll SQS queue: ${this.queueUrl}`);

    // Start polling immediately and then continue at intervals
    this.poll();
  }

  private async stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.logger.log('🛑 Stopping queue consumer...');
    this.isPolling = false;

    if (this.pollingIntervalId) {
      clearTimeout(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }

    this.logger.log('✅ Queue consumer stopped');
  }

  private async poll() {
    if (!this.isPolling) {
      return;
    }

    const span = this.tracer.startSpan('sqs.poll', {
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'aws_sqs',
        'messaging.destination': this.queueUrl,
        'messaging.operation': 'receive',
      },
    });

    try {
      await context.with(trace.setSpan(context.active(), span), async () => {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: this.maxMessages,
          WaitTimeSeconds: this.waitTimeSeconds,
          MessageAttributeNames: ['All'],
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          span.setAttributes({
            'messaging.message_count': response.Messages.length,
          });

          this.logger.log(`📨 Received ${response.Messages.length} message(s)`);

          // Process all messages in parallel
          await Promise.all(
            response.Messages.map((message) => this.processMessage(message)),
          );
        }

        span.setStatus({ code: SpanStatusCode.OK });
      });
    } catch (error) {
      this.logger.error(`Error polling SQS queue: ${error.message}`, error.stack);
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } finally {
      span.end();

      // Schedule next poll
      if (this.isPolling) {
        this.pollingIntervalId = setTimeout(() => this.poll(), 100);
      }
    }
  }

  private async processMessage(message: Message) {
    const messageSpan = this.tracer.startSpan('sqs.process_message', {
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'aws_sqs',
        'messaging.message_id': message.MessageId,
        'messaging.destination': this.queueUrl,
      },
    });

    try {
      await context.with(trace.setSpan(context.active(), messageSpan), async () => {
        this.logger.log(`Processing message: ${message.MessageId}`);

        // Parse and validate message body
        const prizeEvent = await this.parseAndValidateMessage(message);

        messageSpan.setAttributes({
          'prize.event_type': prizeEvent.eventType,
          'prize.discord_guild_id': prizeEvent.discordGuildId,
          'prize.discord_user_id': prizeEvent.discordUserId,
        });

        // Route to appropriate handler
        await this.handlePrizeEvent(prizeEvent);

        // Delete message from queue on success
        await this.deleteMessage(message);

        messageSpan.setStatus({ code: SpanStatusCode.OK });
        this.logger.log(`✅ Successfully processed message: ${message.MessageId}`);
      });
    } catch (error) {
      this.logger.error(
        `❌ Error processing message ${message.MessageId}: ${error.message}`,
        error.stack,
      );

      messageSpan.recordException(error);
      messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

      // Check if this is a permanent error (validation, not found, etc.)
      // vs transient error (network, database timeout)
      if (this.isPermanentError(error)) {
        this.logger.error(
          `🚫 Permanent error detected, deleting message to send to DLQ: ${message.MessageId}`,
        );
        // Delete message so it goes to DLQ after max retries
        // Actually, we should NOT delete it here - let SQS handle retries and DLQ
        // The message will be retried based on visibility timeout and eventually go to DLQ
      } else {
        this.logger.warn(
          `🔄 Transient error, message will be retried: ${message.MessageId}`,
        );
        // Don't delete - let the message become visible again for retry
      }
    } finally {
      messageSpan.end();
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

  private async handlePrizeEvent(event: PrizeEventDto) {
    switch (event.eventType) {
      case PrizeEventType.ITEM_AWARDED:
        await this.itemPrizeHandler.handle(event);
        break;
      case PrizeEventType.CHARACTER_AWARDED:
        await this.characterPrizeHandler.handle(event);
        break;
      default:
        throw new Error(`Unknown event type: ${event.eventType}`);
    }
  }

  private async deleteMessage(message: Message) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    });

    await this.sqsClient.send(command);
  }

  private isPermanentError(error: any): boolean {
    // Permanent errors that should not be retried
    const permanentErrorMessages = [
      'not found',
      'validation failed',
      'already exists',
      'invalid',
      'not allowed',
      'forbidden',
      'unauthorized',
      'bad request',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return permanentErrorMessages.some((msg) => errorMessage.includes(msg));
  }
}
