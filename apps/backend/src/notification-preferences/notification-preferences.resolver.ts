import { BadRequestException, Logger } from "@nestjs/common";
import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { NotificationChannel } from "@chardb/database";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { UnsubscribeTokenService } from "./unsubscribe-token.service";
import { supportsEmail } from "./notification-preference-defaults";
import {
  NotificationPreference,
  UnsubscribeResult,
} from "./entities/notification-preference.entity";
import {
  UnsubscribeInput,
  UpdateNotificationPreferenceInput,
} from "./dto/notification-preference.dto";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";

/**
 * Preferences are always the caller's own. There is no query for somebody
 * else's and no argument that could name one -- the user id comes from the
 * token, exactly as it does in `NotificationsResolver`.
 *
 * The one unauthenticated entry point is `unsubscribeFromNotificationEmail`,
 * which is authorised by the token in the link rather than by a session, and
 * can only ever switch a single channel off.
 */
@Resolver(() => NotificationPreference)
export class NotificationPreferencesResolver {
  private readonly logger = new Logger(NotificationPreferencesResolver.name);

  constructor(
    private readonly preferences: NotificationPreferencesService,
    private readonly tokens: UnsubscribeTokenService,
  ) {}

  @AllowAnyAuthenticated()
  @Query(() => [NotificationPreference], {
    name: "notificationPreferences",
    description:
      "Your delivery settings, one row per kind, defaults already merged in.",
  })
  async findMine(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<NotificationPreference[]> {
    return this.preferences.resolveForUser(user.id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => [NotificationPreference], {
    description:
      "Sets one channel for one kind and returns the whole matrix, so a " +
      "client never has to merge the change in itself.",
  })
  async updateNotificationPreference(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: UpdateNotificationPreferenceInput,
  ): Promise<NotificationPreference[]> {
    // Refused rather than stored, because a stored "yes" for a kind with no
    // template would start sending the moment somebody wrote one -- consent
    // given before the thing existed, which is not consent.
    if (
      input.channel === NotificationChannel.EMAIL &&
      !supportsEmail(input.kind)
    ) {
      throw new BadRequestException(
        `${input.kind} does not send email, so it has no email setting.`,
      );
    }

    return this.preferences.setPreference(
      user.id,
      input.kind,
      input.channel,
      input.enabled,
    );
  }

  @AllowUnauthenticated()
  @Mutation(() => UnsubscribeResult, {
    description:
      "Switches off email for the one kind named by an unsubscribe link. " +
      "Authorised by the token, not by a session, so it works from a mail " +
      "client with nobody signed in.",
  })
  async unsubscribeFromNotificationEmail(
    @Args("input") input: UnsubscribeInput,
  ): Promise<UnsubscribeResult> {
    const claim = this.tokens.verify(input.token);
    if (!claim) {
      this.logger.warn("Rejected an unsubscribe token that did not verify");
      return { success: false, kind: null };
    }

    await this.preferences.disableEmail(claim.userId, claim.kind);
    return { success: true, kind: claim.kind };
  }
}
