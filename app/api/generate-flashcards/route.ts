import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { Flashcard } from "@/types/flashcards";

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

export async function POST(request: Request) {
  try {
    if (!genAI) {
      console.error("Missing GEMINI_API_KEY environment variable");
      // Don't expose the error details directly in production if possible
      // return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      // For development, this is okay:
      return NextResponse.json({ error: "API key not configured on server." }, { status: 500 });
    }
    
    const { topic } = await request.json();

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    const prompt = `Generate a list of flashcards for the topic of "${topic}". Each flashcard should have a term and a concise definition. Format the output as a list of "Term: Definition" pairs, with each pair on a new line. Ensure terms and definitions are distinct and clearly separated by a single colon. Here's an example output:
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
          // Ensure there's a term and at least one part for definition
          if (parts.length >= 2 && parts[0].trim()) {
            const term = parts[0].trim();
            const definition = parts.slice(1).join(':').trim(); // Join remaining parts for definition
            if (definition) {
              return {term, definition};
            }
          }
          return null; // Return null for invalid lines
        })
        .filter((card): card is Flashcard => card !== null); // Filter out nulls and type guard
  
      if (flashcards.length > 0) {
        console.log('Generated flashcards:');
        flashcards.forEach((flashcard, index) => {
          // console.log(`flashcard:index :>> , ${flashcard}:${index}`);
        });
        return NextResponse.json({ flashcards });
      } else {
        console.log('No valid flashcards could be generated from the response. Please check the format.');
        
      }
    } else {
      console.log('Failed to generate flashcards or received an empty response. Please try again.');
      
    }
  } catch (error) {
    console.log('error :>> ', error);
  }
}




