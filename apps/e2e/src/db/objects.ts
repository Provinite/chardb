import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { CFG } from "../config.js";

/**
 * The uploaded images a run leaves behind.
 *
 * The database is dropped at teardown, but S3 is not part of the database:
 * without this, every run that uploads an image adds objects to a bucket
 * nothing ever clears, and the only thing bounding it is how often somebody
 * remembers to `docker compose down`. Rows disappear, files accumulate.
 *
 * `forcePathStyle` because LocalStack serves buckets as a path segment rather
 * than a hostname; the virtual-host form would resolve
 * `chardb-images.127.0.0.1` and fail.
 */
const client = (): S3Client =>
  new S3Client({
    region: "us-east-1",
    endpoint: CFG.s3Endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
  });

const BUCKET = "chardb-images";

/**
 * Every object key currently in the bucket.
 *
 * For a spec to prove an upload really stored something: a 200 from the
 * endpoint says the request was accepted, not that bytes landed.
 */
export async function listImageObjects(): Promise<string[]> {
  const s3 = client();
  const keys: string[] = [];

  try {
    let token: string | undefined;
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }),
      );
      for (const o of listed.Contents ?? []) if (o.Key) keys.push(o.Key);
      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  } catch {
    // Bucket missing or LocalStack down: no objects, which is a true answer
    // and lets the spec's own assertion be the thing that fails.
  }

  return keys;
}

/**
 * Deletes every object in the suite's bucket.
 *
 * Safe to call when the bucket does not exist or LocalStack is not running:
 * this is cleanup, and a run that uploaded nothing should not fail at teardown
 * because there was nothing to clean.
 */
export async function emptyImageBucket(): Promise<number> {
  const s3 = client();
  let deleted = 0;

  try {
    // Paged: a listing returns at most 1000 keys, and a long-lived local
    // bucket can hold more than one run's worth.
    let token: string | undefined;
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }),
      );
      const keys = (listed.Contents ?? []).map((o) => ({ Key: o.Key! }));

      if (keys.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys },
          }),
        );
        deleted += keys.length;
      }

      token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (token);
  } catch {
    // No bucket, no LocalStack, no credentials. Nothing to clean up, and
    // failing teardown over it would turn a green run red for no reason.
  }

  return deleted;
}
