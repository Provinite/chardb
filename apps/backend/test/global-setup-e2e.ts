import { execSync } from 'child_process';

const TEST_DATABASE_URL = 'postgresql://test_user:test_password@localhost:5440/chardb_test';

export default async function globalSetup() {
  console.log('\n[e2e] Pushing schema to test database...');
  execSync('yarn workspace @chardb/backend db:push', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
  console.log('[e2e] Test database ready.\n');
}
