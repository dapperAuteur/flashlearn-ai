import mongoose, { Document, Schema } from "mongoose";

/**
 * One recorded interaction in an A/B test (a view or a CTA click). The `test`
 * field namespaces events so a single collection can hold more than one
 * experiment. Written by app/api/analytics/ab-test/route.ts; read, aggregated,
 * by the admin dashboard at /admin/ab-test.
 */
export interface IABTestEvent extends Document {
  test: string;
  variant: string;
  event: string;
  sessionId: string;
  userId?: mongoose.Types.ObjectId;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ABTestEventSchema = new Schema<IABTestEvent>(
  {
    test: { type: String, required: true, default: "home-hero" },
    variant: { type: String, required: true },
    event: { type: String, required: true },
    sessionId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    referrer: { type: String, required: false },
    userAgent: { type: String, required: false },
    ip: { type: String, required: false },
  },
  { timestamps: true },
);

// Drives the dashboard aggregation (count by test → variant → event).
ABTestEventSchema.index({ test: 1, variant: 1, event: 1, createdAt: -1 });
// Lets us count distinct sessions per variant without a collection scan.
ABTestEventSchema.index({ test: 1, sessionId: 1 });

export const ABTestEvent =
  mongoose.models.ABTestEvent || mongoose.model<IABTestEvent>("ABTestEvent", ABTestEventSchema);
