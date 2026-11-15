import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { DeviantArtService } from "./deviantart.service";

const UUID = "6a8a2c4e-1f3b-4d5e-9c7a-0b1d2e3f4a5b";

const serviceWith = (env: Record<string, string>) =>
  new DeviantArtService({
    get: (key: string) => env[key],
  } as unknown as ConfigService);

const CREDENTIALS = {
  DEVIANTART_CLIENT_ID: "client",
  DEVIANTART_CLIENT_SECRET: "secret",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("DeviantArtService.resolveUsername", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, "fetch")
      .mockImplementation((input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/oauth2/token")) {
          return Promise.resolve(
            json(200, { access_token: "token", expires_in: 3600 }),
          );
        }
        return Promise.resolve(
          json(200, { user: { userid: UUID, username: "Some-Artist" } }),
        );
      });
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  const calledUrls = () => fetchMock.mock.calls.map(([url]) => String(url));

  it("asks deviantart.com by default", async () => {
    await expect(
      serviceWith(CREDENTIALS).resolveUsername("some-artist"),
    ).resolves.toEqual({ uuid: UUID, username: "Some-Artist" });

    expect(calledUrls()).toEqual([
      "https://www.deviantart.com/oauth2/token",
      "https://www.deviantart.com/api/v1/oauth2/user/profile/some-artist",
    ]);
  });

  it("asks DEVIANTART_API_URL instead when set, so tests can stand in for DeviantArt", async () => {
    await serviceWith({
      ...CREDENTIALS,
      DEVIANTART_API_URL: "http://127.0.0.1:9999",
    }).resolveUsername("some-artist");

    expect(calledUrls()).toEqual([
      "http://127.0.0.1:9999/oauth2/token",
      "http://127.0.0.1:9999/api/v1/oauth2/user/profile/some-artist",
    ]);
  });

  it.each([
    ["blank", "", "https://www.deviantart.com"],
    [
      "with a trailing slash",
      "http://127.0.0.1:9999/",
      "http://127.0.0.1:9999",
    ],
  ])(
    "reads DEVIANTART_API_URL %s as an origin",
    async (_label, configured, origin) => {
      await serviceWith({
        ...CREDENTIALS,
        DEVIANTART_API_URL: configured,
      }).resolveUsername("some-artist");

      expect(calledUrls()[0]).toBe(`${origin}/oauth2/token`);
    },
  );

  it("reports a handle DeviantArt does not know as not found", async () => {
    fetchMock.mockImplementation((input: string | URL | Request) =>
      Promise.resolve(
        String(input).endsWith("/oauth2/token")
          ? json(200, { access_token: "token", expires_in: 3600 })
          : json(400, { error_description: "User not found." }),
      ),
    );

    await expect(
      serviceWith(CREDENTIALS).resolveUsername("nobody-here"),
    ).rejects.toThrow(NotFoundException);
  });
});
