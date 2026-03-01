import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { v2 as cloudinary } from 'cloudinary';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Extracts the Cloudinary public_id from a Cloudinary URL.
 * E.g., "https://res.cloudinary.com/.../flashlearn/profile-pictures/abc123.jpg"
 * returns "flashlearn/profile-pictures/abc123"
 */
function extractPublicId(url: string): string | null {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    // Remove version prefix (e.g., "v1234567890/") and file extension
    const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
}

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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the current user to check for existing profile picture
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with resize transformation
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'flashlearn/profile-pictures',
          resource_type: 'image',
          transformation: [
            { width: 256, height: 256, crop: 'fill' },
          ],
        },
        (error: unknown, result: { secure_url: string; public_id: string } | undefined) => {
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

    // If user already has a profile picture, delete the old one from Cloudinary
    if (user.profilePicture) {
      const oldPublicId = extractPublicId(user.profilePicture);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (deleteError) {
          console.error('Error deleting old profile picture from Cloudinary:', deleteError);
          // Continue even if delete fails - the new picture is already uploaded
        }
      }
    }

    // Update user document with new profile picture URL
    user.profilePicture = uploadResult.secure_url;
    await user.save();

    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.profilePicture) {
      return NextResponse.json(
        { error: 'No profile picture to delete' },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    const publicId = extractPublicId(user.profilePicture);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error('Error deleting profile picture from Cloudinary:', deleteError);
        // Continue to remove from user doc even if Cloudinary delete fails
      }
    }

    // Set profilePicture to null on user document
    user.profilePicture = null;
    await user.save();

    return NextResponse.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
