import type { JwtStrategy } from "../strategies/jwt.strategy";

/**
 * Type for the current user in request context.
 * This is the type returned by the JWT strategy's validate method.
 *
 * The user object is populated by the JWT strategy and attached to req.user
 * by Passport.js during authentication.
 */
export type CurrentUserType = Awaited<ReturnType<JwtStrategy["validate"]>>;
