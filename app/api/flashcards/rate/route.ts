import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.FLASHCARD, "Flashcard rating submission", { request });
  
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    await Logger.debug(LogContext.FLASHCARD, "Rating request received", {
      requestId,
      hasSession: !!session,
      userId,
      request,
      metadata: {
        headers: Object.fromEntries(request.headers.entries())
      }
    });
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { setId, rating } = await request.json();
    
    // Validate input
    if (!setId || typeof setId !== 'string') {
      return NextResponse.json({ error: "Set ID is required" }, { status: 400 });
    }
    
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 });
    }
    
    // Connect to DB
    const client = await clientPromise;
    const db = client.db();
    
    // Find the set
    const set = await db.collection("shared_flashcard_sets").findOne({ 
      _id: new ObjectId(setId) 
    });
    
    if (!set) {
      await Logger.warning(LogContext.FLASHCARD, "Rating given for non-existent flashcard set", {
        requestId, metadata: { setId }
      });
      return NextResponse.json({ error: "Flashcard set not found" }, { status: 404 });
    }
    
    // Record the rating in a separate collection to track user-specific ratings
    await db.collection("flashcard_ratings").updateOne(
      { userId, setId: new ObjectId(setId) },
      { 
        $set: { 
          rating,
          updatedAt: new Date()
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
    
    // Update the aggregate ratings on the set
    await db.collection("shared_flashcard_sets").updateOne(
      { _id: new ObjectId(setId) },
      { 
        $inc: { 
          "ratings.sum": rating,
          "ratings.count": 1
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
    
    // Recalculate and update the average rating
    const updatedSet = await db.collection("shared_flashcard_sets").findOne({ 
      _id: new ObjectId(setId) 
    });
    
    if (updatedSet && updatedSet.ratings) {
      const average = updatedSet.ratings.sum / updatedSet.ratings.count;
      
      await db.collection("shared_flashcard_sets").updateOne(
        { _id: new ObjectId(setId) },
        { $set: { "ratings.average": average } }
      );
    }
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: "flashcard_set_rated",
      properties: {
        setId,
        rating,
        topic: set.topic
      }
    });
    
    // Log success
    await Logger.info(LogContext.FLASHCARD, "Flashcard set rated successfully", {
      requestId,
      userId,
      metadata: { 
        setId, 
        rating,
        newAverage: updatedSet?.ratings?.average
      }
    });
    
    return NextResponse.json({ 
      success: true,
      newAverage: updatedSet?.ratings?.average 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(LogContext.FLASHCARD, `Error rating flashcard set: ${errorMessage}`, {
      requestId,
      metadata: {
        error,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    
    return NextResponse.json({ 
      error: "Failed to submit rating. Please try again." 
    }, { status: 500 });
  }
}