import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsResolver } from "./notifications.resolver";

// Deliberately does not import AuthModule, unlike most feature modules.
// Producers live inside SocialModule and friends, which AuthModule already
// reaches through UsersModule, so importing it here closes a cycle and Nest
// fails to boot. Nothing is lost: `@AllowAnyAuthenticated` is metadata read by
// the global guard, which main.ts resolves from the root module.
@Module({
  imports: [DatabaseModule],
  providers: [NotificationsService, NotificationsResolver],
  // Exported for the producers. Every feature that wants to tell someone
  // something imports this module and calls the service; nothing writes the
  // table directly, so the payload validation cannot be bypassed.
  exports: [NotificationsService],
})
export class NotificationsModule {}
