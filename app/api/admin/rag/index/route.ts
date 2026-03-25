import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { reindexAll } from '@/lib/services/ragService';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const stats = await reindexAll();

    return NextResponse.json({
      message: 'Reindexing complete.',
      stats,
    });
  } catch (error) {
    console.error('RAG reindex error:', error);
    return NextResponse.json(
      { error: 'Failed to reindex content.' },
      { status: 500 },
    );
  }
}
