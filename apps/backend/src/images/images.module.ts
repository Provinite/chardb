import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { TagsModule } from "../tags/tags.module";
import { AuthModule } from "../auth/auth.module";
import { ImagesService } from "./images.service";
import { ImagesResolver } from "./images.resolver";
import { ImagesController } from "./images.controller";
import { S3Service } from "./s3.service";

@Module({
  // `AuthModule` is deferred because this module is now part of a cycle:
  // UsersModule -> ImagesModule -> AuthModule -> UsersModule. The reference
  // needs deferring at the ES-module level too, not just for Nest -- without
  // it `AuthModule` is still undefined when this file evaluates, and the app
  // fails to boot with "the module at index [2] is undefined".
  imports: [DatabaseModule, TagsModule, forwardRef(() => AuthModule)],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesResolver, S3Service],
  exports: [ImagesService, S3Service],
})
export class ImagesModule {}
