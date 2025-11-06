import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { DiscordService } from "./discord.service";

// Create mock classes
const mockRestSetToken = jest.fn().mockReturnThis();
const mockRestInstance = {
  setToken: mockRestSetToken,
};

const mockApiUsersGet = jest.fn();
const mockApiGuildsGet = jest.fn();
const mockApiGuildsSearchForMembers = jest.fn();

const mockApiInstance = {
  users: {
    get: mockApiUsersGet,
  },
  guilds: {
    get: mockApiGuildsGet,
    searchForMembers: mockApiGuildsSearchForMembers,
  },
};

// Mock the @discordjs modules
jest.mock("@discordjs/rest", () => ({
  REST: jest.fn().mockImplementation(() => mockRestInstance),
}));

jest.mock("@discordjs/core", () => ({
  API: jest.fn().mockImplementation(() => mockApiInstance),
}));

describe("DiscordService", () => {
  let service: DiscordService;
  let configService: ConfigService;

  const mockBotToken = "test-bot-token";
  const mockClientId = "test-client-id";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "DISCORD_BOT_TOKEN") return mockBotToken;
              if (key === "DISCORD_CLIENT_ID") return mockClientId;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with bot token", () => {
      expect(mockRestSetToken).toHaveBeenCalledWith(mockBotToken);
    });

    it("should throw error if DISCORD_BOT_TOKEN is not configured", async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            DiscordService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn(() => null),
              },
            },
          ],
        }).compile(),
      ).rejects.toThrow("DISCORD_BOT_TOKEN is required but not configured");
    });
  });

  describe("generateBotInviteUrl", () => {
    it("should generate correct bot invite URL", () => {
      const url = service.generateBotInviteUrl();
      expect(url).toBe(
        `https://discord.com/api/oauth2/authorize?client_id=${mockClientId}&permissions=1024&scope=bot`,
      );
    });

    it("should throw error if DISCORD_CLIENT_ID is not configured", async () => {
      const module = await Test.createTestingModule({
        providers: [
          DiscordService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === "DISCORD_BOT_TOKEN") return mockBotToken;
                return null;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<DiscordService>(DiscordService);
      expect(() => testService.generateBotInviteUrl()).toThrow(
        "DISCORD_CLIENT_ID not configured",
      );
    });
  });

  describe("validateUserId", () => {
    it("should return true for valid user ID", async () => {
      mockApiUsersGet.mockResolvedValue({
        id: "123456789",
        username: "testuser",
      });

      const result = await service.validateUserId("123456789");
      expect(result).toBe(true);
      expect(mockApiUsersGet).toHaveBeenCalledWith("123456789");
    });

    it("should return false for invalid user ID", async () => {
      mockApiUsersGet.mockRejectedValue(new Error("User not found"));

      const result = await service.validateUserId("invalid");
      expect(result).toBe(false);
    });
  });

  describe("getGuildInfo", () => {
    it("should return guild info when bot has access", async () => {
      const mockGuild = {
        id: "guild123",
        name: "Test Guild",
      };
      mockApiGuildsGet.mockResolvedValue(mockGuild);

      const result = await service.getGuildInfo("guild123");
      expect(result).toEqual({
        id: "guild123",
        name: "Test Guild",
        botHasAccess: true,
      });
      expect(mockApiGuildsGet).toHaveBeenCalledWith("guild123");
    });

    it("should return botHasAccess: false when bot lacks access", async () => {
      mockApiGuildsGet.mockRejectedValue(new Error("Missing Access"));

      const result = await service.getGuildInfo("guild123");
      expect(result).toEqual({
        id: "guild123",
        name: "Unknown",
        botHasAccess: false,
      });
    });
  });

  describe("resolveUsernameToId", () => {
    it("should resolve username to user ID", async () => {
      const mockMembers = [
        {
          user: {
            id: "user123",
            username: "TestUser",
          },
        },
      ];
      mockApiGuildsSearchForMembers.mockResolvedValue(mockMembers);

      const result = await service.resolveUsernameToId("guild123", "testuser");
      expect(result).toBe("user123");
      expect(mockApiGuildsSearchForMembers).toHaveBeenCalledWith("guild123", {
        query: "testuser",
        limit: 50,
      });
    });

    it("should handle @ prefix in username", async () => {
      const mockMembers = [
        {
          user: {
            id: "user123",
            username: "TestUser",
          },
        },
      ];
      mockApiGuildsSearchForMembers.mockResolvedValue(mockMembers);

      const result = await service.resolveUsernameToId("guild123", "@testuser");
      expect(result).toBe("user123");
      expect(mockApiGuildsSearchForMembers).toHaveBeenCalledWith("guild123", {
        query: "testuser",
        limit: 50,
      });
    });

    it("should return null when user not found", async () => {
      mockApiGuildsSearchForMembers.mockResolvedValue([]);

      const result = await service.resolveUsernameToId("guild123", "nonexistent");
      expect(result).toBeNull();
    });

    it("should throw error when bot lacks guild access", async () => {
      mockApiGuildsSearchForMembers.mockRejectedValue(
        new Error("Missing Access"),
      );

      await expect(
        service.resolveUsernameToId("guild123", "testuser"),
      ).rejects.toThrow("Failed to search Discord server");
    });
  });

  describe("verifyGuildAccess", () => {
    it("should return true when bot has guild access", async () => {
      mockApiGuildsGet.mockResolvedValue({ id: "guild123" });

      const result = await service.verifyGuildAccess("guild123");
      expect(result).toBe(true);
    });

    it("should return false when bot lacks guild access", async () => {
      mockApiGuildsGet.mockRejectedValue(new Error("Missing Access"));

      const result = await service.verifyGuildAccess("guild123");
      expect(result).toBe(false);
    });
  });

  describe("getUserInfo", () => {
    it("should return user info with avatar", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        global_name: "Test User",
        avatar: "abcdef123456",
      };
      mockApiUsersGet.mockResolvedValue(mockUser);

      const result = await service.getUserInfo("user123");
      expect(result).toEqual({
        userId: "user123",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://cdn.discordapp.com/avatars/user123/abcdef123456.png",
      });
    });

    it("should handle animated avatar", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        global_name: "Test User",
        avatar: "a_abcdef123456",
      };
      mockApiUsersGet.mockResolvedValue(mockUser);

      const result = await service.getUserInfo("user123");
      expect(result.avatarUrl).toBe(
        "https://cdn.discordapp.com/avatars/user123/a_abcdef123456.gif",
      );
    });

    it("should handle user without avatar", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        global_name: null,
        avatar: null,
      };
      mockApiUsersGet.mockResolvedValue(mockUser);

      const result = await service.getUserInfo("user123");
      expect(result).toEqual({
        userId: "user123",
        username: "testuser",
        displayName: undefined,
        avatarUrl: undefined,
      });
    });

    it("should throw NotFoundException when user not found", async () => {
      mockApiUsersGet.mockRejectedValue(new Error("User not found"));

      await expect(service.getUserInfo("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
