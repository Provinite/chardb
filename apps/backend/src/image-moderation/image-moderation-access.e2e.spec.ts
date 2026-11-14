import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ImageModerationModule } from "./image-moderation.module";

const COMMUNITY_COUNT = `
  query ($communityId: ID!) { pendingImageCount(communityId: $communityId) }
`;
const GLOBAL_COUNT = `query { globalPendingImageCount }`;
const REJECT = `
  mutation ($input: RejectImageInput!) { rejectImage(input: $input) { id } }
`;

/**
 * Who reaches the moderation queue. The permission decorators on these
 * handlers are all that stands in front of them.
 */
describe("image moderation access (e2e)", () => {
  let testApp: TestApp;
  let communityId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, ImageModerationModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    communityId = (await testApp.createTestCommunity()).id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  let seq = 0;
  /** A token for a user in the community with this role, or in none. */
  const tokenFor = async (
    role: Record<string, boolean> | null,
    account: Record<string, unknown> = {},
  ) => {
    const stamp = ++seq;
    const user = await testApp.createTestUser({
      username: `moderation_${stamp}`,
      email: `moderation_${stamp}@example.com`,
      ...account,
    });
    if (role) {
      const created = await testApp.createTestRole(communityId, role);
      await testApp.createTestCommunityMember(user.id, created.id);
    }
    return testApp.generateTestToken(user.id, user.username);
  };

  /** "ok", or the error code the request was refused with. */
  const outcome = async (
    query: string,
    variables: Record<string, unknown>,
    token: string | null,
  ) => {
    const response = token
      ? await testApp.authenticatedGraphqlRequest(query, variables, token)
      : await testApp.graphqlRequest(query, variables);
    const [error] = response.body.errors ?? [];
    return error ? (error.extensions?.code as string) : "ok";
  };

  it("refuses an anonymous caller", async () => {
    expect(await outcome(COMMUNITY_COUNT, { communityId }, null)).toBe(
      "FORBIDDEN",
    );
    expect(await outcome(GLOBAL_COUNT, {}, null)).toBe("FORBIDDEN");
  });

  it("refuses a member whose role cannot moderate", async () => {
    const member = await tokenFor({});

    expect(await outcome(COMMUNITY_COUNT, { communityId }, member)).toBe(
      "FORBIDDEN",
    );
    expect(await outcome(GLOBAL_COUNT, {}, member)).toBe("FORBIDDEN");
  });

  it("lets a moderator into their community's queue and not the site's", async () => {
    const moderator = await tokenFor({ canModerateImages: true });

    expect(await outcome(COMMUNITY_COUNT, { communityId }, moderator)).toBe(
      "ok",
    );
    expect(await outcome(GLOBAL_COUNT, {}, moderator)).toBe("FORBIDDEN");
  });

  it("refuses a moderator of some other community", async () => {
    const elsewhere = (await testApp.createTestCommunity("Elsewhere")).id;
    const moderator = await tokenFor({ canModerateImages: true });

    expect(
      await outcome(COMMUNITY_COUNT, { communityId: elsewhere }, moderator),
    ).toBe("FORBIDDEN");
  });

  it("lets a site admin who is in no community into both", async () => {
    const admin = await tokenFor(null, { isAdmin: true });

    expect(await outcome(COMMUNITY_COUNT, { communityId }, admin)).toBe("ok");
    expect(await outcome(GLOBAL_COUNT, {}, admin)).toBe("ok");
  });

  // Open to anyone signed in; the service decides, image by image.
  it("refuses an anonymous caller a decision, and a signed-in one an image that does not exist", async () => {
    const input = {
      imageId: "00000000-0000-0000-0000-000000000000",
      reason: "OTHER",
      reasonText: "x",
    };

    expect(await outcome(REJECT, { input }, null)).toBe("FORBIDDEN");
    expect(await outcome(REJECT, { input }, await tokenFor({}))).not.toBe("ok");
  });
});
