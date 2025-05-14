import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { Flashcard } from "@/types/flashcards";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/db/mongodb";

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

export async function POST(request: Request) {
  const startTime = Date.now();
  let userId = undefined;
  let requestId = undefined;

  try {
    // Get authenticated user if available
    const session = await getServerSession();
    userId = session?.user?.id;

    const client = await clientPromise;
    const db = client.db();
    
    // Log request
    requestId = await Logger.info(
      LogContext.AI, 
      "AI flashcard generation request", 
      { userId, request }
    );
    if (!genAI) {
      await Logger.error(
        LogContext.AI,
        "Missing GEMINI_API_KEY environment variable",
        { requestId }
      );
      return NextResponse.json({ error: "API key not configured on server." }, { status: 500 });
    }
    
    const { topic } = await request.json();

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      await Logger.warning(
        LogContext.AI,
        "Invalid topic provided",
        { requestId, metadata: { topic } }
      );
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Check for existing similar flashcard sets
    const normalizedTopic = topic.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const existingSets = await db.collection("shared_flashcard_sets")
      .find({ 
        normalizedTopic: normalizedTopic,
        // "ratings.count": { $gte: 3 },  // Only use sets with sufficient ratings
      })
      .sort({ 
        "ratings.average": -1,  // Highest rated first
        usageCount: -1,
        })
      .limit(1)
      .toArray();

      await Logger.debug(
        LogContext.AI,
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
      
      // Log that we're using a shared set
      await Logger.info(
        LogContext.AI,
        "Using existing shared flashcard set",
        { requestId, metadata: { topic, sharedSetId: sharedSet._id } }
      );
      
      // Increment usage count
      await db.collection("shared_flashcard_sets").updateOne(
        { _id: sharedSet._id },
        { $inc: { usageCount: 1 } }
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
        flashcards: sharedSet.flashcards,
        setId: sharedSet._id.toString(),
        source: "shared",
        rating: {
          average: sharedSet.ratings.average,
          count: sharedSet.ratings.count
        }
      });
    }

    await Logger.debug(
      LogContext.AI,
      "Generating flashcards",
      { requestId, metadata: { topic } }
    );

    const prompt = `Generate a list of flashcards for the topic of "${topic}". Each flashcard should have a term and a concise definition. Format the output as a list of "Front: Back" pairs, with each pair on a new line. Ensure terms are set to front and definitions are set to back. Front (Terms) and Back (Definitions) are distinct and clearly separated by a single colon. Here's an example output:
      Hello: Hola
      Goodbye: Adiós`;
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    // Use optional chaining and nullish coalescing for safer access
    const responseText = result?.text ?? '';
  
    if (responseText) {
      const flashcards: Flashcard[] = responseText
        .split('\n')
        // Improved splitting and filtering
        .map((line) => {
          const parts = line.split(':');
          // Ensure there's a front/term and at least one part for back/definition
          if (parts.length >= 2 && parts[0].trim()) {
            const front = parts[0].trim();
            const back = parts.slice(1).join(':').trim(); // Join remaining parts for back/definition
            if (back) {
              return {front, back};
            }
          }
          return null; // Return null for invalid lines
        })
        .filter((card): card is Flashcard => card !== null); // Filter out nulls and type guard
  
      if (flashcards.length > 0) {
        const durationMs = Date.now() - startTime;
        // Log success
        await Logger.info(
          LogContext.AI,
          "Successfully generated flashcards",
          { 
            requestId, 
            metadata: { 
              topic, 
              cardCount: flashcards.length,
              durationMs
            }
          }
        );
        // Track analytics
        if (userId) {
          await AnalyticsLogger.trackAiGeneration(
            userId,
            topic,
            flashcards.length,
            durationMs
          );
        }
        // If no shared set exists, proceed with AI generation as before...
        // After successful generation, store for future use:
        await db.collection("shared_flashcard_sets").insertOne({
          topic,
          normalizedTopic,
          flashcards,
          createdBy: userId,
          usageCount: 1,
          ratings: {
            count: 0,
            sum: 0,
            average: 0
          },
          quality: 0, // Not rated yet
          createdAt: new Date(),
          updatedAt: new Date()
        });
        // When returning the response, include the setId for rating
        const insertedSet = await db.collection("shared_flashcard_sets")
        .findOne({ topic, normalizedTopic });

        return NextResponse.json({ 
        flashcards, 
        setId: insertedSet?._id.toString(),
        source: "generated" 
        });
      } else {
        await Logger.warning(
          LogContext.AI,
          "No valid flashcards could be generated",
          { 
            requestId, 
            metadata: { 
              topic, 
              responseText 
            }
          }
        );
        return NextResponse.json({ 
          error: 'No valid flashcards could be generated. Please try a different topic or format.' 
        }, { status: 400 });
      }
    } else {
      await Logger.error(
        LogContext.AI,
        "Empty response from AI",
        { requestId, metadata: { topic } }
      );
      
      return NextResponse.json({ 
        error: 'Failed to generate flashcards. Please try again later.' 
      }, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.AI,
      `Error generating flashcards: ${errorMessage}`,
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




