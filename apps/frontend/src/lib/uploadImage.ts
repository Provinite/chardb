import { API_BASE_URL } from "./communityHost";
import { getAccessToken } from "./accessToken";
import type { ThumbnailCropRect } from "../components/ThumbnailCropper";

/** What `POST /images/upload` takes. Only fields the server reads. */
export interface UploadImageFields {
  file: File;
  characterId?: string;
  galleryId?: string;
  /** The community that reviews an upload with no character to say. */
  communityId?: string;
  title?: string;
  description?: string;
  altText?: string;
  visibility?: string;
  isNsfw: boolean;
  sensitiveContentDescription?: string;
  artist?: { type: "onsite" | "offsite"; link: string; label?: string };
  /** All four or none; none is the automatic centre crop. */
  thumbnailCrop?: ThumbnailCropRect;
}

/** The media row the upload created. */
export interface UploadedMedia {
  id: string;
  title: string;
  image: {
    id: string;
    originalUrl: string;
    thumbnailUrl: string;
    originalFilename: string;
    altText: string | null;
  };
}

/**
 * An upload the server refused or never received. `status` is 0 for the
 * latter; `serverMessage` is the server's own reason, when it gave one.
 */
export class ImageUploadError extends Error {
  constructor(
    readonly status: number,
    readonly serverMessage?: string,
  ) {
    super("Image upload failed");
    this.name = "ImageUploadError";
  }
}

interface UploadImageOptions {
  /** Called as the bytes go up, with the fraction sent so far. */
  onProgress?: (fraction: number) => void;
}

/**
 * Upload one image (#424). Shared by the upload page and the character create
 * form, which used to build this request separately.
 *
 * XMLHttpRequest rather than `fetch` because only it reports upload progress,
 * and a large image is long enough to want a bar.
 */
export function uploadImage(
  fields: UploadImageFields,
  { onProgress }: UploadImageOptions = {},
): Promise<UploadedMedia> {
  const body = new FormData();
  body.append("file", fields.file);

  const optional: [string, string | undefined][] = [
    ["characterId", fields.characterId],
    ["galleryId", fields.galleryId],
    ["communityId", fields.communityId],
    ["title", fields.title],
    ["description", fields.description],
    ["altText", fields.altText],
    ["visibility", fields.visibility],
    ["sensitiveContentDescription", fields.sensitiveContentDescription],
  ];
  for (const [name, value] of optional) {
    if (value) body.append(name, value);
  }
  body.append("isNsfw", String(fields.isNsfw));

  if (fields.artist?.link) {
    body.append("artistType", fields.artist.type);
    body.append("artistLink", fields.artist.link);
    if (fields.artist.label) body.append("artistLabel", fields.artist.label);
  }

  const crop = fields.thumbnailCrop;
  if (crop) {
    body.append("thumbnailCropX", String(crop.x));
    body.append("thumbnailCropY", String(crop.y));
    body.append("thumbnailCropWidth", String(crop.width));
    body.append("thumbnailCropHeight", String(crop.height));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/images/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${getAccessToken()}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        parsed = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as UploadedMedia);
        return;
      }

      const message =
        parsed && typeof parsed === "object" && "message" in parsed
          ? String((parsed as { message: unknown }).message)
          : undefined;
      reject(new ImageUploadError(xhr.status, message));
    };

    xhr.onerror = () => reject(new ImageUploadError(0));

    xhr.send(body);
  });
}
