import { BadRequestException, ConflictException } from "@nestjs/common";
import { HalloweenDoorClosedReason } from "./door-knock.types";

/** The community has no Halloween event running right now. */
export class DoorKnockEventClosedError extends BadRequestException {
  constructor(readonly communityId: string) {
    super("Trick-or-treating is not running right now");
    this.name = new.target.name;
  }
}

/** The knocker is not a member of the community. */
export class DoorKnockerNotMemberError extends BadRequestException {
  constructor(
    readonly communityId: string,
    readonly knockerId: string,
  ) {
    super("Join this community to knock on doors");
    this.name = new.target.name;
  }
}

const CLOSED_MESSAGES: Record<HalloweenDoorClosedReason, string> = {
  [HalloweenDoorClosedReason.OWN_DOOR]: "You can't knock on your own door",
  [HalloweenDoorClosedReason.NOT_A_MEMBER]:
    "Only members of this community have a door",
  [HalloweenDoorClosedReason.ALREADY_KNOCKED]:
    "You already knocked on this door today",
  [HalloweenDoorClosedReason.NO_KNOCKS_LEFT]:
    "You have no door knocks left today",
};

/** A knock on a door that is closed to the knocker, and why. */
export class DoorClosedError extends BadRequestException {
  constructor(
    readonly reason: HalloweenDoorClosedReason,
    readonly knockerId: string,
    readonly knockeeId: string,
  ) {
    super(CLOSED_MESSAGES[reason]);
    this.name = new.target.name;
  }
}

/** The knocker's lock was not free in time. Nothing was given. */
export class DoorKnockBusyError extends ConflictException {
  constructor() {
    super("Lots of knocking right now. Try again in a moment.");
    this.name = new.target.name;
  }
}
