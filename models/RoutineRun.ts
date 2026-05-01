import mongoose, { Document, Schema } from 'mongoose';

// One row per scheduled-routine execution. Written by the routine itself at the
// end of its run via POST /api/routine-runs (shared-secret gated). Read by the
// admin /admin/routines page so BAM can scan upcoming + past runs without
// switching context to claude.ai/code/routines.
export interface IRoutineRun extends Document {
  routineSlug: string;
  routineName: string;
  triggerId?: string;
  runAt: Date;
  status: 'success' | 'error' | 'needs_input';
  alertLevel: 'info' | 'warning' | 'alert';
  summary: string;
  details?: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineRunSchema = new Schema<IRoutineRun>(
  {
    routineSlug: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    routineName: {
      type: String,
      required: true,
      trim: true,
    },
    triggerId: {
      type: String,
      trim: true,
    },
    runAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'error', 'needs_input'],
      default: 'success',
    },
    alertLevel: {
      type: String,
      enum: ['info', 'warning', 'alert'],
      default: 'info',
    },
    summary: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    details: {
      type: String,
      maxlength: 16000,
    },
    link: {
      type: String,
      trim: true,
      maxlength: 512,
    },
  },
  { timestamps: true },
);

RoutineRunSchema.index({ routineSlug: 1, runAt: -1 });
RoutineRunSchema.index({ runAt: -1 });
RoutineRunSchema.index({ alertLevel: 1, runAt: -1 });

export const RoutineRun =
  mongoose.models.RoutineRun || mongoose.model<IRoutineRun>('RoutineRun', RoutineRunSchema);
