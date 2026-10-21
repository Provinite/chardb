import { Injectable } from "@nestjs/common";

/** The current time, behind a provider so tests can pin it. */
@Injectable()
export class HalloweenClock {
  now(): Date {
    return new Date();
  }
}
