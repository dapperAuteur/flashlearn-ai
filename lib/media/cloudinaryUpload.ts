import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// The type lists, size caps, and validateMediaFile now live in ./limits so the
// browser can import them without the Cloudinary SDK. Re-exported here because
// the server routes have always imported them from this module.
export {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  validateMediaFile,
} from './limits';
export type { MediaValidation, MediaValidationError } from './limits';

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
