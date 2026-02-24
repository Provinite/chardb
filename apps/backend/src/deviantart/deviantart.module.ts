import { Module } from "@nestjs/common";
import { DeviantArtService } from "./deviantart.service";

@Module({
  providers: [DeviantArtService],
  exports: [DeviantArtService],
})
export class DeviantArtModule {}
