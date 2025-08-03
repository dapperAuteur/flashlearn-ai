import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Logger, LogContext, LogLevel } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * API route to handle logs sent from the client-side admin panel.
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret });

    // Ensure the user is an authenticated admin
    if (!token || token.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { level, context, message, metadata } = body;

    if (!level || !context || !message) {
      return NextResponse.json({ error: 'Invalid log format' }, { status: 400 });
    }

    // Map client-side level to server-side LogLevel enum
    const logLevel = (level.toUpperCase() in LogLevel) ? LogLevel[level.toUpperCase() as keyof typeof LogLevel] : LogLevel.INFO;

    // Log the event using the main server logger
    await Logger.log({
      context: context as LogContext, // Assuming client context maps to server context
      level: logLevel,
      message: `[CLIENT-SIDE] ${message}`,
      userId: token.sub, // Associate the log with the admin user
      request,
      metadata: { ...metadata, source: 'admin-ui' }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    // Use the server logger to log the error in this endpoint itself
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.SYSTEM, `Error in /api/admin/client-log: ${errorMessage}`, {
      metadata: { error }
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
