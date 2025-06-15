#!/usr/bin/env tsx

import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function exportSchema() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const gqlSchemaHost = app.get(GraphQLSchemaHost);
  const schema = gqlSchemaHost.schema;

  const schemaString = printSchema(schema);
  
  // Export to shared location for frontend codegen
  const schemaPath = path.join(__dirname, '../../../packages/shared/src/schema.graphql');
  const schemaDir = path.dirname(schemaPath);
  
  // Ensure directory exists
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }
  
  fs.writeFileSync(schemaPath, schemaString);
  console.log(`✅ GraphQL schema exported to: ${schemaPath}`);
  
  await app.close();
}

exportSchema().catch((error) => {
  console.error('❌ Failed to export schema:', error);
  process.exit(1);
});