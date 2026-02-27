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

    return NextResponse.json(config.value);
  } catch {
    return NextResponse.json({ active: false });
  }
}
