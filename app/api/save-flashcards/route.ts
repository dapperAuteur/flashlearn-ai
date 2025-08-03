import { NextResponse } from "next/server";
import type { Flashcard } from "@/types/flashcards";
import { Logger, LogContext, AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/db/mongodb";
import { authOptions } from "@/lib/auth/auth";
import { normalizeTopicForClustering } from "@/lib/utils/normalizeTopicForClustering";
import { getErrorMessage } from "@/lib/utils/getErrorMessage";

// Define a type for the expected request body to ensure type safety.
interface SaveRequestBody {
  topic: string;
  flashcards: Flashcard[];
}

export async function POST(request: Request) {
  const startTime = Date.now(); // Start timing the request duration.
  let userId: string | undefined;
  let requestId: string | null = null;
  let userRole: string | undefined;

  try {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;
    // Defaulting userRole to 'Free' if not specified, aligning with schema defaults.
    userRole = session?.user?.role || 'Student'; 

    requestId = await Logger.info(
      LogContext.FLASHCARD,
      "Save flashcards request received",
      { userId, userRole }
    );

    if (!userId) {
      await Logger.warning(LogContext.FLASHCARD, "Unauthorized attempt to save flashcards.", { requestId });
      return NextResponse.json({ error: "You must be logged in to save flashcards." }, { status: 401 });
    }

    const body: SaveRequestBody = await request.json();
    const { topic, flashcards } = body;

    if (!topic || !flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      await Logger.warning(LogContext.FLASHCARD, "Invalid body provided for saving flashcards.", { requestId, userId });
      return NextResponse.json({ error: "Topic and a valid array of flashcards are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("flashcard_sets");

    const normalizedTopic = normalizeTopicForClustering(topic);

    // Always check for an existing public set first to avoid duplicates.
    const existingPublicSet = await collection.findOne({ normalizedTopic, isPublic: true });

    if (existingPublicSet) {
      const durationMs = Date.now() - startTime;
      await Logger.info(LogContext.FLASHCARD, "Found existing public set, returning it.", {
        requestId,
        userId,
        setId: existingPublicSet._id.toString(),
        durationMs,
      });
      return NextResponse.json({
        setId: existingPublicSet._id.toString(),
        source: "shared",
        success: true,
      }, { status: 200 });
    }

    // If no public set exists, create a new one.
    // The `isPublic` flag is determined by the user's role.
    const newSet = {
      topic,
      normalizedTopic,
      flashcards,
      userId,
      isPublic: userRole === 'Free',
      ratings: { count: 0, sum: 0, average: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await collection.insertOne(newSet);
    const newSetId = insertResult.insertedId.toString();
    const durationMs = Date.now() - startTime;

    await Logger.info(LogContext.FLASHCARD, "Successfully created and saved a new flashcard set.", {
      requestId,
      userId,
      newSetId,
      isPublic: newSet.isPublic,
      durationMs, // Log the total time taken.
    });

    await AnalyticsLogger.trackEvent({
      userId,
      eventType: AnalyticsLogger.EventType.FLASHCARD_SET_SAVED,
      properties: {
        setId: newSetId,
        topic,
        cardCount: flashcards.length,
        isPublic: newSet.isPublic,
        durationMs,
      },
    });

    return NextResponse.json({
      setId: newSetId,
      source: "generated",
      success: true,
    }, { status: 201 }); // 201 Created is more appropriate for new resources.

  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = getErrorMessage(error);
    await Logger.error(
      LogContext.FLASHCARD,
      `Error saving flashcards: ${errorMessage}`,
      {
        requestId,
        userId,
        durationMs,
        metadata: {
          error,
          stack: error instanceof Error ? error.stack : undefined,
        },
      }
    );

    // Check for JSON parsing errors specifically, as they are common client-side issues.
    if (error instanceof SyntaxError && errorMessage.includes('JSON')) {
       return NextResponse.json({ error: 'Invalid request format. Please provide valid JSON.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'An unexpected error occurred while saving the flashcards.' }, { status: 500 });
  }
}
