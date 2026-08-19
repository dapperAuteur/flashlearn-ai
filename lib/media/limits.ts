/**
 * Media limits shared by the server upload paths and the browser UI. Kept apart
 * from cloudinaryUpload.ts so a client component can import the caps and the
 * accepted types without pulling the Cloudinary SDK into the bundle.
 */

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
