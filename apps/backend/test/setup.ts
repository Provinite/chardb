import { Test } from "@nestjs/testing";
import { DatabaseService } from "../src/database/database.service";
import type { AuthenticatedCurrentUserType } from "../src/auth/types/current-user.type";

// Mock Prisma Client for testing
const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  character: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  itemUsePayout: {
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  characterOwnershipChange: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  traitReview: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  trait: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  enumValue: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  characterTag: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  imageTag: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  image: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  gallery: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  tag: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  comment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  like: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  follow: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  externalAccount: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  media: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  imageModerationAction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  itemType: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  item: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  itemTransaction: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  communityMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  currency: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  currencyBalance: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  currencyTransaction: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  trade: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  tradeItem: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  tradeCharacter: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  tradeCurrencyLine: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  pendingOwnership: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Wire up $transaction to support both forms Prisma offers, because the
// codebase uses both: the interactive callback form (which gets the mock
// itself as its tx client) and the array form (which resolves the promises it
// was handed). A mock that only knew the callback form failed any test whose
// code path used the other one, with an error about the array not being a
// function.
//
// jest.clearAllMocks() only clears call history, not implementations, so this
// persists across tests.
mockPrismaService.$transaction.mockImplementation(
  (
    arg:
      | ((prisma: typeof mockPrismaService) => unknown)
      | Array<Promise<unknown>>,
  ) =>
    typeof arg === "function" ? arg(mockPrismaService) : Promise.all(arg ?? []),
);

// Global test utilities
export const createTestingModule = async (providers = []) => {
  return Test.createTestingModule({
    providers: [
      {
        provide: DatabaseService,
        useValue: mockPrismaService,
      },
      ...providers,
    ],
  }).compile();
};

export const mockDatabaseService = mockPrismaService;

/**
 * A complete user row, as the JWT strategy hands one to `@CurrentUser()`.
 *
 * `AuthenticatedCurrentUserType` is the whole Prisma row -- the strategy
 * returns whatever `UsersService.findById` returns -- so a resolver that types
 * its current user honestly will not accept a partial fixture.
 *
 * Pinned with `satisfies` rather than left to inference so this fixture cannot
 * drift from the model: a new column fails here for want of a value, and a
 * removed or renamed one fails here as an unknown property. Either way the
 * error lands on this declaration instead of scattering across every spec that
 * happens to pass it.
 */
export const mockAuthUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  passwordHash: "hashed",
  displayName: "Test User",
  bio: null,
  avatarImageId: null,
  website: null,
  dateOfBirth: null,
  isVerified: true,
  isAdmin: false,
  privacySettings: {},
  canCreateCommunity: false,
  canListUsers: false,
  canListInviteCodes: false,
  canCreateInviteCode: false,
  canGrantGlobalPermissions: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies AuthenticatedCurrentUserType;

/**
 * Stand-in for NotificationsService.
 *
 * Every producer now depends on it, so a spec that constructs one of those
 * services has to provide something. Notifications are a side effect of the
 * operation under test rather than part of its result, so the default is a
 * no-op; a spec asserting that something was announced can read these mocks.
 */
export const mockNotificationsService = {
  create: jest.fn().mockResolvedValue(undefined),
  createMany: jest.fn().mockResolvedValue({ count: 0 }),
  findForRecipient: jest.fn(),
  countUnseen: jest.fn(),
  markAllSeen: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
};

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
