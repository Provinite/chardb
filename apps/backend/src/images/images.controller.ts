import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ImagesService } from "./images.service";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";

@Controller("images")
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @AllowAnyAuthenticated()
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const uploadInput = {
      file,
      characterId: body.characterId,
      galleryId: body.galleryId,
      description: body.description,
      altText: body.altText,
      isNsfw: body.isNsfw === "true",
      visibility: body.visibility,
      sensitiveContentDescription: body.sensitiveContentDescription,
    };

    return this.imagesService.upload(req.user.id, uploadInput);
  }
}
