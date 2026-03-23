import { branding, type Branding } from '@/branding.config';

export { branding };
export type { Branding };

export function isFeatureEnabled(feature: keyof typeof branding.features): boolean {
  return branding.features[feature] ?? false;
}

/**
 * Returns CSS custom properties for the branding colors.
 * Apply these to the root element to theme the entire app.
 */
export function getBrandingCSSVars(): Record<string, string> {
  return {
    '--color-primary': branding.primaryColor,
    '--color-secondary': branding.secondaryColor,
  };
}
