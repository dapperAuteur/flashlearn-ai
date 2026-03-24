# Plan: Offline Audit, ARIA Compliance, Mobile-First Contrast, Marketing & Docs Update

## Context
FlashLearn AI needs a comprehensive quality pass to ensure: all modules gracefully handle offline, full ARIA accessibility across all ~58 components, WCAG AA contrast compliance, mobile-first responsiveness, updated marketing pages reflecting current features, and current documentation with gap fills.

---

## Phase 1: Foundation — Global CSS & Utility Classes

**Files:**
- `app/globals.css`

**Changes:**
1. Add `sr-only` utility class for screen-reader-only text
2. Add `focus-visible` ring styles for keyboard navigation (`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`)
3. Add `reduced-motion` media query to respect user preference on flashcard flip animations
4. Upgrade low-contrast text defaults — define CSS custom properties for accessible text colors

```css
@layer utilities {
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .flashcard-inner { transition: none; }
}
```

---

## Phase 2: Offline Audit & Fixes

### 2A. Service Worker — Expand cached routes
**File:** `public/service-worker.js`
- Currently only caches: `/study`, `/offline`, `/flashcards`, `/dashboard`
- Add: `/generate`, `/analytics`, `/history`, `/versus`, `/profile`, `/settings`, `/explore`
- Add versioned cache-busting strategy for CSS/JS assets

### 2B. Offline page improvements
**File:** `app/offline/page.tsx`
- Add proper heading hierarchy (`h1`)
- Add ARIA landmark (`role="main"`)
- Add link to cached routes the user can access offline
- Mobile-responsive layout

### 2C. OfflineIndicator ARIA
**File:** `components/ui/OfflineIndicator.tsx`
- Add `role="status"` and `aria-live="polite"` to the outer container
- Add `aria-label` to icons (`aria-hidden="true"` on decorative icons)

### 2D. Offline study modals
**Files:**
- `components/study/OfflineStudyModal.tsx`
- `components/study/OfflineResultsModal.tsx`
- `components/study/OfflineHistoryModal.tsx`

Ensure: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, `Escape` key close

---

## Phase 3: ARIA Compliance — All Components

Group by area. For each component: add missing `aria-*` attributes, keyboard support, focus management, `sr-only` labels for icon-only buttons, proper roles.

### 3A. Layout Components
| File | Changes |
|------|---------|
| `components/layout/Header.tsx` | Audit existing ARIA, add `sr-only` labels for icon buttons, ensure mobile menu has `aria-expanded` |
| `components/layout/PublicHeader.tsx` | Same as Header |
| `components/layout/Footer.tsx` | Add `role="contentinfo"`, `aria-label` for nav sections |
| `components/layout/AdminLayout.tsx` | Add `role="navigation"` to sidebar, `aria-current="page"` for active links, `sr-only` labels |

### 3B. Auth Components
| File | Changes |
|------|---------|
| `components/auth/SignInForm.tsx` | `aria-describedby` for errors, `aria-invalid` on invalid fields, `aria-label` for password toggle |
| `components/auth/SignUpForm.tsx` | Already good — verify all fields, add `aria-invalid` |
| `components/auth/ResetPasswordForm.tsx` | Same pattern as SignIn |

### 3C. Study Components (critical path)
| File | Changes |
|------|---------|
| `components/study/StudyCard.tsx` | `aria-live="polite"` for card content on flip, keyboard flip (`Enter`/`Space`), `role="region"` |
| `components/study/MultipleChoiceCard.tsx` | `role="radiogroup"` + `role="radio"` with `aria-checked`, keyboard arrow nav, `aria-live` for feedback |
| `components/study/TypeAnswerCard.tsx` | `aria-label` on input, `aria-describedby` for hint/feedback, `aria-live` for result |
| `components/study/ConfidenceScale.tsx` | `role="radiogroup"`, `aria-label` per option, keyboard nav |
| `components/study/ConfidenceResults.tsx` | Semantic headings, `aria-label` on charts |
| `components/study/CardFeedback.tsx` | `aria-live="assertive"` for correct/incorrect feedback |
| `components/study/StudySessionSetup.tsx` | `aria-required` on required fields, `role="group"` for mode selection, `aria-describedby` |
| `components/study/StudySessionResults.tsx` | Semantic structure, `aria-label` for stats |
| `components/study/StudySessionManager.tsx` | Focus management between cards, `aria-live` for progress |
| `components/study/CelebrationModal.tsx` | `role="dialog"`, `aria-modal`, auto-focus, `Escape` to close |
| `components/study/ShareableResultsCard.tsx` | `aria-label` for share actions |
| `components/study/HistoricalSessionView.tsx` | Table ARIA if tabular, semantic headings |

### 3D. Flashcard Components
| File | Changes |
|------|---------|
| `components/flashcards/FlashcardCard.tsx` | `role="button"`, `tabIndex={0}`, `Enter`/`Space` to flip, `aria-label="Flip card"`, `aria-live` for flipped content |
| `components/flashcards/FlashcardPreviewGrid.tsx` | `role="list"` on container, `role="listitem"` on cards |
| `components/flashcards/SaveControls.tsx` | `aria-label` on toggle, `sr-only` labels |
| `components/flashcards/FlashcardManager.tsx` | List roles, `aria-label` for action buttons |
| `components/flashcards/SetEditModal.tsx` | Dialog ARIA, focus trap |
| `components/flashcards/CategoryManager.tsx` | List roles, keyboard nav |
| `components/flashcards/CsvImportModal.tsx` | Dialog ARIA, focus trap, `aria-describedby` for instructions |

### 3E. Versus Components
| File | Changes |
|------|---------|
| `components/versus/ChallengeBoard.tsx` | Already has table roles — verify, add `aria-sort` if sortable |
| `components/versus/ChallengeCard.tsx` | `role="article"`, semantic headings |
| `components/versus/PublicChallengeCard.tsx` | Same as ChallengeCard |
| `components/versus/ChallengeHeader.tsx` | Semantic headings, `aria-label` for status |
| `components/versus/JoinChallengeInput.tsx` | `aria-label`, `aria-describedby` for format hint |
| `components/versus/ParticipantList.tsx` | `role="list"`, `role="listitem"` |
| `components/versus/ScoreComparison.tsx` | `aria-label` for visual comparisons |
| `components/versus/CompositeScoreBreakdown.tsx` | `aria-label` per metric, `sr-only` text for percentages |
| `components/versus/WaitingForOpponent.tsx` | `aria-live="polite"` for status updates |
| `components/versus/ChallengeShareModal.tsx` | Dialog ARIA |

### 3F. UI Components
| File | Changes |
|------|---------|
| `components/ui/PasswordStrengthMeter.tsx` | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` |
| `components/ui/StatisticCard.tsx` | `aria-label` combining label+value for screen readers |
| `components/ui/skeleton.tsx` | `aria-hidden="true"`, `role="presentation"` |
| `components/ui/toast.tsx` | `role="alert"`, `aria-live="assertive"` |
| `components/ui/toaster.tsx` | `aria-live` region |
| `components/ui/AnnouncementBanner.tsx` | `role="banner"`, `aria-label`, close button labeled |
| `components/ui/UserMenu.tsx` | `aria-expanded`, `aria-haspopup="menu"`, `role="menu"`/`role="menuitem"`, `Escape` to close |
| `components/ui/FeedbackWidget.tsx` | `aria-label`, form field labels |
| `components/ui/SignUpModal.tsx` | Dialog ARIA, focus trap |
| `components/ui/OnboardingModal.tsx` | Dialog ARIA, focus trap, step indicator with `aria-label` |
| `components/ui/ReportModal.tsx` | Already has dialog ARIA — verify completeness |
| `components/ShareModal.tsx` | Dialog ARIA, `aria-label` on copy button |
| `components/RatingStars.tsx` | `role="radiogroup"`, individual `role="radio"` with `aria-checked`, keyboard nav, `aria-label="Rating: X of 5"` |
| `components/PublicSetViewer.tsx` | Semantic headings, list roles for cards |
| `components/analytics/AnalyticsDashboard.tsx` | `aria-label` on charts, `sr-only` data tables as alternatives |
| `components/dashboard/ReviewSchedule.tsx` | Table or list ARIA |

---

## Phase 4: Contrast & Mobile-First Audit — All Pages

### 4A. Global contrast fixes
Across ALL files, replace low-contrast text utilities:
- `text-gray-400` → `text-gray-600` (or `text-gray-500` minimum for large text only)
- `text-gray-500` on white → `text-gray-600` (5.7:1 ratio, solid AA)
- `placeholder:text-gray-400` → `placeholder:text-gray-500`
- Ensure all `text-*` on colored backgrounds meet 4.5:1 for normal text, 3:1 for large (18px+ bold or 24px+)

### 4B. Mobile-first audit per page group
Review each page for:
- Touch target sizes (minimum 44x44px)
- No horizontal scroll on 320px viewport
- Readable font sizes (min 16px for body on mobile to prevent iOS zoom)
- Proper stacking on small screens (flex-col on mobile, flex-row on desktop)
- Adequate padding/margins on mobile

**Pages to audit:**
- All `app/(public)/` pages (landing, pricing, roadmap, explore, study, versus, docs)
- All `app/(dashboard)/` pages (generate, flashcards, dashboard, analytics, history, profile, versus, developer)
- All `app/(admin)/admin/` pages
- All `app/(auth)/` pages (signin, signup, reset password)
- `app/offline/page.tsx`

---

## Phase 5: Marketing Page Updates

### 5A. Landing page
**File:** `app/(public)/page.tsx`
- Add admin card quantity selector to feature list (if appropriate for public marketing)
- Update white-label status from "Coming Soon" if it has shipped
- Ensure feature list matches the complete actual feature set
- Verify all feature descriptions are accurate and current

### 5B. Pricing page
**File:** `app/(public)/pricing/page.tsx`
- Verify all tier features are accurate
- Update white-label section status
- Ensure API pricing is current

### 5C. Roadmap page
**File:** `app/(public)/roadmap/page.tsx`
- Move admin card quantity selector to "Completed" section
- Update any "In Progress" items that have shipped
- Update "Planned" items

### 5D. All marketing pages — ARIA + contrast + mobile
Apply Phase 3/4 standards to all public pages during content updates

---

## Phase 6: Documentation & Knowledge Base

### 6A. Fix outdated docs
- `docs/README.md` — Rewrite: replace "Gemini Flashcard Maker" with current FlashLearn AI branding, accurate feature list, correct architecture overview
- `docs/guides/style-guide.md` — Remove references to "Temba Financial Dashboard", update with FlashLearn-specific patterns and WCAG AA contrast requirements

### 6B. Add admin documentation
- Create `docs/guides/admin-dashboard-guide.md` — Document all 17+ admin pages: dashboard analytics, user management, settings, logs, API management, campaigns, categories, featured sets, flags, coupons, revenue, shares, conversations, SEO, health, invitations
- Include: admin quantity selector feature documentation

### 6C. Add in-app help/FAQ page
- Create `app/(dashboard)/help/page.tsx` — In-app help page with:
  - FAQ sections (Getting started, Study modes, Offline, Versus, API, Account)
  - Links to API docs, tutorials
  - Contact/feedback link
  - Searchable or collapsible sections
  - Full ARIA compliance from the start

### 6D. Ensure recent features are documented
- Admin card quantity selector — add to admin guide
- Any other undocumented features identified during audit

---

## Execution Order

Work in this order to build on foundations:

1. **Phase 1** (globals.css) — unlocks sr-only, focus-visible for all subsequent work
2. **Phase 2** (offline) — small, self-contained
3. **Phase 3A-3B** (layout + auth ARIA) — high-traffic components first
4. **Phase 3C** (study ARIA) — core user experience
5. **Phase 3D-3F** (flashcard, versus, UI ARIA) — remaining components
6. **Phase 4** (contrast + mobile audit) — sweep all pages
7. **Phase 5** (marketing updates) — content changes
8. **Phase 6** (docs) — documentation last since it describes final state

---

## Verification

After each phase:
1. `npx next build` — ensure no compilation errors
2. Manual check: resize browser to 320px width, verify no horizontal overflow
3. Browser DevTools accessibility audit (Lighthouse) on key pages
4. Keyboard-only navigation test: Tab through all interactive elements, verify focus visible
5. Screen reader test on study flow: generate → study → results
6. Verify offline: disconnect network, confirm cached pages load, OfflineIndicator appears
7. Review marketing pages match actual feature set
