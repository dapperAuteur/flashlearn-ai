/**
 * @jest-environment node
 *
 * POST /api/v1/media validates the file and returns a hosted URL. Cloudinary is
 * mocked so no network/credentials are needed; withApiAuth is a pass-through.
 */

jest.mock('../../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));

jest.mock('../../../../lib/api/withApiAuth', () => {
  const { apiSuccess, apiError, generateRequestId } = jest.requireActual('../../../../lib/api/apiResponse');
  return {
    apiSuccess,
    apiError,
    generateRequestId,
    withApiAuth: (handler: (...args: unknown[]) => Promise<unknown>) => {
      return async (req: unknown) => handler(req, { user: {}, apiKey: { permissions: ['*'] }, keyType: 'ecosystem', apiTier: 'Free' }, 'req-test');
    },
  };
});

jest.mock('../../../../lib/media/cloudinaryUpload', () => {
  const actual = jest.requireActual('../../../../lib/media/cloudinaryUpload');
  return {
    ...actual,
    uploadMediaBuffer: jest.fn(async (_buf: Buffer, kind: 'image' | 'video') => ({
      url: `https://res.cloudinary.com/test/${kind}/uploaded.png`,
      publicId: 'test/uploaded',
      type: kind,
    })),
  };
});

import { NextRequest } from 'next/server';
import { POST as uploadMedia } from '@/app/api/v1/media/route';

function mediaReq(file: File | null) {
  const fd = new FormData();
  if (file) fd.set('file', file);
  return new NextRequest('https://flashlearnai.witus.online/api/v1/media', { method: 'POST', body: fd });
}

async function readJson(res: { json: () => Promise<unknown> }) {
  return (await res.json()) as { data?: Record<string, unknown>; error?: Record<string, unknown> };
}

describe('POST /api/v1/media', () => {
  it('uploads a valid image and returns a hosted URL', async () => {
    const file = new File([Buffer.from('fake-bytes')], 'muscle.png', { type: 'image/png' });
    const res = await uploadMedia(mediaReq(file));
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body.data!.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(body.data!.type).toBe('image');
  });

  it('rejects a disallowed file type', async () => {
    const file = new File([Buffer.from('x')], 'a.txt', { type: 'text/plain' });
    const res = await uploadMedia(mediaReq(file));
    expect(res.status).toBe(400);
  });

  it('rejects a request with no file', async () => {
    const res = await uploadMedia(mediaReq(null));
    expect(res.status).toBe(400);
  });
});
