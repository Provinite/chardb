/** Prisma where-clause fragment that excludes soft-deleted characters. */
export const notDeleted = { deletedAt: null } as const;
