/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import type { Flashcard } from "@/types/flashcards";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/db/mongodb";
import { authOptions } from "@/lib/auth/auth";
// import { metadata } from "@/app/layout";

export async function POST(request: Request) {
  const startTime = Date.now();
  let userId = undefined;
  let requestId = undefined;
  let userRole = undefined;

  try {
    // Get authenticated user if available
    console.log("\n");
    console.log("***********************");
    
    
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;
    userRole = session?.user?.role;

    const client = await clientPromise;
    const db = client.db();

    // Log request
    requestId = await Logger.info(
      LogContext.USER,
      "User flashcard save request by userId", { userId, request }
    );
    if (!userId) {
      await Logger.error(
        LogContext.USER,
        "Missing UserID to save flashcard. Must be AUTHENTICATED to save flashcard.", { requestId }
      );
      return NextResponse.json({
        error: "Must be LOGGED IN to save flashcard."
      }, {
        status: 401
      });
    }
    const body = await request.json();
    /*
    body contains
    {
      topic: prompt text, may be title or file name of loaded csv
      flashcards: [
        {
          front: 'term',
          back: 'definition'
        },
        {
          front: 'term',
          back: 'definition'
        },...
      ],
      userEmail: 'email@email.com'
    }
    **/
   if (!body) {
    await Logger.warning(
      LogContext.USER,
      "Body wasn't provided to save flashcard for this requestId",
      { requestId, metadata: { body } }
    );
    return NextResponse.json({
      error: "Body wasn't provided to save flashcard."
    }, {
      status: 400
    });
   }
    const flashcards: Flashcard = body.flashcards;
    const topic = body.topic;
    const userEmail = body.userEmail;

    const normalizedTopic = topic.toLowerCase().replace(/[^\w\s]/g, '').trim();
    // check if free vs paid user
    // if free save to shared_flashcard_sets collection
    // else save to flashcards collection
    if (userRole === 'free') {
      const existingSets = await db.collection("shared_flashcard_sets")
        .find({
          normalizedTopic: normalizedTopic,
        })
        .sort({
          "ratings.average": -1,  // Highest rated first
          usageCount: -1,
        })
        .limit(1)
        .toArray();
        await Logger.debug(
          LogContext.USER,
          "Searched for existing flashcard sets", 
          { 
            requestId, 
            metadata: { 
              normalizedTopic, 
              existingSetsCount: existingSets.length,
              firstSetId: existingSets[0]?._id?.toString()
            }
          }
        );

      if (existingSets.length > 0) {
        const sharedSet = existingSets[0];
        const durationMs = Date.now() - startTime;
        
        // Log that a similar shared set already exists in the db.
        await Logger.info(
          LogContext.USER,
          "Similar shared flashcard set already exists in the db.",
          {
            requestId,
            metadata: {
              topic,
              sharedSetId: sharedSet._id,
              durationMs
            }
          }
        );
        
        // Track analytics for shared set usage
        if (userId) {
          await AnalyticsLogger.trackEvent({
            userId,
            eventType: AnalyticsLogger.EventType.SHARED_FLASHCARDS_USED,
            properties: { 
              setId: sharedSet._id.toString(),
              topic: sharedSet.topic,
              cardCount: sharedSet.flashcards.length
            },
          });
        }
        
        // When returning existing set, include rating info
        return NextResponse.json({ 
          flashcards: flashcards,
          setId: sharedSet._id.toString(),
          source: "shared",
          rating: {
            average: sharedSet.ratings.average,
            count: sharedSet.ratings.count
          },
          success: true
        }, {
          status: 200
        });
      }
    } else {
      // currenlty it does the same thing as if the 'if' statement is true. Change later to allow 'paid' users to have private collections
      const existingSets = await db.collection("shared_flashcard_sets")
        .find({
          normalizedTopic: normalizedTopic,
        })
        .sort({
          "ratings.average": -1,  // Highest rated first
          usageCount: -1,
        })
        .limit(1)
        .toArray();
        await Logger.debug(
          LogContext.USER,
          "Searched for existing flashcard sets", 
          { 
            requestId, 
            metadata: { 
              normalizedTopic, 
              existingSetsCount: existingSets.length,
              firstSetId: existingSets[0]?._id?.toString()
            }
          }
        );

      if (existingSets.length > 0) {
        const sharedSet = existingSets[0];
        
        // Log that a similar shared set already exists in the db.
        await Logger.info(
          LogContext.USER,
          "Similar shared flashcard set already exists in the db.",
          { requestId, metadata: { topic, sharedSetId: sharedSet._id } }
        );
        
        // Track analytics for shared set usage
        if (userId) {
          await AnalyticsLogger.trackEvent({
            userId,
            eventType: AnalyticsLogger.EventType.SHARED_FLASHCARDS_USED,
            properties: { 
              setId: sharedSet._id.toString(),
              topic: sharedSet.topic,
              cardCount: sharedSet.flashcards.length
            }
          });
        }
        
        // When returning existing set, include rating info
        return NextResponse.json({ 
          flashcards: flashcards,
          setId: sharedSet._id.toString(),
          source: "shared",
          rating: {
            average: sharedSet.ratings.average,
            count: sharedSet.ratings.count
          },
          success: true,
        }, {
          status: 200
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.USER,
      `Error saving flashcards: ${errorMessage}`,
      { 
        requestId, 
        metadata: { 
          error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    );
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred while generating flashcards.' 
    }, { status: 500 });
  }
}