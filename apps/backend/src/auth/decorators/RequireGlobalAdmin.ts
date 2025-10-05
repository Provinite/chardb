import { GlobalPermission } from "../GlobalPermission";
import { RequireGlobalPermission } from "./RequireGlobalPermission";

/**
 * Decorator to require global admin privileges
 *
 * This is a convenience decorator that's equivalent to:
 * @RequireGlobalPermission(GlobalPermission.IsAdmin)
 *
 * @see {@link RequireGlobalPermission}
 */
export const RequireGlobalAdmin = () =>
  RequireGlobalPermission(GlobalPermission.IsAdmin);
