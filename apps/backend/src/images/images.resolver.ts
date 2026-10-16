import { Resolver, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowEntityOwner } from "../auth/decorators/AllowEntityOwner";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { ImagesService } from "./images.service";
import { Image as ImageEntity } from "./entities/image.entity";
import { UpdateImageInput } from "./dto/image.dto";
import { cropFromColumns } from "./thumbnail-crop";

@Resolver(() => ImageEntity)
export class ImagesResolver {
  constructor(private readonly imagesService: ImagesService) {}

  // Note: File upload is handled via REST endpoint /images/upload
  //
  // There are no image *queries* here any more. Six of them -- `images`,
  // `image`, `myImages`, `userImages`, `characterImages` and `galleryImages`
  // -- were deliberately left undecorated to block them, on the reasoning that
  // no permission decorator means no access. It worked, but it left the
  // codebase unable to tell a query blocked on purpose from a field somebody
  // forgot to annotate, which is how `Comment.likesCount` went unnoticed
  // (#310). Nothing selected any of the six. Deleting them says the same thing
  // in a way a reader and a test can both check. Media queries are the
  // supported way to read images.

  @AllowGlobalAdmin()
  @AllowEntityOwner({ imageId: "id" })
  @Mutation(() => ImageEntity)
  async updateImage(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateImageInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ) {
    const image = await this.imagesService.update(id, user.id, input);

    // The service hands back the Prisma row, which carries the crop as four
    // loose columns. Fold them into the shape the schema declares so a client
    // can read its own framing back out of the mutation it just sent.
    return { ...image, thumbnailCrop: cropFromColumns(image) };
  }

  // `deleteImage` was here and is gone. Nothing called it -- no frontend
  // document, no spec, no other resolver -- and what it did was delete the
  // Image row while leaving all three S3 objects behind, because it never
  // went near `cleanupOrphanedImage`. An unreachable mutation that leaks
  // storage is worse than no mutation. Deleting media is the supported way to
  // delete a picture, and it cleans up after itself.

  // Image tag mutations removed - tags should be managed on Media entries instead
}
