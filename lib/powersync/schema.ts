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
    created_at: column.text,
    updated_at: column.text,
    is_deleted: column.integer,
  },
  {
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
    order: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
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
    indexes: {
      user_offline: ['user_id', 'last_accessed'],
      set_offline: ['user_id', 'set_id'],
    },
  }
);

// ============================================================================
// TABLE: categories
// ============================================================================
const categories = new Table(
  {
    id: column.text,
    user_id: column.text,
    name: column.text,
    color: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      user_categories: ['user_id'],
    },
  }
);

// ============================================================================
// SCHEMA EXPORT
// ============================================================================
export const AppSchema = new Schema({
  flashcard_sets,
  flashcards,
  offline_sets,
  categories,
});

Logger.log(LogContext.SYSTEM, 'PowerSync schema defined', {
  tables: Object.keys(AppSchema.tables),
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

export interface PowerSyncCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
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