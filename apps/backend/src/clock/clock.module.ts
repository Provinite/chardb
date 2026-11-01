import { Module } from "@nestjs/common";
import { Clock } from "./clock";

/** The one `Clock`. Import this module; never list `Clock` as a provider. */
@Module({
  providers: [Clock],
  exports: [Clock],
})
export class ClockModule {}
