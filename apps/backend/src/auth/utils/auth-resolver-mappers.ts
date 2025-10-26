import { LoginInput, SignupInput, AuthPayload } from "../dto/auth.dto";
import { LoginServiceInput, SignupServiceInput, AuthResponse } from "../auth.service";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps LoginInput to service input format
 */
export function mapLoginInputToService(input: LoginInput): LoginServiceInput {
  return {
    email: input.email,
    password: input.password,
  };
}

/**
 * Maps SignupInput to service input format
 */
export function mapSignupInputToService(input: SignupInput): SignupServiceInput {
  return {
    username: input.username,
    email: input.email,
    password: input.password,
    displayName: input.displayName,
    inviteCode: input.inviteCode,
  };
}

/**
 * Maps auth service response to GraphQL AuthPayload
 * Note: User data is not included to prevent bypassing field-level authorization.
 * Clients should fetch user data via the authenticated 'me' query after login.
 */
export function mapAuthResponseToGraphQL(serviceResponse: AuthResponse): AuthPayload {
  return {
    accessToken: serviceResponse.accessToken,
    refreshToken: serviceResponse.refreshToken,
  };
}