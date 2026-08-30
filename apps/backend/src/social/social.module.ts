import { Module } from "@nestjs/common";
import { SocialService } from "./social.service";
import {
  SocialResolver,
  CharacterLikesResolver,
  ImageLikesResolver,
  GalleryLikesResolver,
  CommentLikesResolver,
  MediaLikesResolver,
  UserFollowResolver,
} from "./social.resolver";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [
    SocialService,
    SocialResolver,
    CharacterLikesResolver,
    ImageLikesResolver,
    GalleryLikesResolver,
    CommentLikesResolver,
    MediaLikesResolver,
    UserFollowResolver,
  ],
  exports: [SocialService],
})
export class SocialModule {}
