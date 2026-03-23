/**
 * BRANDING CONFIGURATION
 *
 * Edit this file to customize the app for your school, study group, or company.
 * No code changes needed — just update the values below and redeploy.
 *
 * For a visual branding editor, visit /admin/branding after deploying.
 */
export const branding = {
  // ============================
  // App Identity
  // ============================
  appName: 'My Study App',
  tagline: 'Learn smarter together',
  domain: 'https://study.example.com',

  // ============================
  // Colors (hex values)
  // ============================
  primaryColor: '#3B82F6',     // Buttons, links, active states
  secondaryColor: '#8B5CF6',   // Gradients, highlights, accents

  // ============================
  // Logo
  // ============================
  logoUrl: null as string | null,    // Path to logo in /public (e.g., '/logo.png') or null for text-only
  faviconUrl: '/favicon.ico',

  // ============================
  // Footer
  // ============================
  footerText: '',   // Custom footer text (leave empty for default)
  poweredBy: true,  // Shows "Powered by FlashLearnAI.WitUS.Online"

  // ============================
  // Feature Toggles
  // ============================
  features: {
    generate: true,     // AI flashcard generation
    sets: true,         // Flashcard set management
    explore: true,      // Browse public sets
    study: true,        // Spaced repetition study sessions
    evaluate: true,     // AI answer grading
    versus: true,       // Competitive challenges
    usage: true,        // API usage dashboard
  },
};

export type Branding = typeof branding;
