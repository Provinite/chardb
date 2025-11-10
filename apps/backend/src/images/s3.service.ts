import { Injectable, Logger } from "@nestjs/common";
import { ConfigService} from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

export interface UploadImageOptions {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  userId: string;
}

export interface UploadImageResult {
  key: string;
  url: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cloudfrontDomain: string;
  private readonly endpointUrl?: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("AWS_REGION", "us-east-1");
    this.bucketName = this.configService.get<string>(
      "S3_IMAGES_BUCKET",
      "chardb-images-local"
    );
    this.cloudfrontDomain = this.configService.get<string>(
      "CLOUDFRONT_IMAGES_DOMAIN",
      "localhost:4566/chardb-images-local"
    );
    this.endpointUrl = this.configService.get<string>("AWS_ENDPOINT_URL");

    // Initialize S3 client
    this.s3Client = new S3Client({
      region,
      ...(this.endpointUrl && {
        endpoint: this.endpointUrl,
        forcePathStyle: true, // Required for LocalStack
      }),
    });

    this.logger.log(`S3Service initialized with bucket: ${this.bucketName}`);
    if (this.endpointUrl) {
      this.logger.log(`Using custom endpoint: ${this.endpointUrl}`);
    }
  }

  /**
   * Upload an image to S3
   */
  async uploadImage(options: UploadImageOptions): Promise<UploadImageResult> {
    const { buffer, filename, mimeType, userId } = options;

    // Generate S3 key: {userId}/{timestamp}-{uuid}-{sanitizedFilename}
    const timestamp = Date.now();
    const uuid = randomUUID();
    const sanitizedFilename = this.sanitizeFilename(filename);
    const key = `${userId}/${timestamp}-${uuid}-${sanitizedFilename}`;

    // Prepare upload parameters
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable", // 1 year cache
    };

    try {
      // Upload to S3
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Generate CloudFront URL
      const url = this.generateCloudFrontUrl(key);

      this.logger.log(`Successfully uploaded image to S3: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(`Failed to upload image to S3: ${error.message}`, error.stack);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Delete an image from S3
   */
  async deleteImage(keyOrUrl: string): Promise<void> {
    try {
      // Extract key from URL if full URL was provided
      const key = this.extractKeyFromUrl(keyOrUrl);

      if (!key) {
        this.logger.warn(`Could not extract key from: ${keyOrUrl}`);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Successfully deleted image from S3: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete image from S3: ${error.message}`,
        error.stack
      );
      // Don't throw - deletion failures shouldn't break the application
    }
  }

  /**
   * Delete multiple images from S3
   */
  async deleteImages(keysOrUrls: string[]): Promise<void> {
    const deletePromises = keysOrUrls.map((keyOrUrl) =>
      this.deleteImage(keyOrUrl)
    );
    await Promise.all(deletePromises);
  }

  /**
   * Generate CloudFront URL for an S3 key
   */
  private generateCloudFrontUrl(key: string): string {
    // Check if we're using LocalStack (endpoint URL set)
    if (this.endpointUrl) {
      // LocalStack URL format
      return `${this.endpointUrl}/${this.bucketName}/${key}`;
    }

    // CloudFront URL format
    return `https://${this.cloudfrontDomain}/${key}`;
  }

  /**
   * Extract S3 key from CloudFront or S3 URL
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      // If it's already a key (no protocol), return as-is
      if (!url.includes("://")) {
        return url;
      }

      const parsedUrl = new URL(url);

      // LocalStack format: http://localhost:4566/bucket-name/key
      if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
        const pathParts = parsedUrl.pathname.split("/").filter((p) => p);
        // Remove bucket name (first part), rest is the key
        return pathParts.slice(1).join("/");
      }

      // CloudFront format: https://images.chardb.cc/key or https://d123.cloudfront.net/key
      // S3 format: https://bucket.s3.region.amazonaws.com/key
      const pathname = parsedUrl.pathname.startsWith("/")
        ? parsedUrl.pathname.slice(1)
        : parsedUrl.pathname;

      return pathname || null;
    } catch (error) {
      this.logger.error(`Failed to parse URL: ${url}`, error.stack);
      return null;
    }
  }

  /**
   * Sanitize filename for S3 key
   */
  private sanitizeFilename(filename: string): string {
    // Remove path components
    const basename = filename.split("/").pop() || filename;

    // Replace special characters with hyphens, preserve extension
    const sanitized = basename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    // Limit length to 100 characters
    if (sanitized.length > 100) {
      const ext = sanitized.split(".").pop();
      const nameWithoutExt = sanitized.slice(0, sanitized.lastIndexOf("."));
      return `${nameWithoutExt.slice(0, 95)}.${ext}`;
    }

    return sanitized || "image";
  }
}
