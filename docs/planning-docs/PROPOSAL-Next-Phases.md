# FlashLearn AI: Next Phases Proposal

## Current State Assessment

### What's Built and Working
| Feature | Status |
|---------|--------|
| Next.js 15 App Router, TypeScript, Tailwind | Done |
| MongoDB Atlas + Mongoose | Done |
| NextAuth (email/password, JWT, email verification, password reset) | Done |
| User roles: Student, Admin | Done |
| Flashcard CRUD (create, edit, delete sets and cards) | Done |
| AI flashcard generation via Google Gemini | Done |
| CSV import and export (with papaparse) | Done |
| Unified `/study` path with flip-card Easy Mode | Done |
| Confidence rating (1-5 pre-flip) | Done |
| Session results with score, timing, share button | Done |
| Per-card missed cards UI + "Review Missed Cards" | Done |
| SM-2 spaced repetition algorithm | Done |
| Due cards API + dashboard due-cards widget | Done |
| Study history API + dashboard recent activity | Done |
| PowerSync local SQLite DB (offline-first reads) | Done |
| IndexedDB for study sessions + sync queue | Done |
| Consolidated sync service (push/pull) | Done |
| Service worker with offline fallback | Done |
| Admin dashboard page + admin logs page | Done |
| Admin analytics + logs + security-stats APIs | Done |
| Onboarding modal (5-step) | Done |
| Public roadmap page at `/roadmap` | Done |
| Shareable set pages + shareable session results | Done |
| Category management | Done |

### What's NOT Built Yet
| Feature | Priority | Notes |
|---------|----------|-------|
| **Stripe payments** | High | Env vars are placeholder-only. No npm package, no checkout, no webhooks, no pricing page |
| **Pricing page** | High | Dashboard links to `/pricing` which 404s |
| **Subscription tier enforcement** | High | User model has `subscriptionTier` field but nothing sets it beyond 'Free' |
| **Admin user management** | High | `/admin/users` linked in nav but page doesn't exist |
| **Admin app config page** | Medium | `/admin/settings` linked but doesn't exist |
| **Multiple choice study mode** | Medium | Only flip-card Easy Mode exists |
| **Type-your-answer study mode** | Medium | Not implemented |
| **PDF text extraction** | Medium | `source: 'PDF'` type exists but no processing code |
| **YouTube transcript extraction** | Low | Type exists, no code |
| **Profile page forms** | Medium | Display works but update name/change password forms do nothing |
| **Settings page** | Medium | Shell placeholder |
| **Analytics page** | Medium | Shell placeholder |
| **Statistics page** | Low | Shell placeholder |
| **Team page** | Low | Shell placeholder |
| **Lists page** | Low | Shell placeholder (flashcards page serves this role) |
| **Teacher/Parent/Tutor roles** | High (for school market) | Only Student and Admin exist |
| **Versus Mode** | Low | Not started (async or sync) |
| **Leaderboards** | Low | Not started |
| **Socket.IO real-time** | Low | Not started |
| **TensorFlow.js on-device ML** | Low | Replaced by SM-2 algorithm |
| **Push notifications** | Low | Not started |
| **Celebration/achievement system** | Low | Not started |
| **Rich text editor (TipTap)** | Low | Not started |
| **Image upload for cards** | Medium | Not started |

### Known Bugs
| Bug | Location |
|-----|----------|
| `AdminLayout` checks `role !== "admin"` (lowercase) but DB stores `"Admin"` (capitalized) — admins get redirected | `components/layout/AdminLayout.tsx` |
| `security-stats` route checks `"admin"` (lowercase) | `app/api/admin/security-stats/route.ts` |
| Profile page shows subscription based on `role` not `subscriptionTier` | `app/(dashboard)/profile/page.tsx` |
| Onboarding hook has duplicated `useEffect` | `hooks/OnboardingHooks.tsx` |
| Dashboard "Upgrade to Premium" links to `/pricing` which doesn't exist | `app/(dashboard)/dashboard/page.tsx` |

---

## Documentation Conflicts

| Conflict | Details |
|----------|---------|
| **Versus Mode scope** | PRD v1.1 and v1.2 mark Versus Mode as "out of scope for MVP." But `Implementation_Plan_Flashcard_AI_Gemini_Pro.md` puts it in Phase 1 (MVP) and `Gemini Flashcard Pro Prompts Only Synthesized.md` treats it as a planned feature. **Resolution:** Follow the PRD — defer Versus Mode. |
| **Architecture mismatch** | `Prompt-v3.md` describes a hybrid Next.js + Express + Render + Socket.IO + Weaviate architecture. The actual app is a unified Next.js full-stack on Vercel. **Resolution:** `Prompt-v3.md` is obsolete; the codebase is authoritative. |
| **Duplicate PRD** | `docs/Product Requirements Document ver 0001.md` and `docs/planning-docs/Product Requirements Document ver 0001.md` are identical copies. **Resolution:** Keep one, delete the other. |
| **docs/README.md is wrong** | Describes a Vite + vanilla TypeScript prototype ("Gemini Flashcard Maker"), not the actual Next.js app. **Resolution:** Replace with actual project README or delete. |
| **Style guide branding** | `docs/guides/style-guide.md` header says "Temba Financial Dashboard" — copied from another project. **Resolution:** Update header. |
| **Study modes naming** | `ProjectPlan.md` says "True/False, Multiple Choice, Fill-in-blank." PRD and synthesized plan say "Easy/Medium/Hard." **Resolution:** Use Easy/Medium/Hard (matches the codebase). |
| **PowerSync vs IndexedDB plans** | `ImplementationPlan-OfflineStudyAndIndexedDBSync.md` is superseded by `Flashlearn AI powersync-implementation.md`. **Resolution:** The PowerSync plan is current; the IndexedDB-only plan was already implemented and then refactored. |
| **ProjectPlan.md checkboxes** | Many items marked unchecked `[ ]` are actually implemented (CSV import, study system, AI generation, offline sync). **Resolution:** Update the checkboxes or retire this doc in favor of the `/roadmap` page. |
| **Redundant style guides** | `code-guide.md`, `CODING_STYLE_GUIDE.md`, and `ui-component-guidelines.md` overlap significantly. **Resolution:** Consolidate into one. |

---

## Proposed Next Phases

### Phase 4: Stripe Payments + Membership Tiers

**Goal:** Enable $100 limited-time lifetime memberships and $10/month subscriptions.

#### 4A. Stripe Infrastructure
- Install `stripe` npm package
- Configure real Stripe API keys in `.env.local`
- Create Stripe products and prices:
  - **Lifetime Learner**: $100 one-time (limited-time promotional price)
  - **Monthly Pro**: $10/month recurring
  - **Annual Pro**: $96/year ($8/month, saves 20%)
- Create API routes:
  - `POST /api/stripe/checkout` — creates a Stripe Checkout Session
  - `POST /api/stripe/webhook` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - `GET /api/stripe/portal` — creates a Stripe Customer Portal session for managing subscription

#### 4B. Pricing Page
- Create `/pricing` page with 3 tiers:
  - **Free**: AI generation (1/month), Easy Mode study, basic analytics
  - **Monthly Pro ($10/mo)**: Unlimited AI generation, all study modes, full analytics, PDF/YouTube import, priority support
  - **Lifetime Learner ($100 one-time, limited time)**: Everything in Pro, forever. Show countdown/urgency if desired.
- Mobile-first responsive card layout with feature comparison
- CTA buttons route to Stripe Checkout

#### 4C. Subscription Enforcement
- Middleware or API-level checks on `user.subscriptionTier`
- Gate premium features: back-to-front study, Medium/Hard modes (when built), PDF import, unlimited AI generation
- Update the existing `rateLimitGemini.ts` to use actual tier from DB (it already partially does this)
- Show upgrade prompts when free users hit limits

#### 4D. Admin Promotions
- Admin can create promotional pricing (e.g., "$100 lifetime for limited time")
- Extend `AppConfig` model for promo settings: `{ key: 'PROMO_LIFETIME_PRICE', value: 10000, expiresAt: Date }`
- Admin settings page to manage promos

---

### Phase 5: Admin Dashboard Completion

**Goal:** Full admin capabilities for managing users, content, and configuration.

#### 5A. Fix Existing Bugs
- Fix `AdminLayout.tsx` role check: `"admin"` → `"Admin"`
- Fix `security-stats` route role check
- Fix admin logs page (remove commented-out duplicate code)

#### 5B. User Management (`/admin/users`)
- Paginated, searchable user table (email, name, role, subscription, status, join date)
- Actions: change role, change subscription tier, suspend/unsuspend, send password reset email
- API routes: `GET/PUT /api/admin/users`, `PUT /api/admin/users/[id]/role`, `PUT /api/admin/users/[id]/status`

#### 5C. Subscription & Revenue Dashboard
- Show MRR (monthly recurring revenue), total lifetime purchases, churn rate
- List recent transactions from Stripe
- Manage promotional pricing (create/edit/expire promos)

#### 5D. App Configuration (`/admin/settings`)
- Dynamic config for rate limits, max flashcard counts, feature flags
- `AppConfig` Mongoose model (key-value store with in-memory caching)
- Admin UI with form inputs, save button, cache invalidation on update

---

### Phase 6: Education Market — Roles & Classroom Features

**Goal:** Make FlashLearn AI sellable to school districts by supporting teacher-student workflows.

#### 6A. New User Roles

| Role | Permissions | Created By |
|------|------------|------------|
| **Admin** | Full platform control, manage all users, see all analytics | System |
| **School Admin** | Manage teachers, students, parents within their school. See school-wide analytics. | Admin |
| **Teacher** | Create/assign flashcard sets to students. View student progress & analytics. Manage their classroom. | School Admin or self-signup with school code |
| **Tutor** | Same as Teacher but for individual or small-group tutoring. No classroom management. | Self-signup or Admin |
| **Parent** | View their linked student's progress and study history. Receive notifications. | Teacher invite or self-signup with student link |
| **Student** | Study assigned and self-created sets. See own analytics. | Teacher/Parent invite, school code, or self-signup |

#### 6B. School & Classroom Structure
- **School** entity: name, district, subscription plan, list of teachers/students
- **Classroom** entity: teacher, students, assigned sets, class analytics
- Teachers can:
  - Upload lesson plan text or PDF → AI generates flashcard sets
  - Assign sets to entire classroom or individual students
  - Set due dates for assigned study sessions
  - View per-student and per-class performance dashboards
  - See which students are struggling (cards with low accuracy, students who haven't studied)
- Students see:
  - "Assigned" tab in study setup showing teacher-assigned sets with due dates
  - Their own progress dashboard
  - Badges/streaks for motivation

#### 6C. School Pricing Tiers

| Tier | Price | Includes |
|------|-------|----------|
| **Individual Teacher** | $10/month or $100/year | 1 teacher, up to 35 students, unlimited AI generation |
| **School** | $500/year | Up to 20 teachers, unlimited students, school admin dashboard, bulk CSV import |
| **District** | Custom pricing | Unlimited schools, SSO integration, dedicated support, usage analytics |

#### 6D. Teacher-Specific Features
- **Lesson Plan → Flashcards**: Upload a lesson plan (text or PDF), AI generates a flashcard set aligned to the content. Teacher reviews/edits before assigning.
- **Test Prep Mode**: Upload a test/quiz document, AI generates flashcards from the questions/answers. Students study the generated cards.
- **Assignment Flow**: Teacher assigns a set → students see it in their "Assigned" queue → teacher sees completion rates and scores
- **Class Analytics Dashboard**: Per-student accuracy heatmap, average class performance, cards that the most students got wrong ("problem cards for the class"), study time distribution
- **Parent Progress Reports**: Weekly email summary of student's study activity, accuracy trends, and teacher-assigned completion status

---

### Phase 7: Enhanced Study Experience

**Goal:** More study modes, better analytics, and engagement features to improve learning outcomes.

#### 7A. Medium Mode (Multiple Choice)
- AI generates 3 wrong answers for each card (via Gemini, cached per card)
- Display 4 shuffled options (A/B/C/D)
- "Hint" button eliminates 2 wrong answers (tracked in analytics as hint usage)
- Correct/incorrect feedback with explanation

#### 7B. Hard Mode (Type Answer)
- Student types their answer in a text field
- Gemini AI evaluates correctness (fuzzy matching for spelling, synonyms, partial credit)
- Show the correct answer alongside their attempt
- Confidence rating still collected pre-answer

#### 7C. Analytics Page (Real)
- Replace the shell placeholder with actual data:
  - Performance over time chart (line graph, accuracy % per week)
  - Study streak calendar (GitHub contribution graph style)
  - Problem cards list (top 10 lowest accuracy cards across all sets)
  - Time spent studying per day/week/month
  - Confidence vs accuracy scatter plot (identify lucky guesses and confident mistakes)

#### 7D. Celebration System
- Milestone celebrations triggered by:
  - First study session completed
  - 7-day streak
  - 30-day streak
  - 100% accuracy on a set
  - Mastering a card (5+ consecutive correct with SM-2 interval > 30 days)
- Animated confetti or badge display
- Achievement history in profile

---

### Phase 8: Content Ingestion

**Goal:** Let teachers and students create flashcards from any source material.

#### 8A. PDF Text Extraction
- Install `pdf-parse` or use Gemini's document understanding
- Upload PDF → extract text → send to Gemini for flashcard generation
- Support multi-page documents with section detection

#### 8B. Image Upload & OCR
- Upload photos of textbook pages, handwritten notes, or whiteboard
- Use Gemini's vision capability to extract text and generate cards
- Support multiple images per set

#### 8C. YouTube Transcript
- Accept YouTube URL → fetch transcript via `youtube-transcript` or YouTube Data API
- Send transcript to Gemini for flashcard generation
- Show video timestamp references on cards

#### 8D. Audio Transcription
- Upload audio files (lecture recordings, voice notes)
- Transcribe via Whisper API or Gemini
- Generate flashcards from transcript

---

## Implementation Priority (Recommended Order)

| Priority | Phase | Effort | Business Impact |
|----------|-------|--------|----------------|
| 1 | **Phase 4**: Stripe Payments | 1-2 weeks | Enables revenue — must ship first |
| 2 | **Phase 5**: Admin Dashboard | 1 week | Needed to manage users/promos |
| 3 | **Phase 6A-B**: Education Roles & Classrooms | 2-3 weeks | Unlocks school district market |
| 4 | **Phase 7A**: Multiple Choice Mode | 1 week | Major study experience upgrade |
| 5 | **Phase 8A**: PDF Import | 3-5 days | Teachers' #1 requested feature |
| 6 | **Phase 6C-D**: School Pricing + Teacher Features | 1-2 weeks | Monetize education market |
| 7 | **Phase 7B-C**: Hard Mode + Analytics | 1-2 weeks | Deeper engagement |
| 8 | **Phase 7D**: Celebrations | 3-5 days | Retention booster |
| 9 | **Phase 8B-D**: Images, YouTube, Audio | 2-3 weeks | Content flexibility |

---

## Ideas to Improve Learning & UX

### For Students
1. **Smart Study Suggestions**: When a student opens the app, show "You should review Biology Ch. 7 — 12 cards are due and your accuracy dropped from 90% to 72% last session." Actionable, specific, motivating.
2. **Spaced Review Notifications**: Browser push notifications when SM-2 says cards are due. "3 cards from Spanish Vocab are due for review — it'll take about 2 minutes."
3. **Micro-Sessions**: Option to study just 5 cards in under 2 minutes. Lower the barrier to studying daily. "Quick 5" button on the dashboard.
4. **Wrong Answer Explanations**: When a student gets a card wrong, show an AI-generated mini-explanation of why the correct answer is correct. This turns mistakes into learning moments.
5. **Study Buddy Matching**: Pair students studying the same sets. They can see each other's streaks and accuracy (anonymized). Light social motivation without full multiplayer.

### For Teachers
6. **One-Click Lesson Plan Import**: Teacher pastes lesson plan text → AI generates a full flashcard set in 10 seconds. This is the killer feature for the education market. Teachers save hours per week.
7. **Differentiated Assignments**: Assign different card subsets to different students based on their performance. Struggling students get more foundational cards; advanced students get harder ones.
8. **Class Insights Email**: Weekly automated email to teachers: "15 of 28 students completed this week's assignment. Top struggling topic: Photosynthesis. Recommended: assign a review session."
9. **Parent View**: Parents see a simple dashboard: "Your child studied 4 times this week. Accuracy: 82%. Next assignment due: Friday." Keep parents engaged without overwhelming them.
10. **Standards Alignment Tags**: Teachers can tag flashcard sets to curriculum standards (Common Core, state standards). Makes it easier to find and share relevant content across the school.

### For Engagement & Retention
11. **Daily Streak with Forgiveness**: Allow one "streak freeze" per week (like Duolingo). Missing one day doesn't break a 30-day streak. Reduces frustration.
12. **Progress Sharing**: "I studied 47 cards this week and improved my accuracy to 91%!" — shareable image card for social media. Organic growth driver.
13. **Set Recommendations**: "Students who studied Biology Ch. 7 also studied Biology Ch. 8." Content discovery based on study patterns.
14. **Card Difficulty Auto-Adjustment**: If a student gets a card right 5 times in a row, automatically increase the SM-2 interval more aggressively. If they always get it wrong, flag it as a "problem card" and suggest breaking it into simpler sub-concepts.

---

## Files That Should Be Cleaned Up

| File | Action |
|------|--------|
| `docs/Product Requirements Document ver 0001.md` | Delete (duplicate of `docs/planning-docs/` version) |
| `docs/README.md` | Replace with actual project README or delete (describes old Vite prototype) |
| `docs/guides/style-guide.md` | Update header from "Temba Financial Dashboard" to "FlashLearn AI" |
| `docs/planning-docs/Prompt-v3.md` | Archive — describes obsolete Express+Render architecture |
| `docs/planning-docs/ImplementationPlan-OfflineStudyAndIndexedDBSync.md` | Archive — superseded by PowerSync plan |
| `docs/ProjectPlan.md` | Update checkboxes to reflect actual state, or retire in favor of `/roadmap` |
| `contexts/StudySessionContext.tsx.backup` | Delete |
| `lib/db/indexeddb.ts.backup` | Delete |
| `lib/services/syncService.ts.backup` | Delete |
