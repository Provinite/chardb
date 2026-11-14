import {
  ANONYMOUS_PERMISSIONS,
  getRequestPermissions,
  MissingRequestPermissionsError,
  RequestPermissions,
  setRequestPermissions,
} from "./request-permissions";

describe("getRequestPermissions", () => {
  it("returns what the request was given", () => {
    const req = { user: { id: "user-1" } };
    const permissions = { isAdmin: true } as RequestPermissions;
    setRequestPermissions(req, permissions);

    expect(getRequestPermissions(req)).toBe(permissions);
  });

  it("treats a request with no user as anonymous", () => {
    expect(getRequestPermissions({})).toBe(ANONYMOUS_PERMISSIONS);
    expect(getRequestPermissions({ user: null })).toBe(ANONYMOUS_PERMISSIONS);
  });

  it("treats a subscription, which has no request, as anonymous", () => {
    expect(getRequestPermissions(undefined)).toBe(ANONYMOUS_PERMISSIONS);
  });

  // Something set `req.user` without saying what the request may do. Answering
  // "nothing" would look like a permissions bug in whatever read it.
  it("throws for a signed-in request that was given none", () => {
    expect(() => getRequestPermissions({ user: { id: "user-1" } })).toThrow(
      MissingRequestPermissionsError,
    );
  });
});
