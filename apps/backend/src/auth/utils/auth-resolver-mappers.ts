import { LoginInput, SignupInput, AuthPayload } from "../dto/auth.dto";
import { LoginServiceInput, SignupServiceInput, AuthResponse } from "../auth.service";
import { mapPrismaUserToGraphQL } from "../../users/utils/user-resolver-mappers";
import { Prisma } from "@chardb/database";

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
  };
}

/**
 * Maps auth service response to GraphQL AuthPayload
 */
export function mapAuthResponseToGraphQL(serviceResponse: AuthResponse): AuthPayload {
  return {
    user: mapPrismaUserToGraphQL(serviceResponse.user as Prisma.UserGetPayload<{}>),
    accessToken: serviceResponse.accessToken,
    refreshToken: serviceResponse.refreshToken,
  };
}