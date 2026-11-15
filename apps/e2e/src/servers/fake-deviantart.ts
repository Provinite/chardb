/**
 * A stand-in for the two DeviantArt API calls the backend makes: a
 * client-credentials token, and a profile lookup by handle. The backend talks
 * to it through DEVIANTART_API_URL, so a grant to a DeviantArt handle works
 * in the suite without reaching deviantart.com with fake credentials.
 *
 * Every handle exists. Its UUID is derived from the handle, case-insensitive
 * as DeviantArt's are, so a test can link the same account by UUID with
 * `fakeDeviantArtUuid`.
 */
import { createHash } from "node:crypto";
import * as http from "node:http";
import type { AddressInfo } from "node:net";

const PROFILE_PATH = "/api/v1/oauth2/user/profile/";

/** The UUID the fake hands out for a handle. */
export function fakeDeviantArtUuid(handle: string): string {
  const hex = createHash("sha1").update(handle.toLowerCase()).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Listen on an ephemeral port and resolve to the origin to hand the backend.
 * The server lives as long as the process that started it.
 */
export async function startFakeDeviantArt(host: string): Promise<string> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://fake");
    if (req.method === "POST" && url.pathname === "/oauth2/token") {
      send(res, 200, {
        access_token: "fake-deviantart-token",
        expires_in: 3600,
      });
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith(PROFILE_PATH)) {
      const handle = decodeURIComponent(
        url.pathname.slice(PROFILE_PATH.length),
      );
      send(res, 200, {
        user: { userid: fakeDeviantArtUuid(handle), username: handle },
      });
      return;
    }
    send(res, 404, { error: "not_found" });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  // Never keeps the launcher alive by itself; the backend child does that.
  server.unref();
  const { port } = server.address() as AddressInfo;
  return `http://${host}:${port}`;
}
