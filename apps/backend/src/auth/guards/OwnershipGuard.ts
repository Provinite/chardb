import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getUserFromContext } from "../utils/get-user-from-context";
import { AllowEntityOwner } from "../decorators/AllowEntityOwner";
import {
  OwnershipResolutionConfig,
  OwnershipResolutionReference,
} from "../types/OwnershipResolutionConfig";
import { resolveGuardPath } from "../utils/resolve-guard-path";
import { OwnershipService } from "../OwnershipService";

/**
 * Generic guard that checks if the current user owns an entity or has identity relationship.
 *
 * Works with {@link AllowEntityOwner} decorator.
 *
 * Resolves the entity ID from arguments and verifies ownership via OwnershipService:
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
    private ownershipService: OwnershipService,
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

    return this.ownershipService.isOwnerOf(
      user.id,
      entityType,
      resolvedIds.value,
    );
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

  private resolveEntityIds(
    context: ExecutionContext,
    config: OwnershipResolutionConfig,
  ): OwnershipResolutionReference {
    for (const [key, path] of Object.entries(config)) {
      if (path) {
        const value = resolveGuardPath(context, path);
        if (value) {
          return {
            type: key as keyof OwnershipResolutionConfig,
            value: value as string,
          };
        }
      }
    }

    return { type: null, value: null };
  }
}
