import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsResolver } from "./notifications.resolver";

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [NotificationsService, NotificationsResolver],
  // Exported for the producers. Every feature that wants to tell someone
  // something imports this module and calls the service; nothing writes the
  // table directly, so the payload validation cannot be bypassed.
  exports: [NotificationsService],
})
export class NotificationsModule {}
