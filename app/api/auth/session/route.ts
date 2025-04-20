// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Return a mock session for now
  return NextResponse.json({
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: "free"
    }
  });
}