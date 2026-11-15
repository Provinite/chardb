import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CredentialStore,
  defaultCredentialsPath,
  pickToken,
} from "./credentials";
import { UsageError } from "./errors";

const PROD = "chardb_pat_prod_aaaa";
const DEV = "chardb_pat_dev_bbbb";

const tempStore = () =>
  new CredentialStore(
    join(mkdtempSync(join(tmpdir(), "chardb-cli-")), "nested", "creds.json"),
  );

describe("CredentialStore", () => {
  it("is empty before anything is added", () => {
    expect(tempStore().read()).toEqual({});
  });

  it("files a token under the environment it names", () => {
    const store = tempStore();
    expect(store.add(PROD)).toBe("prod");
    expect(store.add(DEV)).toBe("dev");
    expect(store.read()).toEqual({ prod: PROD, dev: DEV });
  });

  it("replaces the stored token for the same environment", () => {
    const store = tempStore();
    store.add(PROD);
    store.add("chardb_pat_prod_cccc");
    expect(store.read()).toEqual({ prod: "chardb_pat_prod_cccc" });
  });

  it("writes a file only its owner can read", () => {
    const store = tempStore();
    store.add(PROD);
    expect(statSync(store.path).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(store.path, "utf8"))).toEqual({
      prod: PROD,
    });
  });

  it("never leaves tokens in a file others can read", () => {
    const store = tempStore();
    store.add(PROD);
    chmodSync(store.path, 0o644);

    store.add(DEV);

    expect(statSync(store.path).mode & 0o777).toBe(0o600);
    expect(readdirSync(dirname(store.path))).toEqual(["creds.json"]);
  });

  it("refuses something that is not an access token", () => {
    expect(() => tempStore().add("hunter2")).toThrow(UsageError);
  });

  it("removes one environment's token", () => {
    const store = tempStore();
    store.add(PROD);
    store.add(DEV);
    expect(store.remove("prod")).toBe(true);
    expect(store.remove("prod")).toBe(false);
    expect(store.read()).toEqual({ dev: DEV });
  });
});

describe("defaultCredentialsPath", () => {
  it("lives under XDG_CONFIG_HOME when set", () => {
    expect(defaultCredentialsPath({ XDG_CONFIG_HOME: "/x" }, "/home/me")).toBe(
      "/x/chardb/credentials.json",
    );
  });

  it("lives under ~/.config otherwise", () => {
    expect(defaultCredentialsPath({}, "/home/me")).toBe(
      "/home/me/.config/chardb/credentials.json",
    );
  });
});

describe("pickToken", () => {
  it("trims CHARDB_TOKEN, as a file read by $(cat) keeps a CR", () => {
    expect(pickToken({ envToken: `${DEV}\r`, stored: {} })).toEqual({
      token: DEV,
      environment: "dev",
    });
  });

  it("takes CHARDB_TOKEN over anything stored", () => {
    expect(pickToken({ envToken: DEV, stored: { prod: PROD } })).toEqual({
      token: DEV,
      environment: "dev",
    });
  });

  it("refuses a CHARDB_TOKEN for another environment than --env", () => {
    expect(() =>
      pickToken({ envToken: DEV, envFlag: "prod", stored: {} }),
    ).toThrow(UsageError);
  });

  it("refuses a CHARDB_TOKEN that is not an access token", () => {
    expect(() => pickToken({ envToken: "nope", stored: {} })).toThrow(
      UsageError,
    );
  });

  it("takes the stored token --env names", () => {
    expect(
      pickToken({ envFlag: "dev", stored: { prod: PROD, dev: DEV } }),
    ).toEqual({ token: DEV, environment: "dev" });
  });

  it("refuses an --env with nothing stored", () => {
    expect(() => pickToken({ envFlag: "dev", stored: { prod: PROD } })).toThrow(
      UsageError,
    );
  });

  it("takes the only stored token without --env", () => {
    expect(pickToken({ stored: { prod: PROD } })).toEqual({
      token: PROD,
      environment: "prod",
    });
  });

  it("asks for --env when several are stored", () => {
    expect(() => pickToken({ stored: { prod: PROD, dev: DEV } })).toThrow(
      /--env/,
    );
  });

  it("says how to add one when there is none", () => {
    expect(() => pickToken({ stored: {} })).toThrow(/auth add/);
  });
});
