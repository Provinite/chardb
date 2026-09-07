import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationPreferencesResolver } from "./notification-preferences.resolver";

// Imports nothing but the database, for the same reason NotificationsModule
// does not import AuthModule: this module sits underneath the producers, and
// NotificationsModule imports it. Anything reaching back up would close a cycle
// and Nest would refuse to boot.
@Module({
  imports: [DatabaseModule],
  providers: [NotificationPreferencesService, NotificationPreferencesResolver],
  exports: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}
