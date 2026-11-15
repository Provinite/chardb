import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { CredentialsFileError, UsageError } from "./errors";
import {
  ENVIRONMENTS,
  type Environment,
  isEnvironment,
  tokenEnvironment,
} from "./target";

export type StoredTokens = Partial<Record<Environment, string>>;

/** `$XDG_CONFIG_HOME/chardb/credentials.json`, else under `~/.config`. */
export function defaultCredentialsPath(
  env: Record<string, string | undefined>,
  home: string,
): string {
  const base = env.XDG_CONFIG_HOME || join(home, ".config");
  return join(base, "chardb", "credentials.json");
}

/**
 * At most one token per environment, in a file only its owner can read. A
 * token is filed under the environment it names, so the file cannot hold a
 * prod token under `dev`.
 */
export class CredentialStore {
  constructor(readonly path: string) {}

  /** @throws CredentialsFileError for a file that cannot be read or parsed. */
  read(): StoredTokens {
    if (!existsSync(this.path)) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(this.path, "utf8"));
    } catch {
      throw new CredentialsFileError(this.path);
    }
    const stored: StoredTokens = {};
    if (typeof parsed !== "object" || parsed === null) return stored;
    for (const [key, value] of Object.entries(parsed)) {
      if (
        isEnvironment(key) &&
        typeof value === "string" &&
        tokenEnvironment(value) === key
      ) {
        stored[key] = value;
      }
    }
    return stored;
  }

  /** @returns the environment the token was filed under. */
  add(token: string): Environment {
    const environment = tokenEnvironment(token);
    if (!environment) {
      throw new UsageError("That is not a CharDB access token");
    }
    this.write({ ...this.readForRepair(), [environment]: token });
    return environment;
  }

  /** @returns whether there was a token to remove. */
  remove(environment: Environment): boolean {
    const stored = this.read();
    if (!stored[environment]) return false;
    delete stored[environment];
    this.write(stored);
    return true;
  }

  /** What is stored, or nothing for a broken file, so adding can replace it. */
  private readForRepair(): StoredTokens {
    try {
      return this.read();
    } catch (err) {
      if (err instanceof CredentialsFileError) return {};
      throw err;
    }
  }

  private write(stored: StoredTokens): void {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    writeFileSync(this.path, `${JSON.stringify(stored, null, 2)}\n`, {
      mode: 0o600,
    });
    // `mode` applies only when the file is created.
    chmodSync(this.path, 0o600);
  }
}

export interface PickedToken {
  token: string;
  environment: Environment;
}

/**
 * The token a command runs with: `CHARDB_TOKEN`, else the stored one `--env`
 * names, else the only one stored.
 */
export function pickToken(input: {
  envToken?: string;
  envFlag?: Environment;
  stored: StoredTokens;
}): PickedToken {
  const { envToken, envFlag, stored } = input;

  if (envToken) {
    const environment = tokenEnvironment(envToken);
    if (!environment) {
      throw new UsageError("CHARDB_TOKEN is not a CharDB access token");
    }
    if (envFlag && envFlag !== environment) {
      throw new UsageError(
        `CHARDB_TOKEN is a ${environment} token, but --env asks for ${envFlag}`,
      );
    }
    return { token: envToken, environment };
  }

  if (envFlag) {
    const token = stored[envFlag];
    if (!token) {
      throw new UsageError(
        `No ${envFlag} token stored. Pipe one into: yarn chardb auth add`,
      );
    }
    return { token, environment: envFlag };
  }

  const available = ENVIRONMENTS.filter((environment) => stored[environment]);
  if (available.length === 0) {
    throw new UsageError(
      "No access token. Set CHARDB_TOKEN, or pipe one into: yarn chardb auth add",
    );
  }
  if (available.length > 1) {
    throw new UsageError(
      `Tokens are stored for ${available.join(", ")}. Pick one with --env`,
    );
  }
  const environment = available[0];
  return { token: stored[environment] as string, environment };
}
