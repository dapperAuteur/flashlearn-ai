/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, CheckCircle } from 'lucide-react';
import { isDeckOffline, downloadDeck } from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useToast } from '@/hooks/use-toast'; // CORRECTED IMPORT PATH
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Assuming a basic structure for a flashcard set passed as a prop
interface Deck {
  _id: string;
  title: string;
  flashcards: any[];
  isPublic?: boolean;
}

interface DeckListItemProps {
  deck: Deck;
}

export default function DeckListItem({ deck }: DeckListItemProps) {
  const { toast } = useToast();
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check the offline status of the deck when the component mounts
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const offlineStatus = await isDeckOffline(deck._id);
        setIsOffline(offlineStatus);
      } catch (error) {
        Logger.error(LogContext.SYSTEM, 'Failed to check offline deck status', { error });
      }
    };
    checkStatus();
  }, [deck._id]);

  /**
   * Handles the download process for a deck.
   */
  const handleDownload = async () => {
    setIsDownloading(true);
    Logger.log(LogContext.SYSTEM, 'Starting deck download', { setId: deck._id });

    try {
      // In a real app, you might need to fetch the full deck data first
      // For this component, we assume the 'deck' prop contains all necessary data
      await downloadDeck({
        setId: deck._id,
        title: deck.title,
        flashcards: deck.flashcards,
      });

      setIsOffline(true);
      toast({
        title: 'Download Complete',
        description: `"${deck.title}" is now available offline.`,
      });
      Logger.log(LogContext.SYSTEM, 'Deck download successful', { setId: deck._id });

    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Deck download failed', { setId: deck._id, error });
      toast({
        title: 'Download Failed',
        description: 'Could not save the deck for offline use.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{deck.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {deck.flashcards.length} cards
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Link href={`/dashboard/study?setId=${deck._id}`} passHref>
          <Button variant="outline">Study</Button>
        </Link>
        
        {isOffline ? (
          <div className="flex items-center text-green-500">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">Downloaded</span>
          </div>
        ) : (
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            variant="ghost"
          >
            <Download className="h-5 w-5 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
