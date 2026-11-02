import { Injectable, Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  DomainEventLogEvent,
  DomainEvents,
  OnDomainEvent,
} from "./domain-events";
import { EventsModule } from "./events.module";
import type { UserSignedIn } from "./domain-event-map";

@Injectable()
class Recorder {
  readonly seen: string[] = [];

  @OnDomainEvent("user.signed_in")
  async record(event: UserSignedIn): Promise<void> {
    await Promise.resolve();
    this.seen.push(event.userId);
  }
}

@Injectable()
class Failing {
  @OnDomainEvent("user.signed_in")
  async fail(): Promise<void> {
    await Promise.resolve();
    throw new Error("listener broke");
  }
}

describe("DomainEvents", () => {
  let moduleRef: TestingModule;
  let events: DomainEvents;
  let recorder: Recorder;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventsModule],
      providers: [Recorder, Failing],
    }).compile();
    await moduleRef.init();
    events = moduleRef.get(DomainEvents);
    recorder = moduleRef.get(Recorder);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  it("delivers a published event to its listeners before resolving", async () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    await events.publish("user.signed_in", { userId: "u1" });
    expect(recorder.seen).toEqual(["u1"]);
  });

  it("logs a failing listener and still resolves", async () => {
    const error = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    await expect(
      events.publish("user.signed_in", { userId: "u2" }),
    ).resolves.toBeUndefined();

    expect(recorder.seen).toEqual(["u2"]);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: DomainEventLogEvent.ListenerFailed,
        message: "Domain event listener failed",
        domainEvent: "user.signed_in",
        listener: "Failing.fail",
        err: expect.objectContaining({ message: "listener broke" }),
      }),
    );
  });
});
