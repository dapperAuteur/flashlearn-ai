/**
 * Returns the display label for a user's subscription/access level.
 * Admin users always show "Admin (Full Access)" regardless of subscriptionTier.
 */
export function getSubscriptionDisplay(role?: string, subscriptionTier?: string): string {
  if (role === 'Admin') return 'Admin (Full Access)';
  if (!subscriptionTier || subscriptionTier === 'Free') return 'Free Plan';
  return subscriptionTier;
}

/**
 * Returns true if the user should see the upgrade CTA.
 * Admins never see upgrade prompts.
 */
export function shouldShowUpgradeCTA(role?: string, subscriptionTier?: string): boolean {
  if (role === 'Admin') return false;
  return !subscriptionTier || subscriptionTier === 'Free';
}

/**
 * Returns true if the user has full/premium access (admin or paid tier).
 */
export function hasFullAccess(role?: string, subscriptionTier?: string): boolean {
  if (role === 'Admin') return true;
  return !!subscriptionTier && subscriptionTier !== 'Free';
}
