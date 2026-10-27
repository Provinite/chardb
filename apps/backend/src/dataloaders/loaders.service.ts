import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Loaders } from "./loaders";

/**
 * Hands each request its own {@link Loaders}. Keyed on the request object, so
 * every field resolved for one request shares one set and nothing is shared
 * across requests, without making anything request-scoped in Nest.
 */
@Injectable()
export class LoadersService {
  private readonly byRequest = new WeakMap<object, Loaders>();

  constructor(private readonly db: DatabaseService) {}

  /**
   * A subscription has no request, so it gets a set of its own: correct,
   * just unbatched.
   */
  forRequest(req: object | undefined): Loaders {
    if (!req) return new Loaders(this.db);
    let loaders = this.byRequest.get(req);
    if (!loaders) {
      loaders = new Loaders(this.db);
      this.byRequest.set(req, loaders);
    }
    return loaders;
  }
}
