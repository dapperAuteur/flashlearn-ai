import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection('users').findOne(
      { email: email.toLowerCase().trim() },
      { projection: { emailVerified: 1 } }
    );

    // Don't reveal whether the account exists — only return
    // emailVerified: false when we know the account exists AND is unverified.
    // For non-existent accounts, return nothing specific so sign-in
    // proceeds normally and shows "Invalid email or password".
    if (!user) {
      return NextResponse.json({});
    }

    return NextResponse.json({ emailVerified: !!user.emailVerified });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
