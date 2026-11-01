import { Injectable } from "@nestjs/common";

/**
 * The current time, behind a provider so tests can pin it. Provided once, by
 * `ClockModule`: everything that asks what time it is shares this instance.
 */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
