const fs = require('fs');
const path = require('path');

/**
 * Reads a JSON file, refactors flashcard keys within it, and writes to a new file.
 * Renames 'term' to 'front' and 'definition' to 'back'.
 *
 * @param {string} inputFilePath - Path to the input JSON file.
 * @param {string} outputFilePath - Path to write the refactored JSON file.
 */
function refactorFlashcardKeys(inputFilePath, outputFilePath) {
  try {
    // --- 1. Read the input JSON file ---
    console.log(`Reading data from: ${inputFilePath}`);
    const rawData = fs.readFileSync(inputFilePath, 'utf-8');

    // --- 2. Parse the JSON data ---
    console.log('Parsing JSON data...');
    const flashcardSets = JSON.parse(rawData);

    // Ensure it's an array
    if (!Array.isArray(flashcardSets)) {
      throw new Error('Input JSON is not an array as expected.');
    }

    // --- 3. Refactor the data ---
    console.log(`Processing ${flashcardSets.length} flashcard set(s)...`);
    const refactoredSets = flashcardSets.map((set, setIndex) => {
      // Check if the set has a 'flashcards' array
      if (set.flashcards && Array.isArray(set.flashcards)) {
        const refactoredFlashcards = set.flashcards.map((card, cardIndex) => {
          // Check if the card has the expected keys
          if (card.term !== undefined && card.definition !== undefined) {
            // Destructure to get old keys and any other existing properties
            const { term, definition, ...rest } = card;
            // Create new object with renamed keys and spread the rest
            return {
              front: term,
              back: definition,
              ...rest, // Preserve any other properties the card might have
            };
          } else {
            console.warn(`  - Set ${setIndex + 1}, Card ${cardIndex + 1}: Missing 'term' or 'definition'. Skipping rename.`);
            return card; // Return the card unchanged if keys are missing
          }
        });
        // Return the set with the refactored flashcards array
        return {
          ...set,
          flashcards: refactoredFlashcards,
        };
      } else {
        console.warn(`  - Set ${setIndex + 1}: Missing or invalid 'flashcards' array. Skipping.`);
        return set; // Return the set unchanged if 'flashcards' array is missing/invalid
      }
    });

    // --- 4. Convert refactored data back to JSON string ---
    console.log('Converting refactored data back to JSON...');
    // Use null, 2 for pretty-printing with 2-space indentation
    const outputJson = JSON.stringify(refactoredSets, null, 2);

    // --- 5. Write the output JSON file ---
    console.log(`Writing refactored data to: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, outputJson, 'utf-8');

    console.log('\nRefactoring complete!');

  } catch (error) {
    console.error('\nAn error occurred during refactoring:');
    console.error(error);
    process.exit(1); // Exit with an error code
  }
}

// --- Define file paths ---
// Assumes the script is run from the project root directory
const inputJsonPath = path.join(__dirname, 'docs', 'data-backup', 'flashlearnai.shared_flashcard_sets.json');
const outputJsonPath = path.join(__dirname, 'docs', 'data-backup', 'flashlearnai.shared_flashcard_sets_refactored.json');

// --- Run the refactoring function ---
refactorFlashcardKeys(inputJsonPath, outputJsonPath);
