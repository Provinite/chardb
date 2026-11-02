import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import type { DomainEventMap, DomainEventName } from "./domain-event-map";

/** The `event` field of domain event log lines, for searching. */
export const DomainEventLogEvent = {
  /** A listener threw; the publisher and other listeners carried on. */
  ListenerFailed: "domain_events.listener_failed",
} as const;

const logger = new Logger("DomainEvents");

/**
 * Announces domain events to their listeners, in this process.
 *
 * Publish only once the work the event describes has committed, never from
 * inside a transaction: a rollback would leave listeners acting on something
 * that did not happen.
 *
 * `publish` resolves once every listener has finished and never rejects. Await
 * it to keep listeners inside the request (tests and traces see their work);
 * leave it un-awaited where the caller must not wait on them.
 */
@Injectable()
export class DomainEvents {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish<K extends DomainEventName>(
    name: K,
    payload: DomainEventMap[K],
  ): Promise<void> {
    try {
      await this.emitter.emitAsync(name, payload);
    } catch (err) {
      // Listeners log their own failures; this catches the emitter's.
      logger.error({
        event: DomainEventLogEvent.ListenerFailed,
        message: "Domain event listener failed",
        domainEvent: name,
        err,
      });
    }
  }
}

type Listener<K extends DomainEventName> = (
  event: DomainEventMap[K],
) => void | Promise<void>;

/**
 * Makes a provider method a listener for one domain event. Its parameter is
 * checked against the event's payload. A listener that throws is logged and
 * goes no further: it fails neither the publisher nor the other listeners.
 */
export function OnDomainEvent<K extends DomainEventName>(name: K) {
  return <T extends Listener<K>>(
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const original = descriptor.value;
    if (!original) return descriptor;
    const listener = `${target.constructor.name}.${String(key)}`;
    async function guarded(
      this: unknown,
      payload: DomainEventMap[K],
    ): Promise<void> {
      try {
        await Reflect.apply(original as Listener<K>, this, [payload]);
      } catch (err) {
        logger.error({
          event: DomainEventLogEvent.ListenerFailed,
          message: "Domain event listener failed",
          domainEvent: name,
          listener,
          err,
        });
      }
    }
    const wrapped: TypedPropertyDescriptor<T> = {
      ...descriptor,
      value: guarded as unknown as T,
    };
    return OnEvent(name)(target, key, wrapped) ?? wrapped;
  };
}
