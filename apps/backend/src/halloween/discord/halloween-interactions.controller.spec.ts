import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { generateKeyPairSync, sign } from "crypto";
import * as request from "supertest";
import { HalloweenInteractionsController } from "./halloween-interactions.controller";
import { HalloweenCommandDispatcher } from "./halloween-command.dispatcher";
import { HalloweenConfig } from "../halloween.config";
import { buildInteraction, testConfig } from "../testing/fixtures";

describe("HalloweenInteractionsController", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyHex = Buffer.from(
    publicKey.export({ format: "jwk" }).x as string,
    "base64url",
  ).toString("hex");

  let app: INestApplication;
  const dispatch = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HalloweenInteractionsController],
      providers: [
        {
          provide: HalloweenConfig,
          useValue: { ...testConfig(), publicKey: publicKeyHex },
        },
        { provide: HalloweenCommandDispatcher, useValue: { dispatch } },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => dispatch.mockClear());

  /** POST a body signed the way Discord signs it. */
  const signedPost = (payload: unknown, tamper?: (body: string) => string) => {
    const body = JSON.stringify(payload);
    const timestamp = "1697558400";
    const signature = sign(
      null,
      Buffer.from(timestamp + body),
      privateKey,
    ).toString("hex");
    return request(app.getHttpServer())
      .post("/discord/halloween/interactions")
      .set("Content-Type", "application/json")
      .set("X-Signature-Ed25519", signature)
      .set("X-Signature-Timestamp", timestamp)
      .send(tamper ? tamper(body) : body);
  };

  it("rejects an unsigned request", async () => {
    const res = await request(app.getHttpServer())
      .post("/discord/halloween/interactions")
      .send({ type: 1 });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { message: "Invalid request, invalid request signature" },
    });
  });

  it("rejects a body that does not match its signature", async () => {
    const res = await signedPost({ type: 1 }, () =>
      JSON.stringify({ type: 1, extra: true }),
    );
    expect(res.status).toBe(401);
  });

  it("answers Discord's PING with a PONG", async () => {
    const res = await signedPost({ type: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 1 });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("defers a guild command and then runs it", async () => {
    const interaction = buildInteraction({ name: "knock" });
    const res = await signedPost(interaction);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: 5, data: {} });
    await new Promise((resolve) => setImmediate(resolve));
    expect(dispatch).toHaveBeenCalledWith(interaction);
  });

  it("defers /deviantart privately", async () => {
    const res = await signedPost(buildInteraction({ name: "deviantart" }));
    expect(res.body).toEqual({ type: 5, data: { flags: 64 } });
  });

  it("refuses a command used outside a guild", async () => {
    const { guild_id: _guildId, ...dm } = buildInteraction();
    const res = await signedPost(dm);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      type: 4,
      data: {
        flags: 64,
        content: "This command may only be used in a guild.",
      },
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects interactions that are not commands", async () => {
    const res = await signedPost({ type: 3, id: "x", token: "t" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        message: "Bad request, only application commands are supported.",
      },
    });
  });
});
