import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV',
        },
        { status: 400 }
      );
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxMB}MB for ${isImage ? 'images' : 'videos'}` },
        { status: 400 }
      );
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
      resource_type: string;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'flashlearn/attachments',
          resource_type: isVideo ? 'video' : 'image',
        },
        (error: unknown, result: { secure_url: string; public_id: string; resource_type: string } | undefined) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed with no result'));
          }
        }
      );

      uploadStream.end(buffer);
    });

    const fileType = isVideo ? 'video' : 'image';

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      type: fileType,
      filename: file.name,
      size: file.size,
      mimeType,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
