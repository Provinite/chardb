import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

/**
 * Service for checking entity ownership.
 *
 * This service centralizes logic for determining if a user owns
 * or has identity relationships with various entities.
 */
@Injectable()
export class OwnershipService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Check if a user owns a specific entity.
   *
   * Supported entity types and their ownership fields:
   * - character: ownerId
   * - media: ownerId
   * - gallery: ownerId
   * - image: uploaderId
   * - comment: authorId
   * - inviteeOfInvitation: inviteeId
   * - inviterOrInviteeOfInvitation: inviterId OR inviteeId
   *
   * @param userId - The user ID to check ownership for
   * @param entityType - The type of entity
   * @param entityId - The entity ID
   * @returns True if user owns the entity, false otherwise
   *
   * @example
   * ```typescript
   * const isOwner = await ownershipService.isOwnerOf(
   *   user.id,
   *   'character',
   *   characterId
   * );
   * ```
   */
  async isOwnerOf(
    userId: string,
    entityType:
      | "character"
      | "media"
      | "gallery"
      | "image"
      | "inviteeOfInvitation"
      | "inviterOrInviteeOfInvitation"
      | "comment",
    entityId: string,
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

  /**
   * Resolve the owner ID for a given entity.
   *
   * @param entityType - The type of entity
   * @param entityId - The entity ID
   * @returns The owner ID or null if entity doesn't exist
   *
   * @example
   * ```typescript
   * const ownerId = await ownershipService.resolveEntityOwner(
   *   'character',
   *   characterId
   * );
   * ```
   */
  async resolveEntityOwner(
    entityType: "character" | "media" | "gallery" | "image" | "comment",
    entityId: string,
  ): Promise<string | null> {
    switch (entityType) {
      case "character": {
        const character = await this.prisma.character.findUnique({
          where: { id: entityId },
          select: { ownerId: true },
        });
        return character?.ownerId ?? null;
      }

      case "media": {
        const media = await this.prisma.media.findUnique({
          where: { id: entityId },
          select: { ownerId: true },
        });
        return media?.ownerId ?? null;
      }

      case "gallery": {
        const gallery = await this.prisma.gallery.findUnique({
          where: { id: entityId },
          select: { ownerId: true },
        });
        return gallery?.ownerId ?? null;
      }

      case "image": {
        const image = await this.prisma.image.findUnique({
          where: { id: entityId },
          select: { uploaderId: true },
        });
        return image?.uploaderId ?? null;
      }

      case "comment": {
        const comment = await this.prisma.comment.findUnique({
          where: { id: entityId },
          select: { authorId: true },
        });
        return comment?.authorId ?? null;
      }

      default:
        return null;
    }
  }
}
