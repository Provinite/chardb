import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { UsersModule } from "../users/users.module";
import { InviteCodesModule } from "../invite-codes/invite-codes.module";
import { DatabaseModule } from "../database/database.module";
import { PermissionService } from "./PermissionService";
import { CommunityResolverService } from "./services/community-resolver.service";
import { CommunityMembersModule } from "../community-members/community-members.module";
import { UnauthenticatedGuard } from "../common/guards/UnauthenticatedGuard";
import { CommunityPermissionGuard } from "../common/guards/CommunityPermissionGuard";
import { GlobalPermissionGuard } from "../common/guards/GlobalPermissionGuard";
import { OwnershipGuard } from "../common/guards/OwnershipGuard";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard";
import { CustomThrottlerGuard } from "../middleware/custom-throttler.guard";
import { OrGuard } from "../common/guards/OrGuard";
import { AuthenticatedGuard } from "../common/guards/AuthenticatedGuard";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow("JWT_SECRET"),
        signOptions: { expiresIn: "24h" },
      }),
    }),
    UsersModule,
    InviteCodesModule,
    DatabaseModule,
    CommunityMembersModule,
  ],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    LocalStrategy,
    PermissionService,
    CommunityResolverService,
    UnauthenticatedGuard,
    CommunityPermissionGuard,
    GlobalPermissionGuard,
    OwnershipGuard,
    AuthenticatedGuard,
    OptionalJwtAuthGuard,
    CustomThrottlerGuard,
    {
      provide: "PERMISSION_OR_GUARD",
      useClass: OrGuard(
        GlobalPermissionGuard,
        CommunityPermissionGuard,
        OwnershipGuard,
        AuthenticatedGuard,
        UnauthenticatedGuard
      ),
    },
  ],
  exports: [
    AuthService,
    PermissionService,
    CommunityResolverService,
    UnauthenticatedGuard,
    CommunityPermissionGuard,
    GlobalPermissionGuard,
    OptionalJwtAuthGuard,
    CustomThrottlerGuard,
    "PERMISSION_OR_GUARD",
  ],
})
export class AuthModule {}
