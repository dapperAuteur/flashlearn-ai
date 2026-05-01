import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { AppConfig, IAppConfig } from '@/models/AppConfig';

export async function GET() {
  try {
    await dbConnect();
    const config = await AppConfig.findOne({ key: 'ANNOUNCEMENT_BANNER' }).lean<IAppConfig>();

    if (!config || !config.value) {
      return NextResponse.json({ active: false });
    }

    // Optional expiresAt: ISO 8601 string. If set and in the past, suppress the banner
    // server-side so admins don't have to manually flip active:false on a deadline.
    const value = config.value as { expiresAt?: string };
    if (value.expiresAt) {
      const expiresAtMs = new Date(value.expiresAt).getTime();
      if (!Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) {
        return NextResponse.json({ active: false });
      }
    }

    return NextResponse.json(config.value);
  } catch {
    return NextResponse.json({ active: false });
  }
}
