import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { validateMediaFile, uploadMediaBuffer } from '@/lib/media/cloudinaryUpload';

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

    const check = validateMediaFile(file.type, file.size);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMediaBuffer(buffer, check.kind, 'flashlearn/attachments');

    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      type: uploaded.type,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
