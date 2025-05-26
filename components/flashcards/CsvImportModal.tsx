// components/flashcards/CsvImportModal.tsx
// allow user to set public status
'use client';

import { useState } from 'react';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function CsvImportModal({ isOpen, onClose, onImportSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [listName, setListName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Array<{front: string, back: string}>>([]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Extract filename without extension for default list name
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
    setListName(fileName);

    // Preview first few rows
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const preview = lines.slice(1, 4).map(line => {
        const [front, back] = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        return { front: front || '', back: back || '' };
      });
      setPreviewData(preview);
    } catch (error) {
      setError('Could not preview file. Please check the format.');
    }
  };

  const handleImport = async () => {
    if (!file || !listName.trim()) {
      setError('Please select a file and enter a list name');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      Logger.log(LogContext.FLASHCARD, "Starting CSV import", { 
        fileName: file.name, 
        listName 
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('listName', listName.trim());

      const response = await fetch('/api/lists/import-csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const result = await response.json();
      
      Logger.log(LogContext.FLASHCARD, "CSV import successful", {
        listId: result.listId,
        cardCount: result.cardCount
      });

      onImportSuccess();
      onClose();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setError(message);
      Logger.error(LogContext.FLASHCARD, `CSV import failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Import Flashcards from CSV</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Expected format: Front, Back columns
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            List Name
          </label>
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter list name"
          />
        </div>

        {previewData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
            <div className="bg-gray-50 p-2 rounded text-xs">
              {previewData.map((item, index) => (
                <div key={index} className="mb-1">
                  <strong>Q:</strong> {item.front}<br />
                  <strong>A:</strong> {item.back}
                </div>
              ))}
              {previewData.length > 0 && <div>...</div>}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || !listName.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}