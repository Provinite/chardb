import { logger } from "../utils/logger";
import { RateLimiter } from "./rate-limiter";
import type {
  DATokenResponse,
  DADeviation,
  DAFoldersResponse,
  DAGalleryResponse,
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
      const body = await resp.text();
      throw new Error(`DA auth failed: ${resp.status} — ${body.slice(0, 200)}`);
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        `DA auth returned unexpected content-type: ${contentType}. Are your DEVIANTART_CLIENT_ID and DEVIANTART_CLIENT_SECRET correct?`
      );
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

  async getDeviation(deviationUuid: string): Promise<DADeviation> {
    const url = `${DA_API_BASE}/deviation/${deviationUuid}`;
    const resp = await this.fetchWithRetry(url);
    return (await resp.json()) as DADeviation;
  }

  /**
   * Resolve a DA deviation page URL to the API's UUID.
   * DA pages embed the UUID in a meta tag: <meta property="da:appurl" content="DeviantArt://deviation/UUID">
   */
  async resolveDeviationUuid(pageUrl: string): Promise<string> {
    const { uuid } = await this.scrapeDeviationPage(pageUrl);
    return uuid;
  }

  /**
   * Fetch a DA deviation page and extract both the UUID and description HTML.
   * The description is embedded as JSON in the page's initial state data since
   * the /content API endpoint is not available with Client Credentials auth.
   */
  async scrapeDeviationPage(
    pageUrl: string
  ): Promise<{ uuid: string; descriptionHtml: string }> {
    const resp = await fetch(pageUrl, {
      headers: { "User-Agent": "CharDB-Import/1.0" },
    });
    if (!resp.ok) {
      throw new Error(`Failed to fetch DA page: ${resp.status}`);
    }
    const html = await resp.text();

    // Extract UUID from da:appurl meta tag
    let uuid = "";
    const appUrlMatch = html.match(
      /property="da:appurl"\s+content="DeviantArt:\/\/deviation\/([^"]+)"/
    );
    if (appUrlMatch) {
      uuid = appUrlMatch[1];
    } else {
      const dataMatch = html.match(/"deviationId"\s*:\s*"([^"]+)"/);
      if (dataMatch) {
        uuid = dataMatch[1];
      }
    }

    if (!uuid) {
      throw new Error(
        "Could not resolve deviation UUID from page. The URL may be invalid."
      );
    }

    // Extract description HTML from the page.
    // DA uses different structures depending on page age:
    //   Legacy: <div class="legacy-journal ...">content</div></div></div>
    //   Current: <div id="description">...<div data-editor-viewer="1" ...>content</div></div></div>
    let descriptionHtml = "";

    const journalMatch = html.match(
      /<div class="legacy-journal[^"]*"[^>]*>([\s\S]*?)<\/div><\/div><\/div>/
    );
    if (journalMatch) {
      descriptionHtml = journalMatch[1];
    }

    // Fallback: current DA format uses data-editor-viewer inside #description
    if (!descriptionHtml) {
      const editorMatch = html.match(
        /id="description"[^>]*>[\s\S]*?<div data-editor-viewer="1"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/
      );
      if (editorMatch) {
        descriptionHtml = editorMatch[1];
      }
    }

    return { uuid, descriptionHtml };
  }

  /**
   * Fetch description HTML for a deviation. Falls back to page scraping
   * since the /content API endpoint requires user-level auth.
   */
  async getDeviationDescription(deviationUrl: string): Promise<string> {
    const { descriptionHtml } = await this.scrapeDeviationPage(deviationUrl);
    return descriptionHtml;
  }
}
