import {
  NotificationChannel,
  NotificationKind,
  Visibility,
} from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CharactersModule } from "../characters/characters.module";
import { DomainEvents } from "../events/domain-events";
import { CharacterWatchesModule } from "./character-watches.module";

const WATCH = `
  mutation Watch($characterId: ID!) {
    watchCharacter(characterId: $characterId) { id viewerIsWatching }
  }
`;
const UNWATCH = `
  mutation Unwatch($characterId: ID!) {
    unwatchCharacter(characterId: $characterId) { id viewerIsWatching }
  }
`;
const IS_WATCHING = `
  query Character($id: ID!) { character(id: $id) { id viewerIsWatching } }
`;
const UPDATE_PROFILE = `
  mutation Update($id: ID!, $input: UpdateCharacterProfileInput!) {
    updateCharacterProfile(id: $id, input: $input) { id }
  }
`;

/**
 * Watching a character (issue #590): members hear when its owner changes what
 * it is advertised for.
 */
describe("Character watches (e2e)", () => {
  let testApp: TestApp;
  let events: DomainEvents;
  let ownerId: string;
  let ownerToken: string;
  let watcherId: string;
  let watcherToken: string;
  let characterId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        CharactersModule,
        CharacterWatchesModule,
      ],
    });
    events = testApp.getModuleRef().get(DomainEvents);
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const owner = await testApp.createTestUser();
    ownerId = owner.id;
    ownerToken = await testApp.generateTestToken(owner.id, owner.username);
    const watcher = await testApp.createTestUser();
    watcherId = watcher.id;
    watcherToken = await testApp.generateTestToken(
      watcher.id,
      watcher.username,
    );
    const { speciesId } = await testApp.createTestCommunitySetup(ownerId);
    const character = await testApp.getDb().character.create({
      data: {
        name: "Moonbeam",
        speciesId,
        ownerId,
        visibility: Visibility.PUBLIC,
      },
    });
    characterId = character.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const watch = (token: string, query = WATCH) =>
    testApp.authenticatedGraphqlRequest(query, { characterId }, token);

  const updateProfile = (input: Record<string, unknown>) =>
    testApp.authenticatedGraphqlRequest(
      UPDATE_PROFILE,
      { id: characterId, input },
      ownerToken,
    );

  const watcherNotifications = async () => {
    await events.idle();
    return testApp.getDb().notification.findMany({
      where: {
        recipientId: watcherId,
        kind: NotificationKind.CHARACTER_AVAILABILITY_CHANGED,
      },
    });
  };

  it("watches and unwatches, and says which it is", async () => {
    const watched = await watch(watcherToken);
    expect(watched.body.errors).toBeUndefined();
    expect(watched.body.data.watchCharacter.viewerIsWatching).toBe(true);

    // Watching twice is not an error.
    const again = await watch(watcherToken);
    expect(again.body.errors).toBeUndefined();

    const status = await testApp.authenticatedGraphqlRequest(
      IS_WATCHING,
      { id: characterId },
      watcherToken,
    );
    expect(status.body.data.character.viewerIsWatching).toBe(true);

    const unwatched = await watch(watcherToken, UNWATCH);
    expect(unwatched.body.errors).toBeUndefined();
    expect(unwatched.body.data.unwatchCharacter.viewerIsWatching).toBe(false);
  });

  it("answers false, not an error, for someone signed out", async () => {
    const status = await testApp.graphqlRequest(IS_WATCHING, {
      id: characterId,
    });
    expect(status.body.errors).toBeUndefined();
    expect(status.body.data.character.viewerIsWatching).toBe(false);
  });

  it("refuses to watch a private character you cannot see", async () => {
    await testApp.getDb().character.update({
      where: { id: characterId },
      data: { visibility: Visibility.PRIVATE },
    });

    const response = await watch(watcherToken);
    expect(response.body.errors).toBeDefined();
    expect(await testApp.getDb().characterWatch.count()).toBe(0);
  });

  it("notifies watchers when the owner puts the character up for trade", async () => {
    await watch(watcherToken);

    const response = await updateProfile({
      isTradeable: true,
      isSellable: true,
      price: 25,
    });
    expect(response.body.errors).toBeUndefined();

    const notifications = await watcherNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      actorUserId: ownerId,
      subjectType: "CHARACTER",
      subjectId: characterId,
      data: {
        subjectName: "Moonbeam",
        availabilityAdded: ["FOR_SALE", "TRADE_CHARACTERS"],
        availabilityRemoved: [],
        priceChanged: true,
        price: "25.00",
      },
    });
  });

  it("stays quiet when an edit leaves the advertisement alone", async () => {
    await watch(watcherToken);

    await updateProfile({ name: "Moonbeam II", details: "New details" });

    expect(await watcherNotifications()).toHaveLength(0);
  });

  it("does not tell the owner about their own edit", async () => {
    await watch(ownerToken);

    await updateProfile({ isOpenToOffers: true });
    await events.idle();

    expect(
      await testApp.getDb().notification.count({
        where: { recipientId: ownerId },
      }),
    ).toBe(0);
  });

  it("tells nobody when the same edit makes the character private", async () => {
    await watch(watcherToken);

    await updateProfile({ isTradeable: true, visibility: Visibility.PRIVATE });

    expect(await watcherNotifications()).toHaveLength(0);
  });

  it("respects a watcher who switched the kind off", async () => {
    await watch(watcherToken);
    await testApp.getDb().notificationPreference.create({
      data: {
        userId: watcherId,
        kind: NotificationKind.CHARACTER_AVAILABILITY_CHANGED,
        channel: NotificationChannel.IN_APP,
        enabled: false,
      },
    });

    await updateProfile({ isFreebie: true });

    expect(await watcherNotifications()).toHaveLength(0);
  });

  it("stops notifying once unwatched", async () => {
    await watch(watcherToken);
    await watch(watcherToken, UNWATCH);

    await updateProfile({ isFreebie: true });

    expect(await watcherNotifications()).toHaveLength(0);
  });
});
