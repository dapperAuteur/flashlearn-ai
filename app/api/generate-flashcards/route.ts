import { NextRequest, NextResponse } from "next/server";
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from "@/models/Profile";
import type { Flashcard } from "@/types/flashcard";
import { Logger, LogContext, AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { FLASHCARD_MAX, FLASHCARD_MIN, MODEL } from '@/lib/constants';
import { getErrorMessage } from "@/lib/utils/getErrorMessage";
import dbConnect from "@/lib/db/dbConnect";
import { normalizeTopicForClustering } from "@/lib/utils/normalizeTopicForClustering";


async function generateFlashcardsFromAI(topic: string, requestId: string): Promise<Flashcard[]> {
    const fullPrompt = `
      Based on the following topic, generate a set of ${FLASHCARD_MIN} to ${FLASHCARD_MAX} flashcards.
      The topic is: "${topic}".
      IMPORTANT: Use only information from vetted, peer-reviewed, and trustworthy sources to generate the content for these flashcards.
      Please respond with ONLY a valid JSON array of objects. Each object should represent a flashcard and have two properties: "front" (the question or term) and "back" (the answer or definition).
      Do not include any text, explanation, or markdown formatting before or after the JSON array.

      Example format:
      [\n        {\n          "front": "What is the capital of France?",\n          "back": "Paris"\n        },\n        {\n          "front": "What is 2 + 2?",\n          "back": "4"\n        }\n      ]
    `;

    try {
        const result = await MODEL.generateContent(fullPrompt);
        const responseText = result.response.text();

        if (!responseText) {
            await Logger.warning(LogContext.AI, "AI returned an empty response.", { requestId, metadata: { topic } });
            throw new Error("AI returned an empty response.");
        }

        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (!jsonMatch) {
            await Logger.warning(LogContext.AI, "AI response did not contain a valid JSON array.", {
                requestId,
                metadata: { responseText }
            });
            throw new Error("Could not parse flashcards from AI response.");
        }

        const flashcards: Flashcard[] = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(flashcards) || flashcards.some(card => !card.front || !card.back)) {
            await Logger.warning(LogContext.AI, "Parsed JSON from AI is not in the expected Flashcard[] format.", {
                requestId,
                metadata: { parsedJson: flashcards }
            });
            throw new Error("Parsed JSON from AI is not in the expected Flashcard[] format.");
        }
        return flashcards;
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        await Logger.error(
            LogContext.AI,
            `Error in AI flashcard generation: ${errorMessage}`,
            { requestId, metadata: { error, stack: error instanceof Error ? error.stack : undefined } }
        );
        throw error;
    }
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = await Logger.info(
        LogContext.AI,
        "AI flashcard generation request initiated."
    ) ?? `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        await dbConnect(); // Connect to MongoDB
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            await Logger.warning(LogContext.AUTH, "Unauthorized attempt to generate flashcards.", { requestId });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        await Logger.info(LogContext.AUTH, "User authenticated for flashcard generation.", { requestId, userId });

        const { topic } = await request.json();
        // Corrected Logger.log call
        await Logger.info(LogContext.AI,"Flashcard generation request payload received.",{
            userId,
            requestId,
            metadata: { topic }
        });

        if (!topic || typeof topic !== 'string' || topic.trim() === '') {
            await Logger.warning(LogContext.AI, "Invalid topic provided.", { requestId, userId, metadata: { topic } });
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const { limited, reason } = await checkRateLimit(userId);
        if (limited) {
            await Logger.warning(LogContext.AI, "User rate limited for AI generation.", { requestId, userId });
            return NextResponse.json({ error: 'Too Many Requests', message: reason }, { status: 429 });
        }

        // --- Re-implemented check for existing sets ---
        const normalizedTopic = normalizeTopicForClustering(topic);
        const existingSet = await FlashcardSetModel.findOne({
          title: normalizedTopic,
          isPublic: true,
          // You could add other criteria here, like a minimum rating or usage count
        });

        if (existingSet) {
          await Logger.info(
            LogContext.AI,
            "Found and returning existing public flashcard set.",
            { requestId, userId, metadata: { setId: existingSet._id, title: existingSet.title } }
          );

          // Update usage count for the existing set
          await FlashcardSetModel.findByIdAndUpdate(existingSet._id, { $inc: { usageCount: 1 } });
          await AnalyticsLogger.trackEvent({
            userId,
            eventType: AnalyticsLogger.EventType.SHARED_FLASHCARDS_USED,
            properties: {
              setId: existingSet._id.toString(),
              topic: existingSet.title,
              cardCount: existingSet.flashcards.length
            }
          });

          return NextResponse.json({
            flashcards: existingSet.flashcards,
            setId: existingSet._id.toString(),
            source: "shared",
            rating: {
              average: existingSet.ratings?.average || 0,
              count: existingSet.ratings?.count || 0
            }
          });
        }
        // --- End of re-implemented check ---

        await AnalyticsLogger.trackPromptSubmission(userId, topic);
        const flashcards = await generateFlashcardsFromAI(topic, requestId);
        const durationMs = Date.now() - startTime;

        if (!flashcards || flashcards.length === 0) {
            await Logger.warning(
                LogContext.AI,
                "AI generation resulted in no valid flashcards.",
                { requestId, userId, metadata: { topic, flashcardsCount: flashcards?.length ?? 0 } }
            );
            return NextResponse.json({
                error: 'No valid flashcards could be generated. Please try a different topic or format.'
            }, { status: 400 });
        }

        await incrementGenerationCount(userId);
        await AnalyticsLogger.trackAiGeneration(userId, topic, flashcards.length, durationMs);

        let userProfile = await ProfileModel.findOne({ user: userId });
        if (!userProfile) {
            await Logger.info(LogContext.USER, "No profile found, creating a new default profile.", { requestId, userId });
            userProfile = await ProfileModel.create({
                user: userId,
                profileName: 'Default Profile'
            });
        }
        await Logger.info(LogContext.USER, "Profile identified for flashcard set creation.", { requestId, userId, metadata: { profileId: userProfile._id } });

        const newSet = await FlashcardSetModel.create({
            profile: userProfile._id,
            title: topic,
            isPublic: true,
            source: 'Prompt',
            flashcards: flashcards.map(card => ({
                ...card,
                mlData: {
                    easinessFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: new Date(),
                }
            })),
        });

        await Logger.info(
            LogContext.FLASHCARD,
            "Successfully created new flashcard set.",
            { requestId, userId, metadata: { setId: newSet._id, title: newSet.title, cardCount: newSet.flashcards.length } }
        );

        return NextResponse.json({
            flashcards: newSet.flashcards,
            setId: newSet._id.toString(),
            source: "generated",
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        await Logger.error(
            LogContext.AI,
            `Error in flashcard generation route: ${errorMessage}`,
            { requestId, metadata: { error, stack: error instanceof Error ? error.stack : undefined } }
        );
        return NextResponse.json({
            error: 'An unexpected error occurred while generating flashcards.'
        }, { status: 500 });
    }
}
