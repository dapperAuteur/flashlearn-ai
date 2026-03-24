# Admin Dashboard Guide

## Overview

The FlashLearn AI admin dashboard provides full platform management at `/admin/`. Access requires the **Admin** role. The sidebar navigation groups features into logical sections.

## Sections

### Overview

**Dashboard** (`/admin/dashboard`)
Key metrics at a glance: total users, new users (24h), paid users, total flashcard sets, study sessions. Includes 30-day charts for user growth and study activity, subscription tier breakdown, and recent signups.

**Analytics** (`/admin/analytics`)
Detailed platform analytics including user engagement trends, content creation rates, and study patterns.

### Content

**Categories** (`/admin/categories`)
Manage flashcard set categories and tags used for organizing content in the Explore page.

**Featured** (`/admin/featured`)
Curate featured flashcard sets displayed prominently on the Explore page.

**Flags** (`/admin/flags`)
Review and moderate flagged content. Manage reports from users about inappropriate, offensive, or spam content.

### Users

**Users** (`/admin/users`)
Full user management: search by name/email, filter by role and subscription tier. Edit user roles (Student, Teacher, Tutor, Parent, SchoolAdmin, Admin), subscription tiers, and email verification status. View Stripe customer connections.

**Health** (`/admin/health`)
System health monitoring and user account health checks.

**Invitations** (`/admin/invitations`)
Manage and track user invitation emails with status tracking.

### Revenue

**Revenue** (`/admin/revenue`)
Payment and subscription analytics. Track Monthly Pro, Lifetime, and API tier revenue via Stripe integration.

**Coupons** (`/admin/coupons`)
Create and manage promotional coupon codes via Stripe. Set discount amounts, expiration dates, and usage limits.

### Growth

**Shares & Referrals** (`/admin/shares`)
Track content sharing analytics, referral links, and viral growth metrics.

### Communication

**Campaigns** (`/admin/campaigns`)
Create and send email campaigns to targeted user segments. Preview emails before sending.

**Conversations** (`/admin/conversations`)
View and respond to user feedback conversations from the in-app feedback widget.

### System

**API Management** (`/admin/api-management`)
Manage all API keys across 4 types (admin, app, public, admin_public). Configure per-key rate limits, IP allowlists, webhook URLs, and overage billing settings.

**SEO** (`/admin/seo`)
Edit per-page metadata (title, description, Open Graph tags) with Google Search result preview.

**Logs** (`/admin/logs`)
View application and authentication logs with filtering and search.

**Settings** (`/admin/settings`)
Platform configuration including:
- `RATE_LIMITS` — Per-tier AI generation limits
- `FLASHCARD_MAX` — Maximum cards per set
- `PROMO_LIFETIME_ACTIVE` — Lifetime plan availability
- `ANNOUNCEMENT_BANNER` — Site-wide messaging
- `AUTO_FLAG_THRESHOLD` — Content auto-flagging threshold

## Admin-Only Features

### Card Quantity Selector
When generating flashcards via AI, admins see an additional "Card Quantity" input on the generate page (`/generate`). This allows specifying an exact number of cards to generate (1-50), overriding the default 5-20 range. Non-admin users do not see this control, and the API rejects quantity parameters from non-admin users with a 403 error.

## Access Control

- Admin routes are protected by middleware (`middleware.ts`) — non-admin users are redirected to `/dashboard`
- All admin API endpoints verify `token.role === 'Admin'` before processing requests
- Admins cannot demote their own account to prevent lockout
