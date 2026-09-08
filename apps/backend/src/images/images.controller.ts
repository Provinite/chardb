import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImagesService } from "./images.service";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { ThumbnailCrop } from "./thumbnail-crop";

/**
 * The multipart form fields this endpoint accepts.
 *
 * Every one is a string, including the booleans and the crop numbers --
 * multipart has no other type -- so none of them can be declared as the value
 * it stands for. Callers also send fields this endpoint ignores; unknown keys
 * are dropped rather than rejected, because three separate clients post here
 * and they do not agree on the set.
 */
interface UploadImageBody {
  title?: string;
  characterId?: string;
  itemTypeId?: string;
  galleryId?: string;
  communityId?: string;
  isAvatarUpload?: string;
  description?: string;
  altText?: string;
  isNsfw?: string;
  visibility?: string;
  sensitiveContentDescription?: string;
  artistType?: string;
  artistLink?: string;
  artistLabel?: string;
  thumbnailCropX?: string;
  thumbnailCropY?: string;
  thumbnailCropWidth?: string;
  thumbnailCropHeight?: string;
}

/** Only the part of the request this controller reads. */
interface AuthenticatedRequest {
  user: { id: string };
}

/**
 * Read the thumbnail crop out of its four form fields.
 *
 * All four or none. A partial rect is a 400 rather than a silent fall back to
 * the centre crop, because "the crop I chose was ignored" looks like the
 * feature being broken, not like a malformed request.
 */
function parseThumbnailCrop(body: UploadImageBody): ThumbnailCrop | undefined {
  const raw = [
    body.thumbnailCropX,
    body.thumbnailCropY,
    body.thumbnailCropWidth,
    body.thumbnailCropHeight,
  ];

  const provided = raw.filter((value) => value !== undefined && value !== "");

  if (provided.length === 0) {
    return undefined;
  }

  if (provided.length !== 4) {
    throw new BadRequestException(
      "A thumbnail crop needs all four of thumbnailCropX, thumbnailCropY, " +
        "thumbnailCropWidth and thumbnailCropHeight",
    );
  }

  const [x, y, width, height] = raw.map((value) => Number(value));

  if ([x, y, width, height].some((value) => !Number.isFinite(value))) {
    throw new BadRequestException("Thumbnail crop values must be numbers");
  }

  // Bounds are checked in the service, against the image's real dimensions.
  return { x, y, width, height };
}

@Controller("images")
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @AllowAnyAuthenticated()
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadImageBody,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const uploadInput: Parameters<ImagesService["upload"]>[1] = {
      file,
      title: body.title,
      characterId: body.characterId,
      itemTypeId: body.itemTypeId,
      galleryId: body.galleryId,
      // Which community's moderators see this, for an upload with no
      // character to answer that. The frontend sends the community whose host
      // the form was open on; the service checks the uploader belongs to it.
      communityId: body.communityId,
      // A profile picture rather than a post. Kept out of every listing; see
      // `Media.isAvatarUpload`. Only the avatar control sends it.
      isAvatarUpload: body.isAvatarUpload === "true",
      description: body.description,
      altText: body.altText,
      isNsfw: body.isNsfw === "true",
      visibility: body.visibility,
      sensitiveContentDescription: body.sensitiveContentDescription,
      artistId: body.artistType === "onsite" ? body.artistLink : undefined,
      artistName: body.artistLabel || undefined,
      artistUrl: body.artistType === "offsite" ? body.artistLink : undefined,
      thumbnailCrop: parseThumbnailCrop(body),
    };

    return this.imagesService.upload(req.user.id, uploadInput);
  }
}
