// Set environment variables BEFORE any imports that might use them
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("Please set DATABASE_URL in your environment or .env file");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.log(
    "⚠️  JWT_SECRET not found, setting temporary value for schema export...",
  );
  process.env.JWT_SECRET = "temporary-jwt-secret-for-schema-export-only";
}
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { GraphQLSchemaHost } from "@nestjs/graphql";
import { printSchema } from "graphql";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "./app.module";

async function exportSchema() {
  try {
    console.log("🚀 Starting GraphQL schema export...");

    // Check required environment variables
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is required");
      console.error("Please set DATABASE_URL in your environment or .env file");
      process.exit(1);
    }

    // Set minimal JWT_SECRET if not provided (schema export doesn't need real auth)
    if (!process.env.JWT_SECRET) {
      console.log(
        "⚠️  JWT_SECRET not found, setting temporary value for schema export...",
      );
      process.env.JWT_SECRET = "temporary-jwt-secret-for-schema-export-only";
    }

    console.log("✅ Environment variables validated");

    console.log("📦 Creating NestJS application...");
    const app = await NestFactory.create(AppModule, {
      logger: ["log", "error", "warn", "debug", "verbose"],
    });
    console.log("✅ NestJS application created successfully");

    console.log("🔧 Initializing application...");
    await app.listen(0);
    console.log("✅ Application initialized successfully");

    console.log("📋 Getting GraphQL schema host...");
    const gqlSchemaHost = app.get(GraphQLSchemaHost);
    console.log("✅ GraphQL schema host obtained");

    console.log("🔍 Extracting schema...");
    const schema = gqlSchemaHost.schema;
    console.log("✅ Schema extracted successfully");

    console.log("🖨️  Converting schema to string...");
    const schemaString = printSchema(schema);
    console.log(
      `✅ Schema converted to string (${schemaString.length} characters)`,
    );

    // Export to shared location for frontend codegen
    const schemaPath = path.join(
      __dirname,
      "../../../packages/shared/src/schema.graphql",
    );
    const schemaDir = path.dirname(schemaPath);

    console.log(`📁 Target directory: ${schemaDir}`);
    console.log(`📄 Target file: ${schemaPath}`);

    // Ensure directory exists
    if (!fs.existsSync(schemaDir)) {
      console.log("📁 Creating directory...");
      fs.mkdirSync(schemaDir, { recursive: true });
      console.log("✅ Directory created");
    } else {
      console.log("✅ Directory already exists");
    }

    console.log("💾 Writing schema file...");
    fs.writeFileSync(schemaPath, schemaString);
    console.log("✅ Schema file written successfully");

    console.log(`✅ GraphQL schema exported to: ${schemaPath}`);

    console.log("🔚 Closing application...");
    await app.close();
    console.log("✅ Application closed successfully");

    console.log("🎉 Schema export completed successfully!");
  } catch (error) {
    console.error("💥 Error during schema export:");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    if (error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    throw error;
  }
}

exportSchema().catch((error) => {
  console.error("❌ Failed to export schema:", error);
  process.exit(1);
});
