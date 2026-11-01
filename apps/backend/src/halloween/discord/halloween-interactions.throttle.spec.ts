import { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import * as request from "supertest";
import { HalloweenInteractionsController } from "./halloween-interactions.controller";
import { HalloweenCommandDispatcher } from "./halloween-command.dispatcher";
import { HalloweenConfig } from "../halloween.config";
import { Clock } from "../../clock/clock";
import { CustomThrottlerGuard } from "../../middleware/custom-throttler.guard";
import { ALL_THROTTLES } from "../../middleware/throttles";
import { testConfig } from "../testing/fixtures";

/**
 * Every player's command reaches the endpoint from the same few Discord
 * addresses, so the per-address rate limit must not apply to it. Built with
 * the app's real guard and every throttler the app registers -- names from
 * ALL_THROTTLES, so a new one is covered here too -- at limits small enough to
 * trip in a test.
 */
describe("HalloweenInteractionsController rate limiting", () => {
  let app: INestApplication;
  const previous = process.env.RATE_LIMIT_DISABLED;

  beforeAll(async () => {
    delete process.env.RATE_LIMIT_DISABLED;
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot(
          ALL_THROTTLES.map((throttle) => ({
            ...throttle,
            ttl: 60_000,
            limit: 2,
          })),
        ),
      ],
      controllers: [HalloweenInteractionsController],
      providers: [
        { provide: APP_GUARD, useClass: CustomThrottlerGuard },
        { provide: HalloweenConfig, useValue: testConfig() },
        { provide: Clock, useValue: new Clock() },
        {
          provide: HalloweenCommandDispatcher,
          useValue: { dispatch: jest.fn() },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previous === undefined) {
      delete process.env.RATE_LIMIT_DISABLED;
    } else {
      process.env.RATE_LIMIT_DISABLED = previous;
    }
  });

  it("never answers 429, however many requests arrive", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      // Unsigned, so each is refused with 401 -- unless the throttler
      // refuses it first.
      const res = await request(app.getHttpServer())
        .post("/discord/halloween/interactions")
        .send({ type: 1 });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 401]);
  });
});
