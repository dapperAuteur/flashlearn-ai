import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { validateMediaFile, uploadMediaBuffer } from '@/lib/media/cloudinaryUpload';
import { Logger, LogContext } from '@/lib/logging/logger';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/media
 *
 * Upload an image or video and get back a hosted https URL to use as a card's
 * frontImage/backImage. Partners that already host their media can skip this and
 * set the URL directly on the card. Multipart form-data with a single `file`.
 */
async function handler(request: NextRequest, _context: ApiAuthContext, requestId: string) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Expected multipart/form-data with a file field.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return apiError('INVALID_INPUT', requestId, { field: 'file' }, 'A file is required.');
  }

  const check = validateMediaFile(file.type, file.size);
  if (!check.ok) {
    return apiError('INVALID_INPUT', requestId, { field: 'file' }, check.error);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMediaBuffer(buffer, check.kind, 'flashlearn/card-media');
    return apiSuccess({ url: uploaded.url, publicId: uploaded.publicId, type: uploaded.type }, { requestId }, 201);
  } catch (err) {
    Logger.error(LogContext.SYSTEM, 'POST /api/v1/media: Cloudinary upload failed', {
      requestId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return apiError('INTERNAL_ERROR', requestId, undefined, 'Media upload failed.');
  }
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app', 'ecosystem'],
  requiredPermission: 'sets:write',
});
