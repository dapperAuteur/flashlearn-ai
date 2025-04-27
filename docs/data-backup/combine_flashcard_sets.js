const fs = require('fs');
const path = require('path');

/**
 * Reads a JSON file containing an array of flashcard set documents,
 * combines all flashcards into a single array, removes duplicates based on 'front',
 * aggregates metadata, and writes the result as a single document to a new file.
 *
 * @param {string} inputFilePath - Path to the input JSON file (array of sets).
 * @param {string} outputFilePath - Path to write the combined JSON file (single object).
 */
function combineFlashcardSets(inputFilePath, outputFilePath) {
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
    if (flashcardSets.length === 0) {
        console.log('Input array is empty. Nothing to combine.');
        // Optionally write an empty object or handle as needed
        fs.writeFileSync(outputFilePath, JSON.stringify({}, null, 2), 'utf-8');
        console.log(`Wrote empty object to: ${outputFilePath}`);
        return;
    }

    // --- 3. Combine flashcards and aggregate metadata ---
    console.log(`Combining ${flashcardSets.length} flashcard set(s)...`);
    let combinedFlashcards = [];
    let totalUsageCount = 0;
    let totalRatingCount = 0;
    let totalRatingSum = 0;
    let minCreatedAt = null;
    let maxUpdatedAt = null;
    const topics = new Set(); // Keep track of original topics

    for (const set of flashcardSets) {
      if (set.flashcards && Array.isArray(set.flashcards)) {
        combinedFlashcards.push(...set.flashcards); // Add cards to the combined list
      }
      if (set.topic) {
        topics.add(set.topic);
      }
      totalUsageCount += set.usageCount || 0;

      if (set.ratings) {
        totalRatingCount += set.ratings.count || 0;
        totalRatingSum += set.ratings.sum || 0;
      }

      // Aggregate dates (handle BSON date format)
      try {
        const createdAt = set.createdAt?.$date ? new Date(set.createdAt.$date) : null;
        const updatedAt = set.updatedAt?.$date ? new Date(set.updatedAt.$date) : null;

        if (createdAt && (!minCreatedAt || createdAt < minCreatedAt)) {
          minCreatedAt = createdAt;
        }
        if (updatedAt && (!maxUpdatedAt || updatedAt > maxUpdatedAt)) {
          maxUpdatedAt = updatedAt;
        }
      } catch (dateError) {
          console.warn(`Could not parse date for set: ${set._id?.$oid || 'N/A'}`);
      }
    }

    console.log(`Total flashcards before deduplication: ${combinedFlashcards.length}`);

    // --- 4. Deduplicate the combined flashcards based on 'front' ---
    const seenFronts = new Set();
    const uniqueCombinedFlashcards = [];
    for (const card of combinedFlashcards) {
      if (card && typeof card.front === 'string') {
        const frontValue = card.front;
        if (!seenFronts.has(frontValue)) {
          seenFronts.add(frontValue);
          uniqueCombinedFlashcards.push(card);
        }
      } else {
        console.warn('Found card without valid "front" property during final deduplication:', card);
        // Decide whether to keep or discard such cards. Let's keep them for now.
        uniqueCombinedFlashcards.push(card);
      }
    }
    const duplicatesRemoved = combinedFlashcards.length - uniqueCombinedFlashcards.length;
    console.log(`Removed ${duplicatesRemoved} duplicate(s) across all sets.`);
    console.log(`Total unique flashcards: ${uniqueCombinedFlashcards.length}`);


    // --- 5. Construct the final combined document ---
    const combinedDocument = {
      // Define a new topic for the combined set
      topic: `Combined Set (${Array.from(topics).join(', ')})`,
      normalizedTopic: `combined_${Array.from(topics).map(t => t.toLowerCase().replace(/\s+/g, '_')).join('_')}`,
      flashcards: uniqueCombinedFlashcards,
      createdBy: "combined_script", // Indicate this was generated
      usageCount: totalUsageCount,
      ratings: {
        count: totalRatingCount,
        sum: totalRatingSum,
        // Calculate average safely, avoid division by zero
        average: totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0,
      },
      quality: 0, // Reset quality for the combined set
      // Use aggregated dates, converting back to BSON-like format if desired, or ISO string
      createdAt: minCreatedAt ? { "$date": minCreatedAt.toISOString() } : null,
      updatedAt: maxUpdatedAt ? { "$date": maxUpdatedAt.toISOString() } : null,
      sourceSetsCount: flashcardSets.length, // Add count of original sets
    };

    // --- 6. Convert combined document back to JSON string ---
    console.log('\nConverting combined document back to JSON...');
    const outputJson = JSON.stringify(combinedDocument, null, 2); // Pretty-print

    // --- 7. Write the output JSON file ---
    console.log(`Writing combined document to: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, outputJson, 'utf-8');

    console.log('\nCombination complete!');

  } catch (error) {
    console.error('\nAn error occurred during combination:');
    console.error(error);
    process.exit(1); // Exit with an error code
  }
}

// --- Define file paths ---
// Assumes the script is run from the project root directory
const inputJsonPath = path.join(__dirname, 'docs', 'data-backup', 'flashlearnai.shared_flashcard_sets_deduplicated.json');
const outputJsonPath = path.join(__dirname, 'docs', 'data-backup', 'flashlearnai.combined_flashcard_set.json'); // New output file

// --- Run the combination function ---
combineFlashcardSets(inputJsonPath, outputJsonPath);
