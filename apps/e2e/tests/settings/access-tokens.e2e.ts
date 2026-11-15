import { print } from "graphql";
import type { APIRequestContext } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, CFG } from "../../src/config.js";
import { SeedWhoAmIDocument } from "../../src/generated/graphql.js";

const test = presetTest("community-basic");

/** What the API makes of a request carrying `secret`. */
async function whoAmI(request: APIRequestContext, secret: string) {
  const res = await request.post(CFG.graphqlUrl, {
    headers: { Authorization: `Bearer ${secret}` },
    data: { query: print(SeedWhoAmIDocument) },
  });
  return res.json() as Promise<{
    data?: { me: { username: string } | null } | null;
    errors?: Array<{ extensions?: { code?: string } }>;
  }>;
}

/**
 * Personal access tokens (#604), from the site admin page: made in the
 * dialog, used against the API with the secret it shows once, then revoked.
 */
test.describe("access tokens", () => {
  test.use({ persona: "siteadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("a site admin makes a token, uses it, and revokes it", async ({
    page,
    request,
    world,
  }) => {
    await page.goto(apexUrl("/admin"));
    await page.getByRole("link", { name: /Access Tokens/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Access Tokens" }),
    ).toBeVisible();
    await expect(page.getByText(/No access tokens yet/)).toBeVisible();

    await page.getByRole("button", { name: "Create token" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("e2e bot");
    await dialog.getByLabel("Add a community").click();
    await page.getByRole("option", { name: world.community.name }).click();
    const grant = dialog.getByRole("group", { name: world.community.name });
    await grant.getByLabel("Manage Items").check();
    await dialog.getByRole("button", { name: "Create token" }).click();

    const secretBox = dialog.getByTestId("access-token-secret");
    await expect(secretBox).toHaveText(/^chardb_pat_/);
    const secret = (await secretBox.textContent()) ?? "";
    await dialog.getByRole("button", { name: "Done" }).click();

    const card = page.getByRole("listitem", { name: "e2e bot" });
    await expect(card).toContainText("Active");
    await expect(card).toContainText(`${world.community.name}: Manage Items`);
    await expect(card).toContainText(`…${secret.slice(-4)}`);

    const signedIn = await whoAmI(request, secret);
    expect(signedIn.errors).toBeUndefined();
    expect(signedIn.data?.me?.username).toBe("siteadmin");

    await card.getByRole("button", { name: "Revoke" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Revoke" })
      .click();
    await expect(card).toContainText("Revoked");
    await expect(card.getByRole("button", { name: "Revoke" })).toBeDisabled();

    const refused = await whoAmI(request, secret);
    expect(refused.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });
});
