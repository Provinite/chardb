/**
 * Approve all pending images in the moderation queue for a community.
 *
 * Usage: yarn dlx tsx scripts/approve-pending-images.ts --email X --password Y
 *        yarn dlx tsx scripts/approve-pending-images.ts --email X --password Y --dry-run
 */
import { parseArgs } from "util";

const API_URL = "https://api.chardb.cc/graphql";
const COMMUNITY_ID = "3525edda-e660-4157-8158-d2308677aa0b";
const PAGE_SIZE = 50;

const args = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    limit: { type: "string" },
  },
});

const email = args.values.email;
const password = args.values.password;
const dryRun = args.values["dry-run"] ?? false;
const limit = args.values.limit ? parseInt(args.values.limit, 10) : 0;

if (!email || !password) {
  console.error("Usage: --email <email> --password <password> [--dry-run]");
  process.exit(1);
}

async function gql<T>(query: string, variables: Record<string, unknown>, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const json = await resp.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`);
  }
  return json.data as T;
}

const LOGIN = `
  mutation Login($input: LoginInput!) {
    login(input: $input) { accessToken }
  }
`;

const PENDING_COUNT = `
  query PendingCount($communityId: ID!) {
    pendingImageCount(communityId: $communityId)
  }
`;

const QUEUE = `
  query Queue($communityId: ID!, $first: Int!, $offset: Int!) {
    imageModerationQueue(communityId: $communityId, first: $first, offset: $offset) {
      total
      hasMore
      items {
        image { id }
        characterId
      }
    }
  }
`;

const APPROVE = `
  mutation Approve($input: ApproveImageInput!) {
    approveImage(input: $input) {
      id
      action
    }
  }
`;

async function main() {
  // Login
  const loginData = await gql<{ login: { accessToken: string } }>(LOGIN, {
    input: { email, password },
  });
  const token = loginData.login.accessToken;
  console.log("Logged in.");

  // Get pending count
  const countData = await gql<{ pendingImageCount: number }>(PENDING_COUNT, {
    communityId: COMMUNITY_ID,
  }, token);
  const total = countData.pendingImageCount;
  console.log(`Pending images: ${total}`);

  if (total === 0) {
    console.log("Nothing to approve.");
    return;
  }

  if (dryRun) {
    console.log(`\n=== DRY RUN — would approve ${limit > 0 ? Math.min(limit, total) : total} images ===`);
  }
  if (limit > 0) {
    console.log(`Limit: ${limit}`);
  }

  // Page through and approve
  let approved = 0;
  let offset = 0;

  while (true) {
    const queryOffset = dryRun ? offset : 0;
    const data = await gql<{
      imageModerationQueue: {
        total: number;
        hasMore: boolean;
        items: Array<{ image: { id: string }; characterId: string | null }>;
      };
    }>(QUEUE, { communityId: COMMUNITY_ID, first: PAGE_SIZE, offset: queryOffset }, token);

    const items = data.imageModerationQueue.items;
    if (items.length === 0) break;

    for (const item of items) {
      if (limit > 0 && approved >= limit) break;
      if (dryRun) {
        console.log(`[DRY RUN] approveImage(${item.image.id}) — character: ${item.characterId ?? "(none)"}`);
      } else {
        await gql(APPROVE, { input: { imageId: item.image.id } }, token);
      }
      approved++;
      if (approved % 50 === 0) {
        console.log(`  Approved ${approved}/${total}...`);
      }
    }

    if (dryRun) {
      offset += PAGE_SIZE;
    }
    if (limit > 0 && approved >= limit) break;
    if (!data.imageModerationQueue.hasMore) break;
  }

  console.log(`\nDone. Approved ${approved} images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
