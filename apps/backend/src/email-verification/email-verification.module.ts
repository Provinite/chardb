import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { EmailVerificationService } from "./email-verification.service";
import { EmailVerificationResolver } from "./email-verification.resolver";

// Imports the database and the mailer and nothing else. `AuthModule` imports
// this one, because signup sends the first verification mail; anything here
// reaching back up to auth would close a cycle and Nest would refuse to boot.
@Module({
  imports: [DatabaseModule, EmailModule],
  providers: [EmailVerificationService, EmailVerificationResolver],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
