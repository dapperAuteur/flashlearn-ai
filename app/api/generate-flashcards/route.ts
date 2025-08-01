import { NextRequest, NextResponse } from "next/server";
import type { Flashcard } from "@/types/flashcard";
import { Logger, LogContext, AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/db/mongodb";
import { authOptions } from "@/lib/auth/auth";
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { FLASHCARD_MAX, FLASHCARD_MIN, MODEL } from '@/lib/constants';
import { getErrorMessage } from "@/lib/utils/getErrorMessage";
import dbConnect from "@/lib/db/dbConnect"; // Import the Mongoose connection helper


async function generateFlashcardsFromAI(topic: string, requestId: string): Promise<Flashcard[]> {
    // This is a carefully crafted prompt to ensure the AI returns a valid JSON array.
    const fullPrompt = `
      Based on the following topic, generate a set of ${FLASHCARD_MIN} to ${FLASHCARD_MAX} flashcards.
      The topic is: "${topic}".
      IMPORTANT: Use only information from vetted, peer-reviewed, and trustworthy sources to generate the content for these flashcards.
      Please respond with ONLY a valid JSON array of objects. Each object should represent a flashcard and have two properties: "front" (the question or term) and "back" (the answer or definition).
      Do not include any text, explanation, or markdown formatting before or after the JSON array.

      Example format:
      [
        {
          "front": "What is the capital of France?",
          "back": "Paris"
        },
        {
          "front": "What is 2 + 2?",
          "back": "4"
        }
      ]
    `;
    
    const result = await MODEL.generateContent(fullPrompt);
    const responseText = result.response.text();

    if (!responseText) {
      await Logger.warning(LogContext.AI, "AI returned an empty response.", { requestId, metadata: { topic } });
      throw new Error("AI returned an empty response.");
    }

    // The AI is prompted to return a JSON string. We need to find and parse it.
    // This regex finds a JSON array within the response text.
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!jsonMatch) {
      await Logger.warning(LogContext.AI, "AI response did not contain a valid JSON array.", {
        requestId,
        metadata: { responseText }
      });
      throw new Error("Could not parse flashcards from AI response.");
    }

    const flashcards: Flashcard[] = JSON.parse(jsonMatch[0]);

    // Validate that the parsed data is in the expected format
    if (!Array.isArray(flashcards) || flashcards.some(card => !card.front || !card.back)) {
      await Logger.warning(LogContext.AI, "Parsed JSON from AI is not in the expected Flashcard[] format.", {
        requestId,
        metadata: { parsedJson: flashcards }
      });
      throw new Error("Parsed JSON from AI is not in the expected Flashcard[] format.");
    }

    return flashcards;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Now that we've passed the guard clause, userId is guaranteed to be a string.
  const userId = session.user.id;

  const startTime = Date.now();
  // Get requestId from logger, which might be null if logging is disabled at this level.
  const requestIdFromLogger = await Logger.info(
      LogContext.AI, 
      "AI flashcard generation request initiated.", 
      { userId, request }
    );

    // Ensure we have a valid requestId string. If the logger returned null, create a fallback.
  const requestId = requestIdFromLogger ?? `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // Establish Mongoose connection first. This is crucial because functions
    // like checkRateLimit use Mongoose models, which will buffer operations
    // and time out if a connection isn't ready.
    await dbConnect();
    // Now that Mongoose is connected, we can safely call checkRateLimit.
    
    const client = await clientPromise;
    const db = client.db();

    // Check rate limit before proceeding
    const { limited, reason } = await checkRateLimit(userId);
    if (limited) {
      await Logger.warning(LogContext.AI, "User rate limited", { requestId, userId });
      return NextResponse.json({ error: `Too Many Requests. Only ${limited} requests per 30 days allowed.`, message: reason }, { status: 429 });
    }
    if (!MODEL) { // check that this works as expected by removing the api key.
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

    // Track prompt submission
    await AnalyticsLogger.trackPromptSubmission(userId, topic);

    // Check for existing similar flashcard sets
    const normalizedTopic = topic.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const existingSets = await db.collection("shared_flashcard_sets") // refactor shared_flashcard_sets and import into flashcard_sets
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
      
      // Log that we're using an existing set
      await Logger.info(
        LogContext.AI,
        "Using existing flashcard set instead of generating new one.",
        { requestId, metadata: { topic, sharedSetId: sharedSet._id } }
      );
      
      // Increment usage count
      await db.collection("shared_flashcard_sets").updateOne( // change this to flashcard_sets after adding shared_flashcard_sets to flashcard_sets
        { _id: sharedSet._id },
        { $inc: { usageCount: 1 } }
      );
      
      // Track analytics for shared set usage
      if (userId) {
        await AnalyticsLogger.trackEvent({
          userId,
          eventType: AnalyticsLogger.EventType.SHARED_FLASHCARDS_USED, // change this to EXISTING_FLASHCARDS_USED
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
        source: "shared", // change to existing
        rating: {
          average: sharedSet.ratings.average,
          count: sharedSet.ratings.count
        }
      });
    }

    await Logger.debug(
      LogContext.AI,
      "No suitable existing set found. Proceeding to generate flashcards.",
      { requestId, metadata: { topic } }
    );

    const flashcards = await generateFlashcardsFromAI(topic, requestId);

    const durationMs = Date.now() - startTime;
    // Increment the user's generation count AFTER successful generation
    await incrementGenerationCount(userId);
    
    // Track the AI generation event
    await AnalyticsLogger.trackAiGeneration(userId, topic, flashcards?.length ?? 0, durationMs);
    // Use optional chaining and nullish coalescing for safer access
  
    if (!flashcards || flashcards.length === 0) {
      await Logger.warning(
          LogContext.AI,
          "AI generation resulted in no valid flashcards.",
          { 
            requestId, 
            metadata: { 
              topic, 
              flashcardsCount: flashcards?.length ?? 0 
            }
          }
        );
        return NextResponse.json({ 
          error: 'No valid flashcards could be generated. Please try a different topic or format.' 
        }, { status: 400 });
    }
    // --- Success Logic ---
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
    await AnalyticsLogger.trackAiGeneration(
      userId,
      topic,
      flashcards.length,
      durationMs
    );
    // After successful generation, store for future use:
    const newSetToInsert = {
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
    };

    const insertResult = await db.collection("shared_flashcard_sets").insertOne(newSetToInsert);
                  
    // When returning the response, include the setId for rating

    return NextResponse.json({ 
    flashcards, 
    setId: insertResult.insertedId.toString(),
    source: "generated" 
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    
    await Logger.error(
      LogContext.AI,
      `Error in flashcard generation route: ${errorMessage}`,
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
