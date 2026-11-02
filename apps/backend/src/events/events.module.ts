import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DomainEvents } from "./domain-events";

/**
 * The in-process domain event bus. Import it wherever events are published;
 * listeners need only be providers in a module the app loads.
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [DomainEvents],
  exports: [DomainEvents],
})
export class EventsModule {}
