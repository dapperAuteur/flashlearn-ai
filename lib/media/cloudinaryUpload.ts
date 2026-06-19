import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export interface MediaValidation {
  ok: true;
  kind: 'image' | 'video';
}
export interface MediaValidationError {
  ok: false;
  error: string;
}

/** Validate a file's mime type and size before uploading. */
export function validateMediaFile(mimeType: string, size: number): MediaValidation | MediaValidationError {
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);
  if (!isImage && !isVideo) {
    return { ok: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV.' };
  }
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (size > maxSize) {
    return { ok: false, error: `File too large. Max ${maxSize / (1024 * 1024)}MB for ${isImage ? 'images' : 'videos'}.` };
  }
  return { ok: true, kind: isImage ? 'image' : 'video' };
}

export interface UploadedMedia {
  url: string;
  publicId: string;
  type: 'image' | 'video';
}

/**
 * Upload a media buffer to Cloudinary and return its hosted URL. Shared by the
 * session-gated attachment route and the API-key-gated /api/v1/media route so the
 * limits and behavior stay identical.
 */
export async function uploadMediaBuffer(
  buffer: Buffer,
  kind: 'image' | 'video',
  folder = 'flashlearn/card-media',
): Promise<UploadedMedia> {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: kind },
      (error: unknown, res: { secure_url: string; public_id: string } | undefined) => {
        if (error) reject(error);
        else if (res) resolve(res);
        else reject(new Error('Upload failed with no result.'));
      },
    );
    stream.end(buffer);
  });

  return { url: result.secure_url, publicId: result.public_id, type: kind };
}
