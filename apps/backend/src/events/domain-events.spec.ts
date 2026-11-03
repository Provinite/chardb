import { Injectable, Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  DomainEventLogEvent,
  DomainEvents,
  OnDomainEvent,
} from "./domain-events";
import { EventsModule } from "./events.module";
import type { UserSignedIn } from "./domain-event-map";

/** Records each event once `release` is called. */
@Injectable()
class Recorder {
  readonly seen: string[] = [];
  private gate: Promise<void> = Promise.resolve();
  release: () => void = () => undefined;

  hold(): void {
    this.gate = new Promise((resolve) => (this.release = resolve));
  }

  @OnDomainEvent("user.signed_in")
  async record(event: UserSignedIn): Promise<void> {
    await this.gate;
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
  let error: jest.SpyInstance;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventsModule],
      providers: [Recorder, Failing],
    }).compile();
    await moduleRef.init();
    events = moduleRef.get(DomainEvents);
    recorder = moduleRef.get(Recorder);
    error = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(async () => {
    recorder.release();
    await moduleRef.close();
    jest.restoreAllMocks();
  });

  it("returns without waiting for listeners", async () => {
    recorder.hold();
    expect(events.publish("user.signed_in", { userId: "u1" })).toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));
    expect(recorder.seen).toEqual([]);

    recorder.release();
    await events.idle();
    expect(recorder.seen).toEqual(["u1"]);
  });

  it("logs a failing listener without affecting the others", async () => {
    events.publish("user.signed_in", { userId: "u2" });
    await events.idle();

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

  it("lets listeners finish before the app shuts down", async () => {
    recorder.hold();
    events.publish("user.signed_in", { userId: "u3" });
    const closed = moduleRef.close();
    recorder.release();
    await closed;
    expect(recorder.seen).toEqual(["u3"]);
  });
});
