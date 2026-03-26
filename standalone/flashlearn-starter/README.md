# FlashLearn Starter — White-Label Study App

A ready-to-deploy study app powered by the [FlashLearnAI.WitUS.Online](https://flashlearnai.witus.online) Public API. Built for schools, study groups, and companies who want their own branded flashcard platform.

**No database needed.** All data is stored and managed by the FlashLearnAI.WitUS.Online API.

## License

This is a **commercial product**. A valid license is required to deploy.

| License | Price | Includes |
|---------|-------|----------|
| **Standard** | $499 one-time | 1 domain, branding editor, Vercel deploy, community support |
| **School & Enterprise** | $999/year | Unlimited domains, priority support, continuous updates, Pro API tier |

API usage is billed separately per your [API tier](https://flashlearnai.witus.online/pricing).

**Purchase:** [Contact us](mailto:admin.flashlearnai@awews.com) or visit [flashlearnai.witus.online/pricing](https://flashlearnai.witus.online/pricing)

## Features

- AI flashcard generation from any topic
- Flashcard set management (create, edit, delete, browse)
- Spaced repetition study sessions (SM-2 algorithm)
- AI-powered answer grading (handles typos + synonyms)
- Versus mode with competitive scoring and leaderboards
- Usage tracking dashboard
- **White-label branding** — customize name, colors, logo, and features
- **Admin branding dashboard** at `/admin/branding`
- **Admin SEO dashboard** at `/admin/seo`

## Quick Start

### 1. Get Your API Key

After purchasing your license, you'll receive access to this repository and a FlashLearnAI API key.

### 2. Clone and Configure

```bash
git clone <your-private-repo-url>
cd flashlearn-starter
cp .env.example .env.local
```

Edit `.env.local`:
```
FLASHLEARN_API_KEY=fl_pub_your_key_here
```

### 3. Customize Branding

Edit `branding.config.ts` to set your app name, colors, logo, and which features to enable:

```typescript
export const branding = {
  appName: 'Lincoln High Study Hub',
  tagline: 'Study smarter, together',
  primaryColor: '#DC2626',  // School red
  logoUrl: '/logo.png',     // Put your logo in /public/
  poweredBy: true,
  features: {
    generate: true,
    sets: true,
    explore: true,
    study: true,
    versus: true,
    usage: false,  // Hide usage page from students
  },
};
```

Or use the visual branding editor at `/admin/branding` after deploying.

### 4. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy

#### Vercel (Recommended)

Add `FLASHLEARN_API_KEY` as an environment variable in the Vercel dashboard, then deploy.

#### Other Hosts

Any platform that supports Next.js:
```bash
npm run build
npm start
```

## Project Structure

```
branding.config.ts    <- Edit this to customize branding
seo.config.ts         <- SEO metadata for all pages
.env.local            <- Your API key goes here
lib/api.ts            <- API client (talks to FlashLearnAI.WitUS.Online)
lib/branding.ts       <- Branding helper functions
components/           <- Reusable UI components
  Navbar.tsx          <- Respects branding config
  Footer.tsx          <- Shows "Powered by" badge
  FlashcardDisplay.tsx<- Card flip + answer buttons
app/                  <- Next.js pages (21 routes)
  admin/branding/     <- Visual branding editor
  admin/seo/          <- SEO metadata editor
```

## API Pricing

| Tier | Price | Generations/mo | API Calls/mo |
|------|-------|---------------|-------------|
| Free | $0 | 100 | 1,000 |
| Developer | $19/mo | 5,000 | 50,000 |
| Pro | $49/mo | 25,000 | 250,000 |
| Enterprise | Custom | Unlimited | Unlimited |

## Documentation

- [API Getting Started](https://flashlearnai.witus.online/docs/api/getting-started)
- [Interactive API Reference](https://flashlearnai.witus.online/docs/api)
- [Tutorials](https://flashlearnai.witus.online/docs/api/generation)

## Support

- **Standard license:** Community support via GitHub issues
- **School & Enterprise:** Priority email support at admin.flashlearnai@awews.com

---

**Powered by [FlashLearnAI.WitUS.Online](https://flashlearnai.witus.online)** — a [WitUS.Online](https://WitUS.Online) product by B4C LLC.
