import { BadRequestException } from "@nestjs/common";

/**
 * A role given to a membership or an invitation belongs to a community other
 * than the one it is for. A membership is in whichever community its role
 * belongs to, so taking such a role would put someone in that other community
 * past every gate on joining it.
 */
export class RoleInAnotherCommunityError extends BadRequestException {
  constructor() {
    super("That role belongs to another community");
  }
}
