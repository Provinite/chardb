import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DatabaseService } from "../../database/database.service";
import { PermissionService } from "../PermissionService";
import { CommunityResolverService } from "../services/community-resolver.service";
import { getUserFromContext } from "../utils/get-user-from-context";
import { getNestedValue } from "../../common/utils/getNestedValue";
import { AllowCharacterEditor } from "../decorators/AllowCharacterEditor";
import { CommunityPermission } from "../CommunityPermission";

/**
 * Guard that checks character edit permissions based on ownership.
 *
 * Works with @AllowCharacterEditor() decorator.
 *
 * Permission logic:
 * - If user owns the character: requires ANY of:
 *   - canEditOwnCharacter (profile fields)
 *   - canEditOwnCharacterRegistry (registry fields)
 *   - canEditCharacter (any profile fields)
 *   - canEditCharacterRegistry (any registry fields)
 * - If user does not own the character: requires ANY of:
 *   - canEditCharacter (any profile fields)
 *   - canEditCharacterRegistry (any registry fields)
 * - Permissions are resolved via character→species→community
 *
 * Field-level validation happens in the service layer.
 */
@Injectable()
export class CharacterEditGuard implements CanActivate {
  constructor(
    private prisma: DatabaseService,
    private permissionService: PermissionService,
    private communityResolverService: CommunityResolverService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = getUserFromContext(context);
    if (!user) {
      return false;
    }

    const config = this.reflector.getAllAndOverride(AllowCharacterEditor, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config || !config.characterId) {
      return false;
    }

    // Resolve character ID from arguments
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs();
    const characterId = getNestedValue(args, config.characterId);

    if (!characterId) {
      return false;
    }

    // Fetch character with species info
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        ownerId: true,
        speciesId: true,
      },
    });

    if (!character) {
      return false;
    }

    const isOrphaned = character.ownerId === null;

    // Handle orphaned characters (no owner)
    if (isOrphaned) {
      // Orphaned characters without species cannot be edited
      if (!character.speciesId) {
        return false;
      }

      // Resolve community from species
      const resolvedIds = {
        type: "speciesId" as const,
        value: character.speciesId,
      };
      const community =
        await this.communityResolverService.resolve(resolvedIds);

      if (!community) {
        return false;
      }

      // For orphaned characters, check if user has permission to manage orphaned characters
      // OR has any character edit permission (profile or registry)
      const permissions =
        await this.permissionService.getCommunityPermissions(
          user.id,
          community.id,
        );

      return !!(
        permissions.canCreateOrphanedCharacter ||
        permissions.canEditCharacter ||
        permissions.canEditCharacterRegistry
      );
    }

    // Handle owned characters (existing logic)
    const isOwner = character.ownerId === user.id;

    // If no species, only owner can edit
    if (!character.speciesId) {
      return isOwner;
    }

    // Resolve community from species
    const resolvedIds = {
      type: "speciesId" as const,
      value: character.speciesId,
    };
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      // No community means only owner can edit
      return isOwner;
    }

    // Check if user has ANY character edit permission (profile OR registry)
    // Field-level validation happens in the service layer
    const permissions = await this.permissionService.getCommunityPermissions(
      user.id,
      community.id,
    );

    if (isOwner) {
      // Owner can edit if they have any own-character or any-character permission
      return !!(
        permissions.canEditOwnCharacter ||
        permissions.canEditOwnCharacterRegistry ||
        permissions.canEditCharacter ||
        permissions.canEditCharacterRegistry
      );
    } else {
      // Non-owner needs an "any character" permission
      return !!(
        permissions.canEditCharacter || permissions.canEditCharacterRegistry
      );
    }
  }
}
