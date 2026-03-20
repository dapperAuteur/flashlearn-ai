import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/api/openapi';

/**
 * GET /api/v1/openapi
 * Serves the OpenAPI 3.1 JSON specification for the FlashLearn public API.
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
