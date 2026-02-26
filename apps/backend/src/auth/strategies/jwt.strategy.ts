import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: unknown) => {
          const params = (
            req as { connectionParams?: { authorization?: unknown } } | undefined
          )?.connectionParams;
          const auth = params?.authorization;
          if (typeof auth === "string" && auth.startsWith("Bearer ")) {
            return auth.substring("Bearer ".length);
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET") || "your-secret-key",
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    return user;
  }
}
