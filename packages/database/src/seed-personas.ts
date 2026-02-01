#!/usr/bin/env tsx
/**
 * User Persona Seeding Script
 *
 * Creates standard user personas for local testing.
 * Requires the backend to be running at http://localhost:4000/graphql
 *
 * Usage:
 *   yarn workspace @chardb/database db:seed-personas
 *   yarn workspace @chardb/database db:seed-personas --skip-sample-data
 */

import { seedPersonas } from "./seed-personas/index";

const args = process.argv.slice(2);

const options = {
  graphqlEndpoint: process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql",
  skipSampleData: args.includes("--skip-sample-data"),
};

seedPersonas(options)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
