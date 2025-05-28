// app/api/study/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.STUDY, "Create study session request");

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
      const client = await clientPromise;
      const db = client.db();

    // Get user ID

    const userId = new ObjectId(session.user.id);

    // Parse request body
    const body = await request.json();
    console.log('/api/study/sessions POST line 23 body :>> ', body);
    const { listId, mode } = body;
    console.log('/api/study/sessions POST line 25 listId :>> ', listId);
    console.log('/api/study/sessions POST line 26 mode :>> ', mode); // BUG? mode is undefined when Regular study mode is chosen


    let flashcards;

    if (mode === 'review') {
      // Build URL with query parameters
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const reviewUrl = new URL('/api/study/review-queue', baseUrl);

      if (listId) {
        reviewUrl.searchParams.set('listId', listId);
      }

      // Create headers with authentication
      const headers = new Headers();
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        headers.set('cookie', cookieHeader);
      }

      // Fetch from review queue
      const reviewResponse = await fetch(reviewUrl.toString(), { headers });

      if (!reviewResponse.ok) {
        throw new Error('Failed to fetch review queue');
      }
    
      const reviewData = await reviewResponse.json();
      console.log('/api/study/sessions POST line 61 reviewData :>> ', reviewData);
      flashcards = reviewData.cards;
    } else {
      if (!listId) {
        return NextResponse.json({ error: "List ID is required for regular study mode" }, { status: 400 });
      }

      // Get flashcards for this list
      flashcards = await db.collection('flashcards')
        .find({
          listId,
          userId // is it a BUG: userId is causing list to return null, fix it
        })
        .toArray();

        console.log('/api/study/sessions POST line 77 flashcards[0] :>> ', flashcards[0]);


      
      // // Verify list exists and belongs to user
      // const list = await db.collection('lists').findOne({
      //   _id: new ObjectId(listId),
      //   // userId: new ObjectId(session.user.id) // BUG userId is causing list to return null, fix it
      // });

      // console.log('/api/study/sessions POST line 61 list :>> ', list);
      
      // if (!list) {
      //   return NextResponse.json({ error: "List not found" }, { status: 404 });
      // }
      
      

      
    }
    
      if (!flashcards ||flashcards.length === 0) {
        return NextResponse.json({ error: "No flashcards in this list" }, { status: 404 });
      }
      
      // Create new study session
      const studySession = {
        userId,
        listId: listId || null,
        mode: mode || 'regular',
        flashcardIds: flashcards.map((card: any) => card._id),
        startTime: new Date(),
        status: 'active',
        totalCards: flashcards.length,
        correctCount: 0,
        incorrectCount: 0,
        completedCards: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('/api/study/sessions POST line 93 studySession :>> ', studySession);
      
      const result = await db.collection('studySessions').insertOne(studySession); // BUG

      const sessionId = result.insertedId.toString();
      console.log('/api/study/sessions POST line 123 sessionId :>> ', sessionId);
      
      await Logger.info(LogContext.STUDY, "Study session created successfully", {
        requestId,
        userId,
        mode,
        sessionId,
        metadata: { sessionId: result.insertedId.toString(), cardCount: flashcards.length }
      });
      
      return NextResponse.json({
        sessionId: result.insertedId.toString(),
        flashcards: flashcards.map((card: any) => ({
          id: card._id.toString(),
          _id: card._id.toString(),
          front: card.front,
          back: card.back,
          frontImage: card.frontImage,
          backImage: card.backImage,
          stage: card.stage || 0,
          nextReviewDate: card.nextReviewDate || null,
        }))
      });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `Error creating study session: ${errorMessage}`, {
      requestId,
      metadata: {
        error, stack: error instanceof Error ? error.stack : undefined
      }
    });
    return NextResponse.json({ error: "Failed to create study session" }, { status: 500 });
  }
}