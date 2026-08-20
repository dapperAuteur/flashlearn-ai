import mongoose, { Schema, model, models } from 'mongoose';

/**
 * One row per (profile, set) for a set a learner has put on their own shelf.
 *
 * The entry POINTS AT the public set; it never copies it. A copy would freeze
 * the content at the moment it was added, so a correction shipped to a seeded
 * math set would never reach anyone who added that set beforehand. Reference
 * also keeps exactly one StudyAnalytics row per (profile, set) however the set
 * was found, which is why removing a set and adding it back later picks the
 * streak up where it was rather than starting over.
 *
 * Scoped on Profile, not User, to agree with StudyAnalytics.profile. A managed
 * learner has a profile and no account, and still needs a library.
 *
 * There is no cap. The cap that used to sit on the local `offline_sets` table
 * belonged to downloading sets for offline study, which is a different question
 * from which sets a person uses.
 */
/**
 * Plain document shape, not `extends Document`: the field is named `set`, and
 * that collides with Mongoose's own `Document.set()` method.
 */
export interface ILibraryEntry {
  profile: mongoose.Types.ObjectId;
  set: mongoose.Types.ObjectId;
  addedAt: Date;
  /** Unset until the learner finishes a session for this set. */
  lastStudiedAt?: Date | null;
  /** Sorts above everything else. Reserved for teacher-assigned sets. */
  pinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LibraryEntrySchema = new Schema<ILibraryEntry>(
  {
    profile: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    set: {
      type: Schema.Types.ObjectId,
      ref: 'FlashcardSet',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    lastStudiedAt: {
      type: Date,
      default: null,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// One entry per set per profile. Adding a set twice is an upsert against this
// index, so a double tap on the button cannot leave two rows behind.
LibraryEntrySchema.index({ profile: 1, set: 1 }, { unique: true });

// The default view: most recently studied first. A never-studied entry has a
// null lastStudiedAt, which MongoDB sorts below every real date on a descending
// sort, so those fall to the bottom and tie-break on addedAt.
LibraryEntrySchema.index({ profile: 1, lastStudiedAt: -1, addedAt: -1 });

export const LibraryEntry =
  models.LibraryEntry || model<ILibraryEntry>('LibraryEntry', LibraryEntrySchema);
