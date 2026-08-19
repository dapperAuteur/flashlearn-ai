import { FLASHCARD_MIN } from '@/lib/constants';
import { getFlashcardMax } from '@/lib/appConfigValues';
import { generateFlashcards, type GeneratedFlashcard } from '@/lib/ai/generate';
import { YoutubeTranscript } from 'youtube-transcript';
import {
  buildSourcePrompt,
  sanitizeUserInstructions,
  MAX_USER_INSTRUCTIONS_LENGTH,
} from '@/lib/services/buildGenerationPrompt';
import { type ApiKeyType } from '@/types/api';

/** Characters of transcript sent to the provider. Longer transcripts are truncated. */
export const MAX_TRANSCRIPT_LENGTH = 50000;

export type YouTubeGenerationFailureCode =
  | 'MISSING_URL'
  | 'INSTRUCTIONS_TOO_LONG'
  | 'INVALID_URL'
  | 'TRANSCRIPT_UNAVAILABLE'
  | 'NO_TRANSCRIPT'
  | 'NO_CARDS';

export interface YouTubeGenerationFailure {
  ok: false;
  code: YouTubeGenerationFailureCode;
  message: string;
}

export interface YouTubeGenerationSuccess {
  ok: true;
  flashcards: GeneratedFlashcard[];
  videoId: string;
  transcriptLength: number;
}

export type YouTubeGenerationOutcome = YouTubeGenerationSuccess | YouTubeGenerationFailure;

export interface YouTubeGenerationInput {
  /** Raw `url` field from the request body. */
  url?: unknown;
  /** Raw `prompt` field from the request body, before sanitizing. */
  rawPrompt?: unknown;
  /** API key type, threaded through to provider selection for v1 callers. */
  keyType?: ApiKeyType;
}

/**
 * Pulls the 11-character video id out of a watch URL, a youtu.be link, an embed
 * link, or a bare id.
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function fail(code: YouTubeGenerationFailureCode, message: string): YouTubeGenerationFailure {
  return { ok: false, code, message };
}

/**
 * Validates a YouTube URL, fetches its transcript, and turns that into flashcards.
 *
 * Both outbound calls cost something, so the URL and instruction checks run before
 * the transcript fetch, and the transcript checks run before the provider call.
 * Callers own the response envelope and the usage accounting.
 *
 * Provider failures are thrown rather than returned, so callers can keep their own
 * handling for a provider 429.
 */
export async function generateFlashcardsFromYouTube(
  input: YouTubeGenerationInput
): Promise<YouTubeGenerationOutcome> {
  const { url, rawPrompt, keyType } = input;

  if (!url || typeof url !== 'string') {
    return fail('MISSING_URL', 'YouTube URL is required');
  }

  if (typeof rawPrompt === 'string' && rawPrompt.trim().length > MAX_USER_INSTRUCTIONS_LENGTH) {
    return fail(
      'INSTRUCTIONS_TOO_LONG',
      `Instructions must be ${MAX_USER_INSTRUCTIONS_LENGTH} characters or fewer.`
    );
  }
  const userInstructions = sanitizeUserInstructions(rawPrompt);

  const videoId = extractVideoId(url.trim());
  if (!videoId) {
    return fail('INVALID_URL', 'Invalid YouTube URL');
  }

  let transcriptItems;
  try {
    transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
  } catch {
    return fail(
      'TRANSCRIPT_UNAVAILABLE',
      'Could not fetch transcript. The video may not have captions available.'
    );
  }

  if (!transcriptItems || transcriptItems.length === 0) {
    return fail('NO_TRANSCRIPT', 'No transcript available for this video.');
  }

  let transcript = transcriptItems.map((item) => item.text).join(' ');

  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    transcript = transcript.substring(0, MAX_TRANSCRIPT_LENGTH);
  }

  const prompt = buildSourcePrompt({
    sourceKind: 'youtube',
    body: transcript,
    userInstructions,
    min: FLASHCARD_MIN,
    max: await getFlashcardMax(),
  });

  const flashcards = await generateFlashcards({ prompt, keyType });
  if (flashcards.length === 0) {
    return fail('NO_CARDS', 'Failed to generate flashcards from transcript.');
  }

  return { ok: true, flashcards, videoId, transcriptLength: transcript.length };
}
