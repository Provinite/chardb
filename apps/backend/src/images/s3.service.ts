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
  sizeVariant?: 'original' | 'thumbnail' | 'medium' | 'full';
  baseKey?: string; // For consistent keys across size variants
}

export interface UploadImageResult {
  key: string;
  url: string;
  baseKey: string; // The base key for generating other variants
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
    const { buffer, filename, mimeType, userId, sizeVariant, baseKey } = options;

    // Generate or use provided base key
    const base = baseKey || `${Date.now()}-${randomUUID()}`;

    // Extract file extension
    const extension = this.getExtension(filename, mimeType);

    // Generate S3 key with suffix pattern: {userId}/{baseKey}-{variant}.{ext}
    const variantSuffix = sizeVariant || 'original';
    const key = `${userId}/${base}-${variantSuffix}.${extension}`;

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Prepare upload parameters
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${sanitizedFilename}"`,
      CacheControl: "public, max-age=31536000, immutable", // 1 year cache
    };

    try {
      // Upload to S3
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Generate CloudFront URL
      const url = this.generateCloudFrontUrl(key);

      this.logger.log(`Successfully uploaded image to S3: ${key}`);

      return { key, url, baseKey: base };
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
   * Get file extension from filename or mime type
   */
  private getExtension(filename: string, mimeType: string): string {
    // Try to extract from filename first
    const match = filename.match(/\.([^.]+)$/);
    if (match) {
      return match[1].toLowerCase();
    }

    // Fall back to mime type
    const mimeExtMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    return mimeExtMap[mimeType] || "jpg";
  }

  /**
   * Sanitize filename for Content-Disposition header
   * Restricts to [-_a-zA-Z0-9].[a-zA-Z0-9] with max length of 50
   */
  private sanitizeFilename(filename: string): string {
    // Remove path components
    const basename = filename.split("/").pop() || filename;

    // Split into name and extension
    const lastDotIndex = basename.lastIndexOf(".");
    let name = lastDotIndex > 0 ? basename.slice(0, lastDotIndex) : basename;
    let ext = lastDotIndex > 0 ? basename.slice(lastDotIndex + 1) : "";

    // Sanitize name: only allow a-zA-Z0-9_-
    name = name
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    // Sanitize extension: only allow a-zA-Z0-9
    ext = ext.replace(/[^a-zA-Z0-9]/g, "");

    // Fallback if name is empty
    if (!name) {
      name = "image";
    }

    // Limit total length to 50 characters
    const maxLength = 50;
    const extLength = ext ? ext.length + 1 : 0; // +1 for the dot
    const maxNameLength = maxLength - extLength;

    if (name.length > maxNameLength) {
      name = name.slice(0, maxNameLength);
    }

    return ext ? `${name}.${ext}` : name;
  }
}
