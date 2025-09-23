import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/dbConnect"; // Import the dbConnect utility
import { User } from "@/models/User";
import { Profile } from "@/models/Profile"; // Import the Profile model
import { FlashcardSet } from "@/models/FlashcardSet";
import { z } from "zod";
import { apiLogger, analytics } from "@/lib/logging/flashcard-logger";
import { Types, MongooseError } from "mongoose";

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

// Define a simple type for the lean user object we expect
interface LeanUser {
  _id: Types.ObjectId;
  profiles?: Types.ObjectId[];
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect(); // Use the dbConnect utility

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const validation = saveSetSchema.safeParse(body);
    if (!validation.success) {
      apiLogger.warning("Save request failed validation.", request, { errors: validation.error.errors });
      return NextResponse.json({ error: "Invalid input.", details: validation.error.errors }, { status: 400 });
    }

    const { title, description, isPublic, flashcards } = validation.data;

    const user = await User.findById(userId).select('profiles').lean() as LeanUser | null;
    if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    let profileId: Types.ObjectId;

    // SELF-HEALING LOGIC: If the user has no profiles, create a default one.
    if (!user.profiles || user.profiles.length === 0) {
      apiLogger.info("User has no profiles. Creating a default profile.", request, { userId });
      
      const newProfile = new Profile({
        user: user._id,
        profileName: "My Profile", // Create a default profile
      });
      await newProfile.save();

      // Atomically add the new profile's ID to the user's profiles array
      await User.findByIdAndUpdate(user._id, { $push: { profiles: newProfile._id } });
      
      profileId = newProfile._id;
    } else {
      profileId = user.profiles[0];
    }

    const newSet = new FlashcardSet({
      profile: profileId,
      title,
      description,
      isPublic,
      source: 'CSV',
      flashcards,
      cardCount: flashcards.length,
    });

    const savedSet = await newSet.save();

    await analytics.trackSetSaved(
      userId,
      {
        source: 'CSV',
        totalCards: flashcards.length,
        subsetsCreated: 0,
        isPublic,
      },
      request
    );

    apiLogger.info(`Successfully saved flashcard set for user.`, request, { userId, setId: savedSet._id });

    return NextResponse.json({
      message: "Flashcard set saved successfully.",
      savedSet: savedSet.toObject()
    }, { status: 201 });

  } catch (error) {
    console.error("Flashcard save error:", error);
    apiLogger.error("An unexpected error occurred while saving a flashcard set.", request, { error });
    if (error instanceof MongooseError && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
        return NextResponse.json({ error: 'Database validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
