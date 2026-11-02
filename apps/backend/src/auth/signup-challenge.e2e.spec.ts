import { createChallenge, solveChallenge, type Challenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { TestApp, AUTH_QUERIES } from "../../test/setup-e2e";
import { AuthModule } from "./auth.module";
import { DatabaseModule } from "../database/database.module";
import { UsersModule } from "../users/users.module";
import { SIGNUP_CHALLENGE_FAILED } from "./errors/signup-challenge-failed.error";

/**
 * Sign-up asks for a solved proof-of-work challenge (ALTCHA) and an empty
 * honeypot field before it creates anything. Each refusal is the same error,
 * so the response says nothing about which check failed.
 */

const encode = (challenge: Challenge, solution: unknown): string =>
  Buffer.from(
    JSON.stringify({
      challenge: {
        parameters: challenge.parameters,
        signature: challenge.signature,
      },
      solution,
    }),
  ).toString("base64");

const secret = (): string => {
  const value = process.env.ALTCHA_HMAC_SECRET;
  if (!value) throw new Error("ALTCHA_HMAC_SECRET missing from .env.test");
  return value;
};

describe("Sign-up challenge (e2e)", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, UsersModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const signupInput = async (extra: Record<string, unknown> = {}) => ({
    username: "newcomer",
    email: "newcomer@example.com",
    password: "password123",
    inviteCode: await testApp.createTestInviteCode(),
    ...extra,
  });

  /** Accounts these specs sign up; the invite code's creator is not one. */
  const userCount = () =>
    testApp.getDb().user.count({
      where: { email: { in: ["newcomer@example.com", "second@example.com"] } },
    });

  const expectRefused = (response: {
    body: { errors?: { extensions?: { code?: string } }[] };
  }) => {
    expect(response.body.errors?.[0]?.extensions?.code).toBe(
      SIGNUP_CHALLENGE_FAILED,
    );
  };

  it("hands out a signed challenge that expires in the future", async () => {
    const response = await testApp.graphqlRequest(
      AUTH_QUERIES.SIGNUP_CHALLENGE,
    );

    const challenge: Challenge = JSON.parse(response.body.data.signupChallenge);
    expect(challenge.parameters.algorithm).toBe("PBKDF2/SHA-256");
    expect(challenge.signature).toEqual(expect.any(String));
    expect(challenge.parameters.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it("creates the account with a solved challenge", async () => {
    const response = await testApp.signupRequest({
      input: await signupInput(),
    });

    expect(response.body.errors).toBeUndefined();
    expect(await userCount()).toBe(1);
  });

  it("refuses a sign-up without a payload", async () => {
    const response = await testApp.graphqlRequest(AUTH_QUERIES.SIGNUP, {
      input: await signupInput(),
    });

    expect(response.body.errors).toBeDefined();
    expect(await userCount()).toBe(0);
  });

  it("refuses a payload that is not one", async () => {
    const response = await testApp.signupRequest({
      input: await signupInput({ altchaPayload: "not-a-payload" }),
    });

    expectRefused(response);
    expect(await userCount()).toBe(0);
  });

  it("refuses the widget's test payload", async () => {
    const testPayload = Buffer.from(
      JSON.stringify({ challenge: null, solution: null, test: true }),
    ).toString("base64");

    const response = await testApp.signupRequest({
      input: await signupInput({ altchaPayload: testPayload }),
    });

    expectRefused(response);
  });

  it("refuses a solved challenge used a second time", async () => {
    const payload = await testApp.solvedSignupChallenge();
    await testApp.signupRequest({
      input: await signupInput({ altchaPayload: payload }),
    });

    const response = await testApp.signupRequest({
      input: await signupInput({
        username: "second",
        email: "second@example.com",
        altchaPayload: payload,
      }),
    });

    expectRefused(response);
    expect(await userCount()).toBe(1);
  });

  it("refuses an expired challenge", async () => {
    const challenge = await createChallenge({
      algorithm: "PBKDF2/SHA-256",
      cost: 1,
      deriveKey,
      hmacSignatureSecret: secret(),
      expiresAt: new Date(Date.now() - 1000),
    });
    const solution = await solveChallenge({ challenge, deriveKey });

    const response = await testApp.signupRequest({
      input: await signupInput({ altchaPayload: encode(challenge, solution) }),
    });

    expectRefused(response);
  });

  it("refuses a challenge signed with another secret", async () => {
    const challenge = await createChallenge({
      algorithm: "PBKDF2/SHA-256",
      cost: 1,
      deriveKey,
      hmacSignatureSecret: "not-the-server-secret",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const solution = await solveChallenge({ challenge, deriveKey });

    const response = await testApp.signupRequest({
      input: await signupInput({ altchaPayload: encode(challenge, solution) }),
    });

    expectRefused(response);
  });

  it("refuses a solution that does not solve the challenge", async () => {
    const payload = JSON.parse(
      Buffer.from(await testApp.solvedSignupChallenge(), "base64").toString(),
    );
    payload.solution.counter += 1;

    const response = await testApp.signupRequest({
      input: await signupInput({
        altchaPayload: Buffer.from(JSON.stringify(payload)).toString("base64"),
      }),
    });

    expectRefused(response);
  });

  it("refuses a filled-in honeypot", async () => {
    const response = await testApp.signupRequest({
      input: await signupInput({ honeypot: "https://spam.example" }),
    });

    expectRefused(response);
    expect(await userCount()).toBe(0);
  });

  it("lets a challenge refused for another reason be solved again", async () => {
    // A sign-up that fails validation must not spend the challenge: the
    // person fixes the field and submits the same solved payload.
    const payload = await testApp.solvedSignupChallenge();
    await testApp.signupRequest({
      input: await signupInput({ inviteCode: "no-such-code", altchaPayload: payload }),
    });

    const response = await testApp.signupRequest({
      input: await signupInput({ altchaPayload: payload }),
    });

    expect(response.body.errors).toBeUndefined();
    expect(await userCount()).toBe(1);
  });
});
