const fs = require('fs');
const path = require('path');

/**
 * Reads a JSON file containing flashcard sets, removes duplicate flashcards
 * within each set based on the 'front' key (case-sensitive), keeping the first
 * occurrence, and writes the result to a new file.
 *
 * @param {string} inputFilePath - Path to the input JSON file.
 * @param {string} outputFilePath - Path to write the deduplicated JSON file.
 */
function deduplicateFlashcards(inputFilePath, outputFilePath) {
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

    // --- 3. Process each set to deduplicate flashcards ---
    console.log(`Processing ${flashcardSets.length} flashcard set(s) for duplicates...`);
    let totalDuplicatesRemoved = 0;

    const deduplicatedSets = flashcardSets.map((set, setIndex) => {
      // Check if the set has a 'flashcards' array
      if (!set.flashcards || !Array.isArray(set.flashcards)) {
        console.warn(`  - Set ${setIndex + 1} (Topic: ${set.topic || 'N/A'}): Missing or invalid 'flashcards' array. Skipping deduplication for this set.`);
        return set; // Return the set unchanged
      }

      const seenFronts = new Set(); // Keep track of 'front' values encountered in this set
      const uniqueFlashcards = [];
      let duplicatesInSet = 0;

      for (const card of set.flashcards) {
        // Ensure card has a 'front' property and it's a string
        if (card && typeof card.front === 'string') {
          const frontValue = card.front;
          if (!seenFronts.has(frontValue)) {
            // First time seeing this 'front' value in this set
            seenFronts.add(frontValue);
            uniqueFlashcards.push(card); // Keep this card
          } else {
            // Duplicate 'front' value found
            duplicatesInSet++;
          }
        } else {
          console.warn(`  - Set ${setIndex + 1} (Topic: ${set.topic || 'N/A'}): Found card without a valid 'front' property. Skipping card:`, card);
          uniqueFlashcards.push(card); // Optionally keep cards without 'front' or filter them out
        }
      }

      if (duplicatesInSet > 0) {
        console.log(`  - Set ${setIndex + 1} (Topic: ${set.topic}): Removed ${duplicatesInSet} duplicate(s).`);
        totalDuplicatesRemoved += duplicatesInSet;
      }

      // Return the set with the deduplicated flashcards array
      return {
        ...set,
        flashcards: uniqueFlashcards,
      };
    });

    // --- 4. Convert deduplicated data back to JSON string ---
    console.log('\nConverting deduplicated data back to JSON...');
    // Use null, 2 for pretty-printing with 2-space indentation
    const outputJson = JSON.stringify(deduplicatedSets, null, 2);

    // --- 5. Write the output JSON file ---
    console.log(`Writing deduplicated data to: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, outputJson, 'utf-8');

    console.log(`\nDeduplication complete! Total duplicates removed: ${totalDuplicatesRemoved}`);

  } catch (error) {
    console.error('\nAn error occurred during deduplication:');
    console.error(error);
    process.exit(1); // Exit with an error code
  }
}

// --- Define file paths ---
// Assumes the script is run from the project root directory
const inputJsonPath = path.join(__dirname, 'docs', 'data-backup', 'flashlearnai.shared_flashcard_sets_refactored.json');
const outputJsonPath = path.join(__dirname, 'docs', 'data-backup', 'flashlearnai.shared_flashcard_sets_deduplicated.json'); // New output file

// --- Run the deduplication function ---
deduplicateFlashcards(inputJsonPath, outputJsonPath);
