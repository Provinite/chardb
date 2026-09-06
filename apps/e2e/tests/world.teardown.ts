import { test as teardown } from "@playwright/test";
import { CFG } from "../src/config.js";
import { dropSnapshots } from "../src/db/snapshot.js";
import { dropDatabase } from "../src/db/provision.js";
import { emptyImageBucket } from "../src/db/objects.js";

teardown("drop the e2e database", async () => {
  // E2E_KEEP_DB=1 leaves everything for post-mortem inspection.
  if (CFG.keepDb) return;
  await dropSnapshots();
  await dropDatabase();
  // Uploaded images are not in the database, so dropping it leaves them on
  // disk. Without this every run that uploads adds objects to a bucket nothing
  // clears: rows vanish, files pile up.
  await emptyImageBucket();
  // The postgres container is deliberately left running: it uses tmpfs (so it
  // holds no state) and the backend Jest e2e suite shares it.
  // `docker compose -f docker/compose.test.yml down` stops it.
});
