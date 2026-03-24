import { NextRequest, NextResponse } from "next/server";
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from "@/models/Profile";
import { Logger, LogContext, AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { getErrorMessage } from "@/lib/utils/getErrorMessage";
import dbConnect from "@/lib/db/dbConnect";
import { normalizeTopicForClustering } from "@/lib/utils/normalizeTopicForClustering";
import { generateFlashcardsFromAI } from "@/lib/services/flashcardGeneration";
import { ADMIN_FLASHCARD_MIN, ADMIN_FLASHCARD_MAX } from "@/lib/constants";

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    
    // Moved the session check to the top and made sure it's awaited immediately.
    // This is the primary fix for the "Dynamic server usage" error.
    const session = await getServerSession(authOptions);

    // Now we can safely get the requestId, as it no longer relies on the session context.
    const requestId = await Logger.info(
        LogContext.AI,
        "AI flashcard generation request initiated."
    ) ?? `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        if (!session || !session.user || !session.user.id) {
            await Logger.warning(LogContext.AUTH, "Unauthorized attempt to generate flashcards.", { requestId });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        await dbConnect(); // Connect to MongoDB after the session check

        const userId = session.user.id;
        await Logger.info(LogContext.AUTH, "User authenticated for flashcard generation.", { requestId, userId });

        const { topic, title, description, quantity } = await request.json();
        await Logger.info(LogContext.AI, "Flashcard generation request payload received.",{
            userId,
            requestId,
            metadata: { topic, title, description, quantity }
        });

        if (!topic || typeof topic !== 'string' || topic.trim() === '') {
            await Logger.warning(LogContext.AI, "Invalid topic provided.", { requestId, userId, metadata: { topic } });
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        // Validate admin-only quantity parameter
        let validatedQuantity: number | undefined;
        if (quantity !== undefined && quantity !== null && quantity !== '') {
            if (session.user.role !== 'Admin') {
                await Logger.warning(LogContext.AUTH, "Non-admin attempted to use quantity parameter.", { requestId, userId });
                return NextResponse.json({ error: 'Forbidden: quantity selection is admin-only' }, { status: 403 });
            }
            const parsed = Number(quantity);
            if (!Number.isInteger(parsed) || parsed < ADMIN_FLASHCARD_MIN || parsed > ADMIN_FLASHCARD_MAX) {
                return NextResponse.json({
                    error: `Quantity must be an integer between ${ADMIN_FLASHCARD_MIN} and ${ADMIN_FLASHCARD_MAX}`
                }, { status: 400 });
            }
            validatedQuantity = parsed;
        }

        const { limited, reason } = await checkRateLimit(userId);
        if (limited) {
            await Logger.warning(LogContext.AI, "User rate limited for AI generation.", { requestId, userId });
            return NextResponse.json({ error: 'Too Many Requests', message: reason }, { status: 429 });
        }

        // --- Re-implemented check for existing sets ---
        // Skip cache when admin specifies a custom quantity (they want exact count)
        if (!validatedQuantity) {
          const normalizedTopic = normalizeTopicForClustering(topic);
          const existingSet = await FlashcardSetModel.findOne({
            title: normalizedTopic,
            isPublic: true,
          });

          if (existingSet) {
            await Logger.info(
              LogContext.AI,
              "Found and returning existing public flashcard set.",
              { requestId, userId, metadata: { setId: existingSet._id, title: existingSet.title } }
            );

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
        }
        // --- End of re-implemented check ---

        await AnalyticsLogger.trackPromptSubmission(userId, topic);
        const flashcards = await generateFlashcardsFromAI(topic, requestId, undefined, validatedQuantity);
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
            title: title || topic,
            description: description || '',
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
            cardCount: flashcards.length,
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
