import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { FlashcardSet, IFlashcard } from "@/models/FlashcardSet";
import { z } from "zod";
import { apiLogger, analytics } from "./logger";
import mongoose from "mongoose";

// Define the expected shape of the incoming request body
const saveSetSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean(),
  flashcards: z.array(z.object({
    front: z.string().min(1),
    back: z.string().min(1),
  })).min(1, "At least one flashcard is required."),
});

/**
 * Helper function to create smaller study chunks from a large set of flashcards.
 * @param originalTitle - The title of the main set.
 * @param allFlashcards - The array of all flashcards to be chunked.
 * @returns An array of flashcard subsets.
 */
function createFlashcardSubsets(originalTitle: string, allFlashcards: IFlashcard[]) {
  const subsets: Omit<IFlashcard, '_id'>[][] = [];
  const chunkSize = 20;
  const remainingFlashcards = [...allFlashcards];

  // Keep creating chunks of 20 as long as the remainder is larger than 30
  while (remainingFlashcards.length > 30) {
    const chunk = remainingFlashcards.splice(0, chunkSize);
    subsets.push(chunk);
  }

  // The last remaining cards (which will be <= 30) form the final chunk
  if (remainingFlashcards.length > 0) {
    subsets.push(remainingFlashcards);
  }

  // Format the subsets with titles
  return subsets.map((cards, index) => ({
    title: `${originalTitle}_${index + 1}`,
    flashcards: cards,
  }));
}


export async function POST(request: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const validation = saveSetSchema.safeParse(body);

    if (!validation.success) {
      apiLogger.warning("Save request failed validation.", request, { errors: validation.error.errors });
      return NextResponse.json({ error: "Invalid input.", details: validation.error.errors }, { status: 400 });
    }

    const { title, description, isPublic, flashcards } = validation.data;

    // Find the user's primary profile to associate the set with
    // For now, we assume the first profile. This can be expanded later.
    const user = await User.findById(userId).select('profiles');
    if (!user || user.profiles.length === 0) {
      apiLogger.error("User has no profiles to save flashcard set to.", request, { userId });
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }
    const profileId = user.profiles[0];
    
    // 1. Create the main, complete flashcard set
    const originalSet = new FlashcardSet({
      profile: profileId,
      title,
      description,
      isPublic,
      source: 'CSV',
      flashcards,
      cardCount: flashcards.length,
    });
    
    // All sets to be saved in one go
    const setsToCreate = [originalSet];

    // 2. Create smaller study subsets if the total card count is over 30
    if (flashcards.length > 30) {
      const subsets = createFlashcardSubsets(title, flashcards);
      
      subsets.forEach(subset => {
        setsToCreate.push(new FlashcardSet({
            profile: profileId,
            title: subset.title,
            isPublic, // Subsets inherit public status
            source: 'CSV',
            flashcards: subset.flashcards,
            cardCount: subset.flashcards.length,
            parentSetId: originalSet._id, // Link back to the main set
        }));
      });
    }
    
    // 3. Save all sets to the database
    const createdSets = await FlashcardSet.insertMany(setsToCreate);

    // 4. Log analytics event
    await analytics.trackSetSaved(
      userId,
      {
        source: 'CSV',
        totalCards: flashcards.length,
        subsetsCreated: createdSets.length - 1,
        isPublic,
      },
      request
    );

    apiLogger.info(`Successfully saved ${createdSets.length} flashcard set(s) for user.`, request, { userId, mainSetId: originalSet._id });
    
    return NextResponse.json({
        message: "Flashcard set(s) saved successfully.",
        createdSets
    }, { status: 201 });

  } catch (error) {
    apiLogger.error("An unexpected error occurred while saving a flashcard set.", request, { error });
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Database validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
