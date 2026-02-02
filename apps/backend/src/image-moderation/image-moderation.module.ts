import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { ImageModerationService } from './image-moderation.service';
import { ImageModerationResolver } from './image-moderation.resolver';

@Module({
  imports: [DatabaseModule, AuthModule, EmailModule],
  providers: [ImageModerationService, ImageModerationResolver],
  exports: [ImageModerationService],
})
export class ImageModerationModule {}
