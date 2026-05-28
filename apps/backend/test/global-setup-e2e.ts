import { execSync } from 'child_process';
import * as path from 'path';

const TEST_DATABASE_URL = 'postgresql://test_user:test_password@localhost:5440/chardb_test';
const COMPOSE_FILE = path.resolve(__dirname, '../../../docker/compose.test.yml');

export default async function globalSetup() {
  console.log('\n[e2e] Starting test database container...');
  // --wait blocks until the postgres healthcheck passes, preventing db:push
  // from racing against a container that isn't ready to accept connections yet.
  execSync(`docker compose -f ${COMPOSE_FILE} up -d --wait`, { stdio: 'inherit' });

  console.log('[e2e] Pushing schema to test database...');
  execSync('yarn workspace @chardb/backend db:push', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
  console.log('[e2e] Test database ready.\n');
}
