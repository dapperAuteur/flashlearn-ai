# FlashLearn AI — UX/UI Improvements & Legal Documentation Plan

**Operator:** B4C LLC (Anthony McDonald, AwesomeWebStore.com)
**Date:** February 23, 2026

> **DISCLAIMER:** The legal sections of this document are for planning purposes only. All final legal documents must be reviewed and approved by a qualified attorney specializing in EdTech and student privacy law.

---

## Table of Contents

1. [UX/UI Improvement Ideas](#1-uxui-improvement-ideas)
2. [Terms of Service](#2-terms-of-service)
3. [Privacy Policy](#3-privacy-policy)
4. [Student Protection Measures](#4-student-protection-measures)
5. [Hold Harmless & Liability Disclaimer](#5-hold-harmless--liability-disclaimer)
6. [Critical Legal Action Items](#6-critical-legal-action-items)

---

## 1. UX/UI Improvement Ideas

### High Priority

#### 1A. Accessibility Overhaul
- Add comprehensive ARIA labels across all interactive elements
- Implement focus management for modals, navigation, and study flow
- Add skip-to-content links on every page
- Keyboard navigation support for all features (not just study cards)
- Screen reader testing and fix pass
- Color contrast audit (WCAG 2.1 AA minimum — 4.5:1 for normal text, 3:1 for large text)
- Add `aria-live` regions for dynamic content updates (study progress, timer, results)
- Ensure all form inputs have proper `<label>` associations and `aria-describedby` for errors
- Add `autocomplete` attributes to all form fields
- Target WCAG 2.1 AA compliance (ADA Title II deadline: April 24, 2027)

#### 1B. Mobile Experience Polish
- Audit all touch targets — minimum 44x44px tap areas per Apple/Google guidelines
- Optimize flashcard study experience for mobile (larger text, swipe gestures)
- Add swipe-to-flip on study cards (touch gesture support)
- Test and fix chart rendering on small screens (< 375px width)
- Ensure modals don't overflow on small screens
- Add pull-to-refresh on dashboard and flashcard lists
- Bottom navigation bar for mobile (Dashboard, Study, Generate, Profile) instead of hamburger menu
- Sticky action buttons on long scroll pages
- Optimize image upload flow for mobile camera

#### 1C. Complete Incomplete Pages
- **Settings page** — Currently shows "No settings" placeholder. Add:
  - Study preferences (default mode, confidence scale on/off, cards per session)
  - Notification preferences (email, push)
  - Display preferences (font size, theme)
  - Data export/import
  - Account deletion
- **Profile page** — Currently read-only display. Add:
  - Editable profile fields (name, avatar, bio, grade level)
  - Password change functionality
  - Connected accounts management
  - Study goals and targets
- **Statistics page** — Wire up to real data from `/api/study/stats`

#### 1D. Dark Mode
- Currently inconsistent (26 `dark:` prefixes scattered across the app)
- Implement system-wide dark mode toggle in settings/header
- Define dark mode color tokens (background, surface, text, border)
- Apply consistently across all pages and components
- Respect system preference via `prefers-color-scheme`
- Persist preference to localStorage

### Medium Priority

#### 1E. Onboarding & First-Run Experience
- Guided tour for new users (highlight key features step-by-step)
- Empty state improvements — instead of "No data yet," show contextual CTAs:
  - Dashboard: "Create your first flashcard set" button
  - Study: "No sets yet — generate one with AI"
  - Analytics: "Complete a session to see your stats"
- Quick-start wizard: choose a topic → AI generates cards → start studying in under 60 seconds
- Progressive disclosure of advanced features (modes, analytics, classroom)

#### 1F. Study Experience Enhancements
- **Session progress bar** — visual progress indicator during study
- **Card counter animation** — animate the "Card X of Y" transition
- **Streak encouragement** — "You're on a 5-day streak! Keep going!" toast
- **Smart study reminders** — "You have 12 cards due for review" notification banner
- **Quick review mode** — review cards due today from dashboard with one tap
- **Session customization** — let users set card count per session (10, 20, 50, all)
- **Spaced repetition explanation** — brief explainer of why SM-2 works when showing "due cards"
- **End-of-session summary animation** — more engaging results reveal (counter animations, confetti for streaks)

#### 1G. Content Generation UX
- **Upload progress indicators** — show progress bar for PDF/image/audio uploads
- **Preview extracted content** — before generating flashcards, show the extracted text and let users edit/trim it
- **Batch generation** — generate cards from multiple sources at once
- **Edit cards inline** — click to edit front/back directly in the preview grid
- **Drag-to-reorder** — reorder cards by dragging in the preview
- **Duplicate detection** — warn if similar cards already exist in another set
- **Template system** — pre-built flashcard templates for common subjects (anatomy, vocabulary, math formulas)

#### 1H. Navigation & Information Architecture
- **Breadcrumbs** on nested pages (Classroom > Classroom Name > Assignment)
- **Search** — global search across flashcard sets, cards, and study history
- **Recent items** — quick access to recently studied or edited sets
- **Favorites** — pin frequently studied sets
- **Sidebar navigation** for desktop (instead of top nav only) — better use of wide screens
- **Command palette** (Cmd+K) for power users — search, navigate, quick actions

#### 1I. Social & Sharing
- **Public set discovery** — browse and search public flashcard sets by topic, rating, popularity
- **Set ratings and reviews** — let users rate public sets after studying
- **Study groups** — invite friends to study together (shared session, see each other's progress)
- **Leaderboards** — opt-in classroom or global leaderboards for engagement
- **Share to social** — share achievements and streaks to social media

#### 1J. Teacher Dashboard
- **Student progress overview** — at-a-glance dashboard showing all students' performance
- **Assignment analytics** — see which questions students struggle with most
- **Bulk student import** — CSV upload for adding students to classrooms
- **Communication** — send announcements to classroom
- **Customizable grading** — configure how confidence and accuracy map to grades

### Lower Priority

#### 1K. Performance & Loading
- **Skeleton loaders** everywhere (replace spinner-only loading states)
- **Optimistic UI** — show changes immediately before server confirms (card edits, saves)
- **Prefetch** next card's data during current card study
- **Image optimization** — use Next.js `<Image>` component consistently (currently using `<img>` in UserMenu)
- **Code splitting** — lazy load analytics charts, celebration modal, and share modal

#### 1L. Visual Polish
- **Consistent iconography** — standardize on Heroicons across the app
- **Micro-interactions** — subtle animations on button clicks, card flips, state changes
- **Typography hierarchy** — define and enforce heading/body/caption sizes
- **Color system** — document and enforce primary/secondary/accent/semantic colors
- **Illustration system** — custom illustrations for empty states and onboarding
- **Favicon and PWA manifest** — app icon for mobile home screen

#### 1M. Notifications System
- **In-app notification center** — bell icon in header with notification dropdown
- **Study reminders** — "Time to review! You have X cards due"
- **Achievement notifications** — real-time achievement unlocks
- **Assignment due date reminders** — for students
- **Email digest** — weekly summary of study progress

#### 1N. Gamification Enhancements
- **XP system** — earn experience points for studying, streaks, achievements
- **Level progression** — visual level-up system based on XP
- **Daily challenges** — "Study 20 cards today" with bonus rewards
- **Badges gallery** — visual grid of all possible badges with locked/unlocked state
- **Study goals** — set weekly goals and track progress

#### 1O. Offline Experience
- **Better offline indicator** — more prominent banner with sync status
- **Offline study queue** — clearly show which sets are available offline
- **Sync conflict resolution** — handle conflicts when coming back online
- **Download sets for offline** — explicit download button on set cards

---

## 2. Terms of Service

> Draft outline — must be reviewed by a qualified attorney.

### 2.1 Acceptance and Eligibility
- Using FlashLearn AI constitutes acceptance of these Terms
- Users must be 13+ to create an account independently
- Users under 13 require verifiable parental consent (COPPA)
- Users under 18 must have parent/guardian consent
- Teachers/schools may create accounts on behalf of students
- Schools may consent for students under 13 for educational purposes (FERPA school official exception)
- Registration information must be truthful
- Age gating must be neutral (per 2025 COPPA amendments)

### 2.2 Account Types and Roles
- **Student** — primary learner account
- **Teacher/Tutor** — can create classrooms, assign sets, view student progress
- **Parent/Guardian** — can manage child accounts, review data, provide consent
- **School Administrator** — institutional oversight
- **Platform Administrator** — B4C LLC staff

### 2.3 AI-Generated Content
- FlashLearn AI uses Google Gemini AI for flashcard generation and answer evaluation
- AI content is provided "as-is" for educational supplementation only
- **Not a substitute** for professional instruction, tutoring, or curriculum
- No guarantee of accuracy, completeness, or suitability
- AI outputs may contain errors, inaccuracies, or biases
- Users should verify information independently
- B4C LLC reserves the right to moderate, filter, or remove AI-generated content
- AI-generated content may not be eligible for copyright protection (per US Copyright Office guidance)

### 2.4 User-Generated Content
- Users retain ownership of content they create (flashcard sets, notes)
- License granted to B4C LLC to host, display, and process content for platform operation
- Prohibition on uploading illegal, harmful, infringing, or inappropriate content
- Content moderation rights reserved
- DMCA takedown procedures for copyright claims

### 2.5 Subscription and Billing
- Description of tiers: Free, Monthly Pro ($9.99/mo), Lifetime ($100)
- Auto-renewal terms and billing frequency
- Cancellation and refund policy
- Failed payment handling and grace periods
- Price change notification (reasonable advance notice)
- Stripe as third-party payment processor — B4C LLC does not store credit card data directly

### 2.6 Educational Use and Classrooms
- Teacher responsibility for managing student accounts within classrooms
- Data sharing scope limited to classroom context
- Student data cannot be used for non-educational purposes
- School/district procurement terms

### 2.7 Acceptable Use Policy
- No cheating/academic dishonesty assistance
- No harassment, spam, or abuse
- No reverse engineering, scraping, or automated access
- No circumvention of age verification or parental consent
- Compliance with all applicable laws

### 2.8 Modification and Termination
- B4C LLC may modify terms with notice
- Material changes require affirmative consent (especially for minor accounts)
- Platform may suspend/terminate accounts for violations
- Users may delete accounts and request data deletion
- Data retention and deletion upon termination

### 2.9 Governing Law
- Governed by the laws of the state where B4C LLC is incorporated
- Dispute resolution mechanism (arbitration or court jurisdiction)

---

## 3. Privacy Policy

> Draft outline — must be reviewed by a qualified attorney.

### 3.1 Information We Collect

| Category | Data Points |
|----------|-------------|
| **Account Info** | Name, email, role, school name (optional), grade level, date of birth |
| **Authentication** | Session tokens, OAuth data, encrypted JWTs (via NextAuth) |
| **Educational Content** | Flashcard sets, study sessions, quiz responses, performance metrics |
| **Usage Data** | Pages visited, features used, time spent, device/browser info, IP address |
| **Payment Data** | Processed by Stripe — subscription status, billing history, Stripe customer ID |
| **AI Interaction Data** | Prompts sent to Gemini API and responses (for flashcard generation/evaluation) |
| **Uploaded Content** | PDFs, images, audio files uploaded for flashcard generation |

### 3.2 How We Use Data
- Providing and improving the FlashLearn AI service
- Generating AI-powered flashcards and evaluations
- Tracking study progress and analytics
- Processing payments and subscriptions
- Service communications
- Platform security and abuse prevention
- **Student data is NEVER used for targeted advertising, sold to third parties, or used to build advertising profiles**

### 3.3 Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| **Google Gemini AI** | Flashcard generation, answer evaluation | Study prompts, user content (no PII) |
| **MongoDB Atlas** | Data storage | All platform data (encrypted at rest/transit) |
| **NextAuth** | Authentication | Email, OAuth tokens, session data |
| **Stripe** | Payment processing | Name, email, payment method, billing address |
| **Vercel** | Hosting/CDN | IP addresses, request logs |
| **Vercel Analytics** | Usage analytics | Anonymized usage data |

### 3.4 COPPA Compliance (Children Under 13)
- Verifiable parental consent required before collecting data from children under 13
- Approved consent methods: signed form, credit card verification, knowledge-based auth, video call
- Separate consent required for sharing children's data with third parties
- Data minimization — only collect what is necessary
- Data retention limits — only kept as long as necessary
- Parents can review data, request deletion, and revoke consent
- Full compliance with 2025 COPPA amendments required by April 22, 2026

### 3.5 FERPA Considerations
- When used by schools, student data may constitute education records under FERPA
- Platform operates as "school official" under FERPA exception
- Student data from school relationships cannot be used for commercial purposes
- Parents and eligible students (18+) can access and request amendment of records
- Data Processing Agreements available for school districts

### 3.6 Cookies
- **Session cookies** — NextAuth authentication (necessary)
- **Preference cookies** — user settings
- **No advertising cookies or trackers**
- Cookie consent mechanism for EU/UK users

### 3.7 Data Security
- Encryption at rest and in transit (MongoDB Atlas TLS, HTTPS)
- JWT encryption (A256GCM)
- Access controls and authentication
- Incident response procedures
- Breach notification commitments per applicable law

### 3.8 Data Retention and Deletion
- Data retained as long as account is active plus reasonable period
- Child data deleted when no longer needed (COPPA requirement)
- Users can request data export and deletion
- School data handled per DPA terms upon contract end

### 3.9 State-Specific Rights
- **California (CCPA/CPRA + SOPIPA):** Right to know, delete, opt-out; student data cannot be sold or used for targeted advertising
- **New York (Ed Law 2-d):** Specific contractual provisions, parents' bill of rights, encryption
- **Other states:** 150+ student privacy laws across 47 states + DC

---

## 4. Student Protection Measures

### 4.1 Age Verification
- Neutral age gating at registration (no default age, no encouragement to falsify)
- Date of birth collection to determine applicable protections
- Under 13: trigger parental consent workflow before any data collection
- Ages 13–17: require parent/guardian acknowledgment
- Monitor emerging state requirements for age assurance

### 4.2 Parental Consent Flow
- Verifiable parental consent using FTC-approved methods:
  - **Recommended:** Email-plus method (consent email + confirmation) for basic collection
  - Credit card verification via Stripe for enhanced consent
  - Separate consent for third-party data sharing
- Parent dashboard features:
  - Review collected data about their child
  - Review AI content their child has interacted with
  - Delete child's data
  - Revoke consent at any time
- Maintain records of all parental consents

### 4.3 Data Minimization
- Only collect information strictly necessary for educational service
- No geolocation collection from students
- No biometric data collection
- Minimize persistent identifiers for child accounts
- **No PII sent to Gemini API** — use anonymized/pseudonymized prompts
- Strip metadata from uploaded content

### 4.4 AI Content Safety
- Content filtering on all AI outputs before display to students
- Filter for: inappropriate content, violence, sexual content, hate speech, misinformation
- Prompt injection protection to prevent manipulation
- Log AI interactions for safety auditing (while respecting data minimization)
- Human review process for flagged content
- Teacher/parent reporting mechanism for inappropriate AI content
- Age-appropriate content controls based on grade level

### 4.5 Platform Safety
- No direct student-to-student messaging
- No public profiles for student accounts
- Teacher-controlled classroom environments
- No targeted advertising to any users
- No manipulative gamification designed to maximize screen time
- Content moderation on all user-generated content

### 4.6 FERPA Compliance in Classrooms
- Teacher acts as school official authorizing data access
- Student data visible only to assigned teacher and the student
- No cross-classroom data sharing without authorization
- Performance data treated as education records
- DPA templates available for school districts
- Support for school administrator oversight
- Data export for school record-keeping

---

## 5. Hold Harmless & Liability Disclaimer

> This section outlines the liability protections for B4C LLC, Anthony McDonald, and AwesomeWebStore.com. Must be finalized by legal counsel.

### 5.1 General Disclaimer

THE FLASHLEARN AI PLATFORM, INCLUDING ALL AI-GENERATED CONTENT, STUDY MATERIALS, FLASHCARDS, ANSWER EVALUATIONS, AND EDUCATIONAL RESOURCES, IS PROVIDED BY B4C LLC ("COMPANY"), OPERATED BY ANTHONY MCDONALD THROUGH AWESOMEWEBSTORE.COM, ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

### 5.2 AI Content Disclaimer
- All AI-generated flashcards, study materials, and answer evaluations are provided "as is" without warranty of accuracy, completeness, reliability, or error-free operation
- AI-generated content is intended as a supplementary educational tool only and does not constitute professional educational advice, tutoring, or certified instruction
- B4C LLC does not guarantee that use of the platform will result in any particular academic outcomes, test scores, or learning results
- The platform uses third-party AI (Google Gemini), and B4C LLC does not control the underlying AI model's training data, biases, or outputs
- Users should verify important information with qualified educators or trusted reference materials

### 5.3 Limitation of Liability
- Total liability of B4C LLC, Anthony McDonald, and AwesomeWebStore.com is capped at the amount paid by the user in the preceding 12 months
- No liability for: indirect, incidental, special, consequential, or punitive damages
- No liability for: loss of data, loss of profits, or interruption of service
- No liability for: reliance on AI-generated content or academic decisions based on platform outputs
- No liability for: unauthorized access or data breaches to the extent permitted by law
- Savings clause: some jurisdictions do not allow certain limitations, which will apply to the minimum extent required

### 5.4 Indemnification and Hold Harmless

BY USING FLASHLEARN AI, YOU AGREE TO INDEMNIFY, DEFEND, AND HOLD HARMLESS B4C LLC, ANTHONY MCDONALD, AWESOMEWEBSTORE.COM, AND THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, AND SUPPLIERS (COLLECTIVELY, THE "RELEASED PARTIES") FROM AND AGAINST ALL CLAIMS, LOSSES, EXPENSES, DAMAGES, AND COSTS, INCLUDING REASONABLE ATTORNEYS' FEES, ARISING FROM OR RELATING TO:

1. Your use or misuse of the FlashLearn AI platform
2. Your violation of these Terms of Service
3. Your violation of any applicable law or regulation
4. Content you upload, create, or share on the platform
5. Any reliance on AI-generated content for academic or educational decisions
6. Your failure to maintain account security
7. Any dispute between you and any third party relating to the platform

### 5.5 Third-Party Service Disclaimer
- B4C LLC shall not be held liable for actions, errors, outages, or data handling by third-party service providers including but not limited to Google (Gemini AI), MongoDB, Stripe, and Vercel
- Each third-party service operates under its own terms of service and privacy policy

### 5.6 Educational Content Disclaimer
- FlashLearn AI is not an accredited educational institution
- AI-generated content has not been reviewed by certified educators unless explicitly stated
- The platform does not guarantee compliance with any specific curriculum, standard, or testing framework
- Users (or parents/guardians for minors) are solely responsible for evaluating the suitability of content for their educational needs

### 5.7 Force Majeure
- Neither B4C LLC nor its principals shall be liable for failures due to circumstances beyond reasonable control, including natural disasters, pandemics, government actions, third-party service outages, and cyberattacks

---

## 6. Critical Legal Action Items

### Urgent (Before Launch / Immediately)

1. **Resolve Google Gemini API age restriction** — Gemini API ToS states: *"You will not use the Services as part of a website, application, or service that is directed towards or is likely to be accessed by individuals under the age of 18."* Options:
   - Use Google Vertex AI (may have different terms for education)
   - Explore Google AI Pro for Education in Workspace
   - Architect so minors never directly interact with Gemini API (server-side only)
   - Obtain specific license/exception from Google for educational use
   - Consider alternative AI providers with education-friendly terms
   - **Consult attorney immediately**

2. **Implement COPPA-compliant parental consent flow** — Required before collecting data from users under 13. Full compliance with 2025 amendments required by **April 22, 2026**

3. **Implement neutral age gating** at registration

4. **Ensure no PII is sent to Gemini API** — Architect prompts to be anonymized

5. **Engage a qualified attorney** specializing in EdTech and student privacy law

### High Priority (Before Scaling)

6. **Prepare Data Processing Agreement (DPA) templates** for school districts (using SDPC national template as baseline)
7. **Conduct accessibility audit** targeting WCAG 2.1 AA
8. **Implement AI content moderation/filtering** on all AI outputs
9. **Build parent dashboard** for consent management and data review
10. **Establish data retention and deletion policies** with specific timelines
11. **Obtain cyber liability insurance**
12. **Obtain errors and omissions (E&O) insurance**

### Monitor

13. California's proposed Parents & Kids Safe AI Act (2026)
14. FTC monitoring of COPPA and EdTech
15. State-level AI-in-education regulations
16. EU AI Act high-risk classification for education AI systems
17. Emerging screen time restrictions for minors

---

## Sources

- [FTC Finalizes COPPA Amendments (Jan 2025)](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data)
- [COPPA Compliance Guide 2025 — Promise Legal](https://blog.promise.legal/startup-central/coppa-compliance-in-2025-a-practical-guide-for-tech-edtech-and-kids-apps/)
- [FERPA — Student Privacy ED.gov](https://studentprivacy.ed.gov/ferpa)
- [State Student Privacy Laws — Public Interest Privacy Center](https://publicinterestprivacy.org/resources/state-student-privacy/)
- [Gemini API Terms of Service — Google](https://ai.google.dev/gemini-api/terms)
- [EdTech Policy Changes 2026 — Filament Games](https://www.filamentgames.com/blog/major-edtech-policy-changes-coming-in-2026/)
- [EdTech Regulatory Landscape — McDermott](https://www.mwe.com/insights/edtech-and-privacy-navigating-a-shifting-regulatory-landscape/)
- [SOPIPA — Common Sense Media](https://www.commonsensemedia.org/kids-action/about-us/our-issues/digital-life/sopipa)
- [MongoDB DPA](https://www.mongodb.com/legal/data-processing-agreement)
- [Stripe Services Agreement](https://stripe.com/legal/ssa-services-terms)
