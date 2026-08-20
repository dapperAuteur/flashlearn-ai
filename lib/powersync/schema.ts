import { column, Schema, Table } from '@powersync/web';
import { Logger, LogContext } from '@/lib/logging/client-logger';
export { boolToInt, intToBool, generateMongoId, isValidMongoId } from './helpers';

/**
 * PowerSync Schema Definition (PowerSync v5 API)
 */

// ============================================================================
// TABLE: flashcard_sets
// ============================================================================
const flashcard_sets = new Table(
  {
    id: column.text,
    user_id: column.text,
    title: column.text,
    description: column.text,
    is_public: column.integer,
    card_count: column.integer,
    source: column.text,
    // Comma separated. The study setup screen needs these to tell a math fact
    // set from any other, and without them offline it cannot, so it would leave
    // multiple choice enabled on a set that is meant to be recall only.
    tags: column.text,
    created_at: column.text,
    updated_at: column.text,
    is_deleted: column.integer,
  },
  {
    // Local only: nothing in this store is ever uploaded by the SDK. Without
    // it every write appends to PowerSync's internal ps_crud queue, and since
    // no connector is wired that queue is never drained and grows for the
    // lifetime of the browser profile.
    localOnly: true,
    indexes: {
      user_sets: ['user_id', 'is_deleted'],
      public_sets: ['is_public', 'is_deleted'],
    },
  }
);

// ============================================================================
// TABLE: flashcards
// ============================================================================
const flashcards = new Table(
  {
    id: column.text,
    set_id: column.text,
    user_id: column.text,
    front: column.text,
    back: column.text,
    front_image: column.text,
    back_image: column.text,
    front_image_alt: column.text,
    back_image_alt: column.text,
    front_video: column.text,
    back_video: column.text,
    front_video_alt: column.text,
    back_video_alt: column.text,
    // Authored multiple-choice options, stored as a JSON string ([{id,text}]),
    // plus the id of the correct option. Null for cards without authored options.
    options: column.text,
    correct_option_id: column.text,
    order: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    // Local only: nothing in this store is ever uploaded by the SDK. Without
    // it every write appends to PowerSync's internal ps_crud queue, and since
    // no connector is wired that queue is never drained and grows for the
    // lifetime of the browser profile.
    localOnly: true,
    indexes: {
      set_cards: ['set_id', 'order'],
      user_cards: ['user_id'],
    },
  }
);

// ============================================================================
// TABLE: offline_sets
// ============================================================================
const offline_sets = new Table(
  {
    id: column.text,
    user_id: column.text,
    set_id: column.text,
    is_owned: column.integer,
    last_accessed: column.text,
    created_at: column.text,
  },
  {
    // Local only: nothing in this store is ever uploaded by the SDK. Without
    // it every write appends to PowerSync's internal ps_crud queue, and since
    // no connector is wired that queue is never drained and grows for the
    // lifetime of the browser profile.
    localOnly: true,
    indexes: {
      user_offline: ['user_id', 'last_accessed'],
      set_offline: ['user_id', 'set_id'],
    },
  }
);

// ============================================================================
// SCHEMA EXPORT
// ============================================================================
// A `categories` table used to sit here. Nothing ever inserted into it, queried
// it, or pulled it, and its IndexedDB twin was already retired. Categories come
// from /api/sets/categories, which is the only implementation that works, so
// the table was removed rather than left to imply an offline category store
// exists. It held no rows, so no watermark bump was needed to drop it.
export const AppSchema = new Schema({
  flashcard_sets,
  flashcards,
  offline_sets,
});

Logger.log(LogContext.SYSTEM, 'PowerSync schema defined', {
  // tables is an array of Table instances, so Object.keys gave back "0","1","2".
  tables: AppSchema.tables.map((table) => table.name),
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================
export interface PowerSyncFlashcardSet {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: 0 | 1;
  card_count: number;
  source: string;
  /** Comma separated, as stored. Null on rows pulled before the column existed. */
  tags: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: 0 | 1;
}

export interface PowerSyncFlashcard {
  id: string;
  set_id: string;
  user_id: string;
  front: string;
  back: string;
  front_image: string | null;
  back_image: string | null;
  front_image_alt?: string | null;
  back_image_alt?: string | null;
  front_video?: string | null;
  back_video?: string | null;
  front_video_alt?: string | null;
  back_video_alt?: string | null;
  options?: string | null;
  correct_option_id?: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface PowerSyncOfflineSet {
  id: string;
  title: string;
  user_id: string;
  set_id: string;
  is_owned: 0 | 1;
  last_accessed: string;
  created_at: string;
}

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================
// export function boolToInt(value: boolean): 0 | 1 {
//   return value ? 1 : 0;
// }

// export function intToBool(value: 0 | 1 | number): boolean {
//   return value === 1;
// }

// export function generateMongoId(): string {
//   const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
//   const random = Array.from({ length: 16 }, () =>
//     Math.floor(Math.random() * 16).toString(16)
//   ).join('');
  
//   const id = timestamp + random;
  
//   Logger.log(LogContext.SYSTEM, 'Generated MongoDB-compatible ID', { id });
//   return id;
// }

// export function isValidMongoId(id: string): boolean {
//   return /^[a-f0-9]{24}$/i.test(id);
// }

export default AppSchema;