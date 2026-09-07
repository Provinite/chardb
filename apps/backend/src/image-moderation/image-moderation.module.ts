import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CurrenciesModule } from "../currencies/currencies.module";
import { MediaModule } from "../media/media.module";
import { ImageModerationService } from "./image-moderation.service";
import {
  ImageModerationResolver,
  ImageModerationActionFieldsResolver,
} from "./image-moderation.resolver";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    NotificationsModule,
    MediaModule,
    CurrenciesModule,
  ],
  providers: [
    ImageModerationService,
    ImageModerationResolver,
    ImageModerationActionFieldsResolver,
  ],
  exports: [ImageModerationService],
})
export class ImageModerationModule {}
