import { Module } from "@nestjs/common";
import { LoadersService } from "./loaders.service";

/**
 * Imported by each feature module whose resolvers load through it, rather
 * than global, so a test compiling one feature module still resolves it.
 */
@Module({
  providers: [LoadersService],
  exports: [LoadersService],
})
export class DataLoadersModule {}
