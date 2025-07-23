'use client';

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Flashcard } from "@/types/flashcards";
import RatingStars from "@/components/RatingStars";

// Helper function to escape fields for CSV format
const escapeCsvField = (field: string): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const stringField = String(field);
  // Check if the field contains a comma, double quote, or newline
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    // Escape double quotes by doubling them and wrap the entire field in double quotes
    const escapedField = stringField.replace(/"/g, '""');
    return `"${escapedField}"`;
  }
  return stringField;
};

// Helper function to sanitize a string for use in filenames/keys
const sanitizeString = (input: string): string => {
  if (!input) return 'untitled';
  // Replace spaces with underscores, remove most non-alphanumeric chars except hyphen/underscore
  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_-]/g, ''); // Remove invalid characters
  // Prevent empty strings or just underscores/hyphens
  return sanitized.replace(/^[_-]+|[_-]+$/g, '') || 'untitled';
};

// Helper function to parse a simple CSV row (handles basic quoting)
const parseCsvRow = (row: string): string[] => {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"' && (i === 0 || row[i - 1] === ',' || !inQuotes)) {
      inQuotes = !inQuotes;
      if (!inQuotes && (i + 1 === row.length || row[i + 1] === ',')) {
         // End of quoted field
      } else if (inQuotes && currentField === '') {
         // Start of quoted field, skip the quote
         continue;
      }
    }

    if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField); // Add the last field
  // Trim quotes from fields that were quoted
  return fields.map(field => {
      if (field.startsWith('"') && field.endsWith('"')) {
          return field.slice(1, -1).replace(/""/g, '"'); // Unescape double quotes
      }
      return field;
  });
};

// Helper function to extract topic name from localStorage key
const extractTopicFromKey = (key: string): string => {
  const prefix = 'flashlearn_';
  const suffix = '_flashcards_csv';
  if (key.startsWith(prefix) && key.endsWith(suffix)) {
    const topicPart = key.slice(prefix.length, key.length - suffix.length);
    return topicPart.replace(/_/g, ' '); // Replace underscores back to spaces
  }
  return 'Unknown Topic'; // Fallback
};




export default function GenerateFlashcardsPage(){
  const { data: session, status } = useSession();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flippedCardIndices, setFlippedCardIndices] = useState<Set<number>>(new Set());
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [availableSets, setAvailableSets] = useState<{ key: string; topicName: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplateDownloadButton, setShowTemplateDownloadButton] = useState(false);
  // Rating System
  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);


  // check if user is authenticated.
  // if user is authenticated, save flashcards to database in 'shared_flashcard_sets' collection using /generate-flashcards route
  // //generate-flashcards route checks if flashcard set already exists in db.
  const handleSave = async () => {
    console.log("save flashcards");
    
    if (flashcards.length === 0) {
      setError('No flashcards to save.');
      return;
    }
    if (!topic.trim()) {
      setError("Cannot save without a topic.");
      return;
    }
    if (status !== 'authenticated' || !session?.user?.email) {
      setError('You must be signed in to save flashcards.');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      // console.log('topic :>> ', topic);
      const response = await fetch('/api/save-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic, 
          flashcards,
          userEmail: session.user.email,
        }),
      });

      const data = await response.json();
      console.log('data :>> ', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        // Update flashcardSetId and rating if available
        if (data.setId) {
          setFlashcardSetId(data.setId);
        }
        if (data.rating) {
          setAverageRating(data.rating.average || 0);
          setRatingCount(data.rating.count || 0);
        }
        // Provide user feedback
        alert('Flashcards saved successfully!');
      } else {
        throw new Error(data.message || 'Failed to save flashcards.');
      }
    } catch (error: unknown) {
      console.error("Saving failed:", error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while saving.');
    } finally {
      setIsExporting(false);
    }
  }
  

  const handleExportCSV = () => {
    if (flashcards.length === 0) {
      setError('No flashcards to export.');
      return;
    }
    if (!topic.trim()) {
      setError("Cannot export without a topic.");
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      // Sanitize the topic for use in filename and key
      const sanitizedTopic = sanitizeString(topic);
      const filename = `${sanitizedTopic}_flashcards.csv`;
      const localStorageKey = `flashlearn_${sanitizedTopic}_flashcards_csv`; // Add prefix

      // 1. Format data into CSV string
      const header = ["Front", "Back"];
      const rows = flashcards.map(card => [escapeCsvField(card.front), escapeCsvField(card.back)]);

      const csvContent = [header, ...rows].map(row => row.join(",")).join("\n");
      // 2. Save CSV content to localStorage with dynamic key
      try {
        localStorage.setItem(localStorageKey, csvContent);
        console.log(`CSV content saved to localStorage under key: ${localStorageKey}`);
      } catch (storageError) {
        console.error("Failed to save CSV content to localStorage:", storageError);
        // Optionally notify the user, but proceed with download anyway
        setError("Could not save to local storage, but download will proceed.");
      }
      // 3. Trigger file download with dynamic filename
      // Create a Blob object containing the CSV data
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Create a temporary URL for the Blob
      const url = URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename); // Use dynamic filename
      link.style.visibility = 'hidden'; // Hide the link

      // Append the link to the body, click it, and then remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Optional: Revoke the object URL to free up memory, though browser usually handles this
      // URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      setError("An error occurred while exporting the CSV file.");
    }
    setIsExporting(false);
  }

  const handleGenerate = async () => {
    if(!topic.trim()) {
      setError('Please enter a topic or some terms and definitions to create the front and back of your flashcards.');
      setFlashcards([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    setFlashcards([]); // Clear previous cards
    setFlippedCardIndices(new Set()); // Reset flipped state

    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (response.ok) {

        if (data.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
          setFlashcardSetId(data.setId || null);
          setAverageRating(data.rating?.average || 0);
          setRatingCount(data.rating?.count || 0);
        } else {
           setError(data.error || 'No flashcards were generated. Try refining your topic.');
        }
      }
    } catch (error: unknown) {
      console.error("Generation failed:", error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
      
    }

    // Add these functions inside the GenerateFlashcardsPage component

  const handleScanStorage = () => {
    setError(null);
    setFlashcards([]); // Clear current cards when starting scan
    setTopic(''); // Clear current topic
    setFlippedCardIndices(new Set());

    const foundSets: { key: string; topicName: string }[] = [];
    try {
      console.log("scanning storage");
      for (let i = 0; i < localStorage.length; i++) {
        console.log('localStorage.key(i) :>> ', localStorage.key(i));
        const key = localStorage.key(i);
        if (key && key.startsWith('flashlearn_') || key.endsWith('_flashcards_csv')) {
          const topicName = extractTopicFromKey(key);
          foundSets.push({ key, topicName });
        }
      }
    } catch (e) {
      console.error("Could not access localStorage:", e);
      setError("Could not access local storage. It might be disabled.");
      return;
    }

    if (foundSets.length > 0) {
      setAvailableSets(foundSets);
      setShowLoadModal(true);
    } else {
      setError("No saved flashcard sets found in local storage.");
    }
  };

  const loadSelectedSet = (key: string) => {
    setError(null);
    try {
      const csvContent = localStorage.getItem(key);
      if (!csvContent) {
        throw new Error("Selected set not found in storage.");
      }

      const lines = csvContent.split('\n');
      if (lines.length < 2) { // Must have header + at least one data row
        throw new Error("Invalid or empty CSV data found.");
      }

      const header = parseCsvRow(lines[0]); // ['Front', 'Back']
      if (header.length < 2 || header[0].toLowerCase() !== 'front' || header[1].toLowerCase() !== 'back') {
          throw new Error("CSV header is missing or incorrect ('Front', 'Back' expected).");
      }

      const loadedFlashcards: Flashcard[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines
        const fields = parseCsvRow(lines[i]);
        if (fields.length >= 2) {
          loadedFlashcards.push({ front: fields[0], back: fields[1] });
        } else {
            console.warn(`Skipping invalid CSV row ${i + 1}: ${lines[i]}`);
        }
      }

      if (loadedFlashcards.length === 0) {
          throw new Error("CSV file contained no valid flashcard rows.");
      }

      setFlashcards(loadedFlashcards);
      setTopic(extractTopicFromKey(key)); // Set the topic based on the loaded key
      setShowLoadModal(false); // Close modal on success
      setFlippedCardIndices(new Set()); // Reset flip state

    } catch (err: unknown) {
      console.error("Error loading or parsing CSV from storage:", err);
      setError(err instanceof Error ? err.message : "Failed to load or parse the selected set.");
      setShowLoadModal(false); // Close modal even on error
    }
  };


  const toggleFlip = (index: number) => {
    setFlippedCardIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        console.log("else, add index to set");
        
        newSet.add(index);
      }
      console.log("return new set");
      
      return newSet;
    });
  };

// Add these functions inside the GenerateFlashcardsPage component

const handleTriggerUpload = () => {
  // Trigger click on the hidden file input
  fileInputRef.current?.click();
};

const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  setError(null); // Clear previous errors
  setShowTemplateDownloadButton(false); // Hide template button initially
  const file = event.target.files?.[0];

  if (!file) {
    return; // No file selected
  }

  // Basic file type check (can be improved with MIME types if needed)
  if (!file.name.toLowerCase().endsWith('.csv')) {
    setError("Invalid file type. Please upload a .csv file.");
    // Clear the file input value so the user can select the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    return;
  }

  setIsUploading(true);
  setFlashcards([]); // Clear current cards
  setTopic(''); // Clear current topic
  setFlippedCardIndices(new Set());

  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (content) {
      processCsvContent(content, file.name); // Pass filename for topic
    } else {
      setError("Could not read file content.");
    }
    setIsUploading(false);
    // Clear the file input value after processing
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  reader.onerror = () => {
    setError("Error reading the file.");
    setIsUploading(false);
    // Clear the file input value on error
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  reader.readAsText(file);
};

const processCsvContent = (csvContent: string, originalFilename: string) => {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim() !== ''); // Split and remove empty lines

    if (lines.length < 2) {
      setError("CSV file must contain at least a header row and one data row.");
      setShowTemplateDownloadButton(true); // Offer template
      return;
    }

    const header = parseCsvRow(lines[0]);
    const expectedHeader = ["front", "back"]; // Case-insensitive check

    // Validate Header
    if (header.length < 2 || header[0].trim().toLowerCase() !== expectedHeader[0] || header[1].trim().toLowerCase() !== expectedHeader[1]) {
      setError(`Invalid CSV header. Expected columns: "Front,Back" (case-insensitive).`);
      setShowTemplateDownloadButton(true); // Offer template
      return;
    }

    // Process Data Rows
    const loadedFlashcards: Flashcard[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvRow(lines[i]);
      if (fields.length >= 2 && fields[0].trim()) { // Ensure front is not empty
        loadedFlashcards.push({ front: fields[0].trim(), back: fields[1].trim() });
      } else {
        console.warn(`Skipping invalid or incomplete CSV row ${i + 1}: ${lines[i]}`);
      }
    }

    if (loadedFlashcards.length === 0) {
      setError("CSV file contained a valid header but no valid flashcard data rows.");
      return;
    }

    // Success: Update state
    setFlashcards(loadedFlashcards);
    // Set topic based on filename (remove .csv extension and sanitize)
    const filenameWithoutExtension = originalFilename.replace(/\.csv$/i, '');
    setTopic(sanitizeString(filenameWithoutExtension).replace(/_/g, ' ')); // Use sanitized name for display topic
    setError(null); // Clear any previous errors
    setFlippedCardIndices(new Set()); // Reset flip state

  } catch (err) {
    console.error("Error processing CSV content:", err);
    setError("An error occurred while processing the CSV file. Please ensure it's correctly formatted.");
    setShowTemplateDownloadButton(true); // Offer template on generic processing error too
  }
};

const handleDownloadTemplate = () => {
  const templateContent = `"Front","Back"\n"Example Front 1","Example Back 1"\n"Front with, comma","Back with ""quotes"""`;
  const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "flashcard_template.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};




  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Generate Flashcards with AI</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Enter a topic or specific "Front: Back" pairs to generate flashcards instantly using AI.
          </p>

      <textarea
        id="topicInput"
        className="w-full p-3 border border-gray-300 rounded-md mb-4 min-h-[120px] focus:ring-2 focus:ring-blue-500"
        placeholder="e.g., Photosynthesis, Capital cities of Europe, useState Hook: React state management..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        disabled={isLoading}
      />
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv" // Specify accepted file type
          style={{ display: 'none' }} // Hide the default input
        />
      <div className="flex flex-wrap gap-3 justify-center mb-4">
         <button
           id="generateButton"
           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={handleGenerate}
           disabled={isLoading || isExporting || isUploading}
         >
           {isLoading ? 'Generating...' : 'Generate Flashcards w/AI'}
         </button>
         <button
          id="uploadButton"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          onClick={handleTriggerUpload} // Trigger the hidden input
          disabled={isLoading || isExporting || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload CSV'}
        </button>
        <button
           id="loadButton"
           className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={handleScanStorage}
           disabled={isLoading || isExporting || isUploading} // Disable while generating/exporting
         >
           Load from Storage
         </button>
         <button
           id="exportCSVButton"
           className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={handleExportCSV}
           disabled={isLoading || isExporting || flashcards.length === 0 || !topic.trim()}
         >
           {isExporting ? 'Exporting CSV...' : 'Export CSV of Flashcards'}
         </button>
         <button
           id="saveButton"
           className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={handleSave}
           disabled={isLoading || isExporting || flashcards.length === 0 || !topic.trim()}
         >
           {isExporting ? 'Saving...' : 'Save Flashcards'}
         </button>
      </div>


      {error && (
        <div className="my-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-red-600">{error}</p>
        {/* Conditional Template Download Button */}
        {showTemplateDownloadButton && (
          <button
            onClick={handleDownloadTemplate}
            className="mt-2 bg-gray-500 hover:bg-gray-600 text-white text-sm py-1 px-3 rounded"
                  >
            Download Template CSV
          </button>
        )}
      </div>
      )}

      {/* Flashcard Grid */}
      {flashcards.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Generated Flashcards</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 perspective">
                {flashcards.map((card, index) => (
                  <div
                    key={index}
                    className={`flashcard cursor-pointer h-40 rounded-lg shadow-md ${flippedCardIndices.has(index) ? 'flipped' : ''}`}
                    onClick={() => toggleFlip(index)}
                  >
                    <div className="flashcard-inner relative w-full h-full text-center transition-transform duration-700 transform-style-preserve-3d">
                      {/* Front */}
                      <div className="flashcard-front absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="front font-semibold text-lg text-blue-900 dark:text-blue-100">{card.front}</div>
                      </div>
                      {/* Back */}
                      <div className="flashcard-back absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg transform rotate-y-180">
                        <div className="back text-sm text-green-900 dark:text-green-100">{card.back}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Rating Component */}
              {flashcardSetId && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                  <h3 className="text-lg font-medium mb-2">Rate These Flashcards</h3>
                  {status === 'authenticated' ? (
                  <RatingStars 
                    setId={flashcardSetId} 
                    initialRating={averageRating}
                    totalRatings={ratingCount}
                    onRatingSubmitted={(newRating) => {
                      console.log(`User submitted rating: ${newRating}`);
                    }}
                  />
                  ) : (
                    <div className="text-center">
                      <p className="mb-2 text-sm text-gray-600">Sign in to rate these flashcards</p>
                      <Link href="/signin" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                        Sign In
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
       {/* Add CSS for the flip animation (e.g., in your global.css) */}
       {/*
          .perspective { perspective: 1000px; }
          .transform-style-preserve-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
          .flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
       */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Load Saved Flashcards</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select a previously saved set to load:</p>

            {/* Scrollable List */}
            <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 rounded">
              {availableSets.length > 0 ? (
                availableSets.map((set) => (
                  <button
                    key={set.key}
                    onClick={() => loadSelectedSet(set.key)}
                    className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    {set.topicName}
                  </button>
                ))
              ) : (
                <p className="p-4 text-gray-500">No sets found.</p> // Should not happen if modal is shown
              )}
            </div>

            {/* Cancel Button (always visible below list) */}
            <button
              onClick={() => setShowLoadModal(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* End Load from Storage Modal */}
    </div>
    </>
  );


}
