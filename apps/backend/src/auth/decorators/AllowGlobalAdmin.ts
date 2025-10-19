import { GlobalPermission } from '../GlobalPermission';
import { AllowGlobalPermission } from './AllowGlobalPermission';

/**
 * Decorator to require global admin privileges
 *
 * This is a convenience decorator that's equivalent to:
 * @AllowGlobalPermission(GlobalPermission.IsAdmin)
 *
 * @see {@link AllowGlobalPermission}
 */
export const AllowGlobalAdmin = () =>
  AllowGlobalPermission(GlobalPermission.IsAdmin);
