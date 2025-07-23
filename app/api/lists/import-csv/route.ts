// app/api/lists/import-csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { AnalyticsLogger } from '@/lib/logging/logger';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "CSV import request received"
  );

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      await Logger.warning(LogContext.FLASHCARD, "Unauthorized CSV import attempt", { requestId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listName = formData.get('listName') as string;
    const isPublic = formData.get('isPublic') || 'false';


    if (!file || !listName) {
      await Logger.warning(LogContext.FLASHCARD, "Missing file or list name", { requestId });
      return NextResponse.json({ error: 'File and list name required' }, { status: 400 });
    }

    // Parse CSV
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least one data row' }, { status: 400 });
    }

    // Skip header row and parse data
    const flashcards = lines.slice(1).map(line => {
      const [front, back] = line.split(',').map(cell => 
        cell.trim().replace(/^"|"$/g, '')
      );
      return { front, back };
    }).filter(card => card.front && card.back);

    if (flashcards.length === 0) {
      return NextResponse.json({ error: 'No valid flashcards found in CSV' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Create the list
    const listResult = await db.collection('lists').insertOne({
      name: listName,
      description: `Imported from ${file.name}`,
      userId,
      isPublic: isPublic || false,
      cardCount: flashcards.length,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const listId = listResult.insertedId;

    // Create flashcards
    const flashcardsToInsert = flashcards.map(card => ({
      ...card,
      listId,
      userId,
      difficulty: 3,
      correctCount: 0,
      incorrectCount: 0,
      stage: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await db.collection('flashcards').insertMany(flashcardsToInsert);

    await AnalyticsLogger.trackEvent({
      userId,
      eventType: "csv_imported",
      properties: {
        listId: listId.toString(),
        cardCount: flashcards.length,
        fileName: file.name
      }
    });

    await Logger.info(LogContext.FLASHCARD, "CSV import completed successfully", {
      requestId,
      userId,
      metadata: { listId: listId.toString(), cardCount: flashcards.length }
    });

    return NextResponse.json({
      listId: listId.toString(),
      cardCount: flashcards.length,
      message: 'Import successful'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.FLASHCARD, `CSV import failed: ${errorMessage}`, {
      requestId,
      metadata: { error }
    });
    
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}