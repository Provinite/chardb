import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { DeviantArtStrategy } from "./strategies/deviantart.strategy";
import { DiscordStrategy } from "./strategies/discord.strategy";
import { DeviantArtOAuthController } from "./deviantart-oauth.controller";
import { DiscordOAuthController } from "./discord-oauth.controller";
import { UsersModule } from "../users/users.module";
import { InviteCodesModule } from "../invite-codes/invite-codes.module";
import { DatabaseModule } from "../database/database.module";
import { ExternalAccountsModule } from "../external-accounts/external-accounts.module";
import { EmailModule } from "../email/email.module";
import { PermissionService } from "./PermissionService";
import { OwnershipService } from "./OwnershipService";
import { CommunityResolverService } from "./services/community-resolver.service";
import { CommunityMembersModule } from "../community-members/community-members.module";
import { UnauthenticatedGuard } from "./guards/UnauthenticatedGuard";
import { CommunityPermissionGuard } from "./guards/CommunityPermissionGuard";
import { GlobalPermissionGuard } from "./guards/GlobalPermissionGuard";
import { OwnershipGuard } from "./guards/OwnershipGuard";
import { SelfGuard } from "./guards/SelfGuard";
import { CharacterEditGuard } from "./guards/CharacterEditGuard";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard";
import { CustomThrottlerGuard } from "../middleware/custom-throttler.guard";
import { OrGuard } from "./guards/OrGuard";
import { AuthenticatedGuard } from "./guards/AuthenticatedGuard";

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
    ExternalAccountsModule,
    EmailModule,
    CommunityMembersModule,
  ],
  controllers: [DeviantArtOAuthController, DiscordOAuthController],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    LocalStrategy,
    DeviantArtStrategy,
    DiscordStrategy,
    PermissionService,
    OwnershipService,
    CommunityResolverService,
    UnauthenticatedGuard,
    CommunityPermissionGuard,
    GlobalPermissionGuard,
    OwnershipGuard,
    SelfGuard,
    CharacterEditGuard,
    AuthenticatedGuard,
    OptionalJwtAuthGuard,
    CustomThrottlerGuard,
    {
      provide: "PERMISSION_OR_GUARD",
      useClass: OrGuard(
        GlobalPermissionGuard,
        CommunityPermissionGuard,
        OwnershipGuard,
        SelfGuard,
        CharacterEditGuard,
        AuthenticatedGuard,
        UnauthenticatedGuard,
      ),
    },
  ],
  exports: [
    AuthService,
    PermissionService,
    OwnershipService,
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
