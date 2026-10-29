import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ExternalMembersArgs } from "./external-members.args";

const errorsFor = async (plain: Record<string, unknown>) =>
  (
    await validate(
      plainToInstance(ExternalMembersArgs, {
        communityId: "11111111-1111-4111-8111-111111111111",
        ...plain,
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    )
  ).map((e) => e.property);

/**
 * The externalMembers query's arguments. A page size or offset the database
 * cannot honour is refused here, not passed through (#445).
 */
describe("ExternalMembersArgs", () => {
  it("accepts a page within bounds, with or without a search", async () => {
    expect(await errorsFor({ limit: 25, offset: 0 })).toEqual([]);
    expect(
      await errorsFor({
        limit: 100,
        offset: 50,
        search: "neo",
        provider: "DISCORD",
      }),
    ).toEqual([]);
  });

  it("refuses a page size outside 1 to 100", async () => {
    expect(await errorsFor({ limit: 0 })).toEqual(["limit"]);
    expect(await errorsFor({ limit: -5 })).toEqual(["limit"]);
    expect(await errorsFor({ limit: 101 })).toEqual(["limit"]);
  });

  it("refuses a negative offset", async () => {
    expect(await errorsFor({ offset: -1 })).toEqual(["offset"]);
  });

  it("refuses an account kind that cannot hold anything", async () => {
    expect(await errorsFor({ provider: "PATREON" })).toEqual(["provider"]);
  });
});
