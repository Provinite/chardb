/**
 * Writes the code-first GraphQL SDL to src/schema.gql without serving traffic.
 *
 * `schema.gql` is committed but only regenerated as a side effect of booting
 * the app, so it drifts whenever someone adds a field and does not happen to
 * run the backend. CI calls this to regenerate it and diff the result.
 *
 * GraphQLModule emits the file from its `onModuleInit`, so creating the app and
 * initialising it is enough -- there is no need to listen on a port. It is a
 * real boot all the same, which means a real database. From the repo root:
 *
 *   docker compose -f docker/compose.test.yml up -d --wait
 *   yarn workspace @chardb/backend schema:emit
 *
 * Run it through that script rather than directly. `autoSchemaFile` resolves
 * against `process.cwd()`, so running from anywhere but apps/backend drops the
 * schema in the wrong place.
 */
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Loads apps/backend/.env.test into process.env without overwriting anything
 * already set, so a caller can point DATABASE_URL somewhere else.
 *
 * The SDL does not depend on any of these values; the app just refuses to boot
 * without them. .env.test is the file to borrow because it is committed and
 * holds nothing but mock credentials.
 */
function loadEnvTest(): void {
  const file = path.resolve(__dirname, "../../.env.test");
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

async function main(): Promise<void> {
  loadEnvTest();

  // Imported after the env is populated: ConfigModule.forRoot() runs while
  // app.module is being evaluated, not when the app is created.
  const { NestFactory } = await import("@nestjs/core");
  const { AppModule } = await import("./app.module");

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
