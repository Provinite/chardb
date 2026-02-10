import { logger } from "../utils/logger";
import { RateLimiter } from "./rate-limiter";
import type {
  DATokenResponse,
  DAFoldersResponse,
  DAGalleryResponse,
  DADeviationContent,
} from "./types";

const DA_API_BASE = "https://www.deviantart.com/api/v1/oauth2";
const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";

export class DeviantArtClient {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private rateLimiter: RateLimiter;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    intervalMs = 1000
  ) {
    this.rateLimiter = new RateLimiter(intervalMs);
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return;
    }

    logger.info("Authenticating with DeviantArt API...");
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const resp = await fetch(DA_TOKEN_URL, {
      method: "POST",
      body: params,
    });

    if (!resp.ok) {
      throw new Error(`DA auth failed: ${resp.status} ${await resp.text()}`);
    }

    const data = (await resp.json()) as DATokenResponse;
    this.accessToken = data.access_token;
    // Refresh 60s before expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    logger.info("Authenticated successfully");
  }

  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    await this.authenticate();
    await this.rateLimiter.wait();

    const separator = url.includes("?") ? "&" : "?";
    const fullUrl = `${url}${separator}access_token=${this.accessToken}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const resp = await fetch(fullUrl);

      if (resp.ok) {
        return resp;
      }

      if (resp.status === 401) {
        // Token expired, re-authenticate
        this.accessToken = null;
        await this.authenticate();
        continue;
      }

      if (resp.status === 429 || resp.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(
          `DA API ${resp.status} on attempt ${attempt + 1}, retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw new Error(`DA API error: ${resp.status} ${await resp.text()}`);
    }

    throw new Error(`DA API: max retries exceeded for ${url}`);
  }

  async getGalleryFolders(username: string): Promise<DAFoldersResponse> {
    const url = `${DA_API_BASE}/gallery/folders?username=${encodeURIComponent(username)}&limit=50`;
    const resp = await this.fetchWithRetry(url);
    return (await resp.json()) as DAFoldersResponse;
  }

  async getGalleryFolder(
    folderId: string,
    username: string,
    offset = 0,
    limit = 24
  ): Promise<DAGalleryResponse> {
    const url = `${DA_API_BASE}/gallery/${folderId}?username=${encodeURIComponent(username)}&offset=${offset}&limit=${limit}&mature_content=true`;
    const resp = await this.fetchWithRetry(url);
    return (await resp.json()) as DAGalleryResponse;
  }

  async getDeviationContent(deviationId: string): Promise<DADeviationContent> {
    const url = `${DA_API_BASE}/deviation/${deviationId}/content`;
    const resp = await this.fetchWithRetry(url);
    return (await resp.json()) as DADeviationContent;
  }
}
