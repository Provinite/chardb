# Backend architecture

## Domain events

`DomainEvents` (`src/events/`) is an in-process event bus. A module announces something that has happened; other modules react without the first depending on them.

Synchronous events are almost always a nasty antipattern and should have an architectural discussion with a human and an exception note for where we differ from that decision.

- `publish` returns at once and listeners run on their own time. Never await a listener's work from a publisher.
- Publish after the work the event describes has committed, never inside a transaction.
- Payloads say what happened, not what to do. A listener reads anything else it needs from the database.
- Listeners must survive a missed event: the bus is in memory, so a crash between commit and publish, or a listener that throws, loses it. Prefer listeners that rebuild their result from rows, so a later event or a catch-up path (such as sign-in) repairs the miss.
- Add an event by adding its name and payload type to `DomainEventMap` (`src/events/domain-event-map.ts`). Listen with `@OnDomainEvent(name)`; the payload type is checked.
- Tests wait for listeners with `DomainEvents.idle()`.

### Exceptions

None. Record any publisher that waits on its listeners here, with the reason and who agreed to it.
