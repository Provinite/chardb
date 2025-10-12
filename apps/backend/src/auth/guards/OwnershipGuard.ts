import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DatabaseService } from "../../database/database.service";
import { getUserFromContext } from "../utils/get-user-from-context";
import { AllowEntityOwner } from "../decorators/AllowEntityOwner";
import {
  OwnershipResolutionConfig,
  OwnershipResolutionReference,
} from "../types/OwnershipResolutionConfig";
import { getNestedValue } from "../../common/utils/getNestedValue";

/**
 * Generic guard that checks if the current user owns an entity or has identity relationship.
 *
 * Works with {@link AllowEntityOwner} decorator.
 *
 * Resolves the entity ID from arguments, fetches the entity from Prisma,
 * and verifies ownership/identity:
 * - Character: entity.ownerId === currentUser.id
 * - Media: entity.ownerId === currentUser.id
 * - Gallery: entity.ownerId === currentUser.id
 * - Image: entity.uploaderId === currentUser.id
 * - CommunityInvitation (invitee): entity.inviteeId === currentUser.id
 * - CommunityInvitation (inviter OR invitee): entity.inviterId === currentUser.id || entity.inviteeId === currentUser.id
 * - Comment: entity.authorId === currentUser.id
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private prisma: DatabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = getUserFromContext(context);
    if (!user) {
      return false;
    }

    const config = this.reflector.getAllAndOverride(AllowEntityOwner, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config) {
      return false;
    }

    const resolvedIds = this.resolveEntityIds(context, config);
    if (!resolvedIds.type || !resolvedIds.value) {
      return false;
    }

    // Determine entity type from the resolved key
    const entityType = this.getEntityType(resolvedIds.type);
    if (!entityType) {
      return false;
    }

    // Fetch entity and check ownership based on type
    return this.checkOwnership(entityType, resolvedIds.value, user.id);
  }

  private getEntityType(
    key: keyof OwnershipResolutionConfig,
  ):
    | "character"
    | "media"
    | "gallery"
    | "image"
    | "inviteeOfInvitation"
    | "inviterOrInviteeOfInvitation"
    | "comment"
    | null {
    if (key === "characterId") return "character";
    if (key === "mediaId") return "media";
    if (key === "galleryId") return "gallery";
    if (key === "imageId") return "image";
    if (key === "inviteeOfInvitationId") return "inviteeOfInvitation";
    if (key === "inviterOrInviteeOfInvitationId")
      return "inviterOrInviteeOfInvitation";
    if (key === "commentId") return "comment";
    return null;
  }

  private async checkOwnership(
    entityType:
      | "character"
      | "media"
      | "gallery"
      | "image"
      | "inviteeOfInvitation"
      | "inviterOrInviteeOfInvitation"
      | "comment",
    entityId: string,
    userId: string,
  ): Promise<boolean> {
    switch (entityType) {
      case "character": {
        const character = await this.prisma.character.findUnique({
          where: { id: entityId },
          select: { ownerId: true },
        });
        return character?.ownerId === userId;
      }

      case "media": {
        const media = await this.prisma.media.findUnique({
          where: { id: entityId },
          select: { ownerId: true },
        });
        return media?.ownerId === userId;
      }

      case "gallery": {
        const gallery = await this.prisma.gallery.findUnique({
          where: { id: entityId },
          select: { ownerId: true },
        });
        return gallery?.ownerId === userId;
      }

      case "image": {
        const image = await this.prisma.image.findUnique({
          where: { id: entityId },
          select: { uploaderId: true },
        });
        return image?.uploaderId === userId;
      }

      case "inviteeOfInvitation": {
        const invitation = await this.prisma.communityInvitation.findUnique({
          where: { id: entityId },
          select: { inviteeId: true },
        });
        return invitation?.inviteeId === userId;
      }

      case "inviterOrInviteeOfInvitation": {
        const invitation = await this.prisma.communityInvitation.findUnique({
          where: { id: entityId },
          select: { inviterId: true, inviteeId: true },
        });
        return (
          invitation?.inviterId === userId || invitation?.inviteeId === userId
        );
      }

      case "comment": {
        const comment = await this.prisma.comment.findUnique({
          where: { id: entityId },
          select: { authorId: true },
        });
        return comment?.authorId === userId;
      }

      default:
        return false;
    }
  }

  private resolveEntityIds(
    context: ExecutionContext,
    config: OwnershipResolutionConfig,
  ): OwnershipResolutionReference {
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs();

    for (const [key, path] of Object.entries(config)) {
      if (path) {
        const value = getNestedValue(args, path);
        if (value) {
          return { type: key as keyof OwnershipResolutionConfig, value };
        }
      }
    }

    return { type: null, value: null };
  }
}
