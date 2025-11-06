# SQS Queue Consumer for Discord Bot Prize Distribution

This module implements an SQS queue consumer that processes prize distribution events from a Discord bot. It handles awarding items and transferring character ownership to Discord users.

## Overview

The queue consumer:
- Polls an SQS queue for prize distribution messages
- Validates and routes messages to appropriate handlers
- Awards items or transfers character ownership
- Supports pending ownership for users who haven't linked Discord accounts
- Includes OpenTelemetry tracing for observability
- Implements retry logic with exponential backoff via SQS

## Architecture

```
Discord Bot → SQS Queue → Backend Consumer → Database
                ↓
             Dead Letter Queue (after 3 retries)
```

### Components

- **QueueConsumerService**: Main service that polls SQS and routes messages
- **ItemPrizeHandler**: Handles `ITEM_AWARDED` events
- **CharacterPrizeHandler**: Handles `CHARACTER_AWARDED` events
- **PrizeEventDto**: Message validation schema

## Message Format

Messages must be valid JSON with the following structure:

```typescript
{
  eventType: 'ITEM_AWARDED' | 'CHARACTER_AWARDED',
  discordGuildId: string,      // Discord server ID
  discordUserId: string,        // Discord user ID (numeric)

  // For ITEM_AWARDED:
  itemTypeId?: string,
  quantity?: number,            // Defaults to 1

  // For CHARACTER_AWARDED:
  characterId?: string
}
```

### Example Messages

**Item Award:**
```json
{
  "eventType": "ITEM_AWARDED",
  "discordGuildId": "123456789012345678",
  "discordUserId": "987654321098765432",
  "itemTypeId": "cluid123abc",
  "quantity": 5
}
```

**Character Award:**
```json
{
  "eventType": "CHARACTER_AWARDED",
  "discordGuildId": "123456789012345678",
  "discordUserId": "987654321098765432",
  "characterId": "cluid456def"
}
```

## Processing Logic

### ITEM_AWARDED

1. Lookup community by `discordGuildId`
2. Validate `itemTypeId` exists and belongs to community
3. Grant item using `ItemsService.grantItem()`
   - Auto-claims if Discord account already linked
   - Creates pending ownership if not linked
   - Auto-stacks if item is stackable

### CHARACTER_AWARDED

1. Lookup character by `characterId`
2. Verify character is orphaned (`ownerId = null`)
3. Transfer ownership using `PendingOwnershipService.createForCharacter()`
   - Auto-claims if Discord account already linked
   - Creates pending ownership if not linked

## Error Handling

### Permanent Errors (sent to DLQ)
- Validation failures
- Not found errors (community, item type, character)
- Character already owned
- Bad request errors

### Transient Errors (retried)
- Network failures
- Database timeouts
- Temporary AWS service issues

Messages are retried up to 3 times before being sent to the Dead Letter Queue.

## Configuration

### Environment Variables

```bash
# Required
AWS_SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue-name
AWS_REGION=us-east-1

# Optional
AWS_SQS_ENABLED=true  # Set to false to disable consumer
```

### Queue Parameters

- **MaxMessages**: 5 messages per poll
- **WaitTimeSeconds**: 5 seconds (short polling)
- **VisibilityTimeout**: 30 seconds
- **MaxReceiveCount**: 3 retries before DLQ

## Infrastructure

The SQS queue infrastructure is managed via Terraform:

```
infra/modules/sqs-queue/        # Reusable SQS module
apps/backend/infra/main.tf      # Backend-specific configuration
```

### Resources Created

- SQS Queue: `{project}-prize-distribution-{env}`
- Dead Letter Queue: `{project}-prize-distribution-{env}-dlq`
- IAM Policy (Consumer): Allows receive/delete from queue
- IAM Policy (Producer): Allows send to queue for Discord bot
- CloudWatch Alarm: Alerts when messages in DLQ

### IAM Permissions

The backend EC2 instance role is automatically attached to the consumer policy, granting:
- `sqs:ReceiveMessage`
- `sqs:DeleteMessage`
- `sqs:GetQueueAttributes`

## Observability

### OpenTelemetry Tracing

All message processing is traced with spans:
- `sqs.poll`: Polling operation
- `sqs.process_message`: Individual message processing
- `handle_item_prize`: Item award handler
- `handle_character_prize`: Character transfer handler

View traces in Jaeger: http://localhost:16686

### Logging

Logs include:
- Message receipt
- Processing success/failure
- Error details with stack traces
- Retry attempts

## Development

### Local Testing

1. **Disable consumer in local dev:**
   ```bash
   AWS_SQS_ENABLED=false
   ```

2. **Use LocalStack for local SQS:**
   ```bash
   # In docker-compose.yml
   localstack:
     image: localstack/localstack
     ports:
       - "4566:4566"
     environment:
       - SERVICES=sqs

   # In .env
   AWS_SQS_QUEUE_URL=http://localhost:4566/000000000000/test-queue
   ```

3. **Create local queue:**
   ```bash
   aws --endpoint-url=http://localhost:4566 sqs create-queue \
     --queue-name test-prize-distribution
   ```

4. **Send test message:**
   ```bash
   aws --endpoint-url=http://localhost:4566 sqs send-message \
     --queue-url http://localhost:4566/000000000000/test-prize-distribution \
     --message-body '{
       "eventType": "ITEM_AWARDED",
       "discordGuildId": "123",
       "discordUserId": "456",
       "itemTypeId": "abc",
       "quantity": 1
     }'
   ```

## Deployment

1. **Apply Terraform infrastructure:**
   ```bash
   cd apps/backend/infra
   terraform init
   terraform apply
   ```

2. **Note the queue URL from outputs:**
   ```bash
   terraform output sqs_queue_url
   ```

3. **Update environment variables in deployment**

4. **Deploy backend with updated code**

## Monitoring

### Key Metrics to Monitor

- **Queue Depth**: Number of messages in queue
- **Processing Rate**: Messages processed per minute
- **Error Rate**: Failed message percentage
- **DLQ Depth**: Messages in dead letter queue (should be 0)

### CloudWatch Alarms

Automatically created alarm:
- **DLQ Messages**: Alerts when any message enters DLQ

## Discord Bot Integration

The Discord bot must:
1. Have IAM credentials with producer policy attached
2. Send messages to the queue URL
3. Ensure messages match the schema exactly
4. Always send numeric Discord user IDs (not usernames)

### Bot IAM Policy ARN

Available in Terraform outputs:
```bash
terraform output sqs_producer_policy_arn
```

Attach this policy to the Discord bot's IAM role or user.

## Troubleshooting

### Consumer not starting

Check:
- `AWS_SQS_ENABLED=true` in environment
- `AWS_SQS_QUEUE_URL` is configured
- Backend instance has consumer policy attached
- Queue exists in AWS

### Messages not being processed

Check:
- Messages match the exact schema
- Discord guild has associated community in database
- Item types/characters exist
- Application logs for errors

### Messages in DLQ

Check DLQ messages to see error details:
```bash
aws sqs receive-message --queue-url <DLQ_URL> \
  --attribute-names All --message-attribute-names All
```

Common causes:
- Invalid data (wrong IDs, missing fields)
- Character already owned
- Community not found for guild

## Future Enhancements

Potential improvements:
- Batch processing for higher throughput
- Message deduplication
- Priority queues for different prize types
- Analytics and reporting on prize distribution
- Admin UI for DLQ management
