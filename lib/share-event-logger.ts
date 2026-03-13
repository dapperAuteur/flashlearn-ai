/**
 * Server-side utility for logging share link click events.
 * Designed for fire-and-forget use in server components and API routes.
 */
export const ShareEventLogger = {
  async logClick(
    type: 'versus' | 'results' | 'set',
    resourceId: string,
    utmSource = 'direct',
    utmCampaign = ''
  ): Promise<void> {
    try {
      const { default: dbConnect } = await import('@/lib/db/dbConnect');
      const { ShareEvent } = await import('@/models/ShareEvent');
      await dbConnect();
      await ShareEvent.create({ type, resourceId, utmSource, utmCampaign });
    } catch {
      // Non-critical — never throw
    }
  },

  async linkConversion(
    type: 'versus' | 'results' | 'set',
    resourceId: string,
    convertedUserId: string
  ): Promise<void> {
    try {
      const { default: dbConnect } = await import('@/lib/db/dbConnect');
      const { ShareEvent } = await import('@/models/ShareEvent');
      await dbConnect();
      // Link the most recent unconverted click for this resource to the new user
      await ShareEvent.findOneAndUpdate(
        { type, resourceId, convertedUserId: null },
        { convertedUserId, convertedAt: new Date() },
        { sort: { clickedAt: -1 } }
      );
    } catch {
      // Non-critical — never throw
    }
  },
};
