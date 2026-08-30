import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { NotificationsService } from "./notifications.service";
import type { LoadedNotification } from "./notifications.service";
import {
  Notification,
  NotificationConnection,
} from "./entities/notification.entity";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaCommunityToGraphQL } from "../communities/utils/community-resolver-mappers";

/**
 * Flattens a row's validated snapshot onto the GraphQL type.
 *
 * Every field is optional on the way out because which ones exist depends on
 * the kind. `in` narrows the payload union rather than asserting it, so adding
 * a kind whose payload lacks one of these stays type-safe.
 */
function mapNotification(row: LoadedNotification): Notification {
  const data = row.data;
  return {
    id: row.id,
    kind: row.kind,
    createdAt: row.createdAt,
    seenAt: row.seenAt,
    readAt: row.readAt,
    actor: row.actorUser ? mapPrismaUserToGraphQL(row.actorUser) : null,
    actorLabel: row.actorLabel,
    community: row.community
      ? mapPrismaCommunityToGraphQL(row.community)
      : null,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    body: row.body,
    subjectName: data && "subjectName" in data ? data.subjectName : null,
    count: data && "count" in data ? data.count : null,
    amount: data && "amount" in data ? data.amount : null,
    reason: data && "reason" in data ? data.reason : null,
    excerpt: data && "excerpt" in data ? data.excerpt : null,
  };
}

/**
 * Everything here is implicitly scoped to the caller. There is no query for
 * someone else's notifications and no argument that could ask for them: a
 * recipient id is taken from the token, never from the client.
 */
@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(private readonly notifications: NotificationsService) {}

  @AllowAnyAuthenticated()
  @Query(() => NotificationConnection, {
    name: "notifications",
    description: "Your notifications, newest first.",
  })
  async findMine(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("first", { type: () => Int, nullable: true, defaultValue: 20 })
    first?: number,
    @Args("after", { type: () => String, nullable: true })
    after?: string,
    @Args("unreadOnly", { type: () => Boolean, nullable: true })
    unreadOnly?: boolean,
  ): Promise<NotificationConnection> {
    const page = await this.notifications.findForRecipient(user.id, {
      first,
      after,
      unreadOnly,
    });
    return { ...page, nodes: page.nodes.map(mapNotification) };
  }

  @AllowAnyAuthenticated()
  @Query(() => Int, {
    name: "unseenNotificationCount",
    description:
      "How many notifications the badge should show. Its own query, and a " +
      "bare indexed count, because it is the one thing polled on a timer.",
  })
  async countUnseen(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<number> {
    return this.notifications.countUnseen(user.id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Int, {
    description:
      "Clears the badge, without marking anything read. Called when the " +
      "dropdown opens. Returns how many were affected.",
  })
  async markNotificationsSeen(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<number> {
    return this.notifications.markAllSeen(user.id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Int, {
    description:
      "Marks specific notifications read. Ids that are not yours match " +
      "nothing. Returns how many were affected.",
  })
  async markNotificationsRead(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("ids", { type: () => [ID] }) ids: string[],
  ): Promise<number> {
    return this.notifications.markRead(user.id, ids);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Int, {
    description: "Marks all of your notifications read.",
  })
  async markAllNotificationsRead(
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<number> {
    return this.notifications.markAllRead(user.id);
  }
}
