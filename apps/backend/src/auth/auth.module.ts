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
  ],
  exports: [AuthService, PermissionService, CommunityResolverService],
})
export class AuthModule {}
