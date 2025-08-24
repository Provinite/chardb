import { TraitValueType as GraphQLTraitValueType } from "../enums/trait-value-type.enum";
import { TraitValueType as PrismaTraitValueType } from "@chardb/database";
import { assertNever } from "./assertNever";

/**
 * Maps GraphQL TraitValueType enum to Prisma TraitValueType enum
 */
export function mapGraphQLToPrismaTraitValueType(
  graphqlType: GraphQLTraitValueType,
): PrismaTraitValueType {
  switch (graphqlType) {
    case GraphQLTraitValueType.STRING:
      return PrismaTraitValueType.STRING;
    case GraphQLTraitValueType.TIMESTAMP:
      return PrismaTraitValueType.TIMESTAMP;
    case GraphQLTraitValueType.INTEGER:
      return PrismaTraitValueType.INTEGER;
    case GraphQLTraitValueType.ENUM:
      return PrismaTraitValueType.ENUM;
    default:
      assertNever(
        graphqlType,
        `Unknown GraphQL TraitValueType: ${graphqlType}`,
      );
  }
}

/**
 * Maps Prisma TraitValueType enum to GraphQL TraitValueType enum
 */
export function mapPrismaToGraphQLTraitValueType(
  prismaType: PrismaTraitValueType,
): GraphQLTraitValueType {
  switch (prismaType) {
    case PrismaTraitValueType.STRING:
      return GraphQLTraitValueType.STRING;
    case PrismaTraitValueType.TIMESTAMP:
      return GraphQLTraitValueType.TIMESTAMP;
    case PrismaTraitValueType.INTEGER:
      return GraphQLTraitValueType.INTEGER;
    case PrismaTraitValueType.ENUM:
      return GraphQLTraitValueType.ENUM;
    default:
      assertNever(prismaType, `Unknown Prisma TraitValueType: ${prismaType}`);
  }
}
