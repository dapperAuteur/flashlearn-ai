# Implementation Plan: Flashcard AI Gemini Pro (TIL.Show)

This plan is structured to deliver a Minimum Viable Product (MVP) first, allowing for early user feedback and engagement, followed by iterative phases that build out the full feature set.

## Phase 1: Minimum Viable Product (MVP) - Unauthenticated Experience

**Goal:** Launch a shareable, core version of the app that showcases its unique AI/ML features without requiring user accounts. The focus is on immediate engagement and collecting interest for the full launch.

-   [ ] **Core Frontend Shell:**
     - [ ] Create a basic, responsive layout for mobile-first use.
	    - [ ] build with NextJS 15
-   [ ] **On-Cloud AI Card Generation:**
    -   [ ] Integrate TensorFlow.js with a compact text-generation model.
    -   [ ] Build the UI for a user to input a prompt and generate a set of flashcards directly in the browser.
    -  [ ] Build the UI for a user to input a prompt and generate a set of flashcards on the cloud using Gemini API Key.
    -   [ ] **Provide a downloadable CSV template for the future flashcard import feature.**
-   [ ] **Local Storage:**
    -   [ ] Use IndexedDB to store the generated flashcards on the user's device for persistence across sessions.
-   [ ] **"Easy Mode" Study Interface:**
    -   [ ] Create the flashcard study component where users can flip cards.
    -   [ ] Implement "Right" and "Wrong" buttons for self-assessment (Easy Mode).
    -   [ ] **Implement a clear progress indicator for study sessions.**
-   [ ] **ML-Powered Spaced Recall:**
    -   [ ] Implement a basic spaced repetition algorithm (using TensorFlow.js) that runs on-device.
    -   [ ] Allow user to choose 3 preferred study times per day to receive alerts to study in addition to the times chosen by ML
    -   [ ] The algorithm will schedule the next review date for each card based on user performance and save it to IndexedDB.
	    -   [ ] Send user alerts to study based on ML schedule
-   [ ] **Asynchronous "Versus Mode":**
    -   [ ] Allow a user to complete a flashcard set and generate a shareable link with their score and time.
    -   [ ] When another user opens the link, they can play the same set and see if they can beat the original score.
-   [ ] **Leaderboard (MVP Version):**
    -   [ ] Create a simple, public leaderboard for popular public flashcard sets.
    -   [ ] For the MVP, prompt users for a "username" (or use the part of their email before the '@' if they provide one) which is stored locally. This does not require a login.
-   [ ] **Sharing Functionality:**
    -   [ ] **Implement web share APIs to allow users to share public flashcard sets via email, text, and social media (LinkedIn, Facebook, Blue Sky).**
-   [ ] **"Notify Me" Sign-up Form:**
    -   [ ] Create a simple form to collect email addresses for users interested in the full version with user accounts.

## Phase 2: User Authentication & Core Backend

**Goal:** Transition from a local-only experience to a full-stack application with user accounts, data persistence, and the foundation for monetization.

-   [ ] ~~**Backend Setup:**~~**Full Stack NextJS App**
    -   [ ] ~~Initialize a Node.js/Express server project.~~
    -   [ ] Set up MongoDB with Mongoose and define the `User` and `FlashcardSet` schemas.
-   [ ] **User Authentication:**
    -   [ ] Implement email/password registration and login endpoints.
    -   [ ] email/passphrase registration and login endpoints.
    -   [ ] Create secure JWT-based session management.
-   [ ] Add form to allow users to suggest new topics for lists to be added to the app
	-   [ ] create component to allow users to upvote topics already on the list and add descriptions and comments about existing items on the list to define what the list should be
-   [ ] **Data Persistence & Syncing:**
    -   [ ] Build API endpoints for creating, retrieving, updating, and deleting flashcard sets associated with a user account.
    -   [ ] Implement logic to sync flashcards from the MVP's IndexedDB storage to a user's account upon their first login/registration.
-   [ ] **Progressive Web App (PWA) Configuration:**
    -   [ ] Add a service worker and manifest file to make the application installable and fully offline-capable.
    -   [ ] Refine the data sync logic for seamless online/offline transitions.
    -   [ ] I'd like to add a UI change to communicate to the user when they're offline and when they go back online. For example, a message and border around the UI that's constant to communicate offline. Then a message that flashes on the screen for like 3 seconds to communicate when the user is back online.
-   [ ] **Stripe Integration:**
    -   [ ] Set up Stripe and create backend logic to handle subscription plans (monthly/annual) and the one-time "Lifetime Learner" payment.
    -   [ ] Figure out the tax liability with each state
	    -   [ ] Talk to Uncle Robert
    -   [ ] Update options for allow users to switch between plans
    -   [ ] add links to stripe
	    -   [ ] privacy
	    -   [ ] customer support
	    -   [ ] terms of service
    -   [ ] Build a basic "Settings" page where users can manage their subscription.
    -   [ ] Add classroom and community pricing model/products
-   [ ] **ML-Powered Spaced Recall (continued):**
    -   [ ] Implement a basic spaced repetition algorithm (using TensorFlow.js) that runs on-device.
    -   [ ] Allow user to choose 3 preferred study times per day to receive alerts to study in addition to the times chosen by ML
    -   [ ] The algorithm will schedule the next review date for each card based on user performance and save it to IndexedDB.
-   [ ] Celebrate the SMALL WINS
	-   [ ] add a 3 tiered celebration system to celebrate user completing a study session and to celebrate their progress. use TensorFlow to track and determine when progress is made based on these variables:
		-   [ ] studying more often
		-   [ ] improving performance on topic
		-   [ ] mastering a new flashcard
		-   [ ] completing a new topic
- Phase 2 Issues:
	- [ ] user should be able to change password
	- [ ] user should be able to change email

## Phase 3: Advanced Features & Role-Based Access (RBAC)

**Goal:** Build out the advanced learning tools and the comprehensive management system for different user roles.

-   [ ] **Advanced Study Modes:**
    -   [ ] Implement "Medium Mode" with multiple-choice answers and hint tracking.
    -   [ ] Implement "Hard Mode" with text/voice input and AI-powered answer validation (integrating with Gemini API for paid users).
    -   [ ] **Allow users to practice by guessing side B from side A or vice-versa, with separate analytics tracked for each scenario.**
-   [ ] **Advanced User Roles & Permissions:**
    -   [ ] Implement the full RBAC hierarchy (Admin, Teammate, Community Leader, Teacher/Parent, Student).
    -   [ ] Build the backend logic to enforce permissions across the entire API.
-   [ ] **Role-Specific Dashboards:**
    -   [ ] Create the Admin dashboard for user management, analytics overview, and feature flagging.
    -   [ ] Create dashboards for Teachers/Community Leaders to manage their students/members and view their progress.
    -   [ ] **Implement CSV user import for Admin, Teammate, and Community Leader roles.**
-   [ ] **Advanced Content Ingestion:**
    -   [ ] Implement backend services to process uploaded files (PDF, DOCX, CSV) and web content (YouTube transcripts) to create flashcards.
    -   [ ] Connect this functionality to the paid tiers, using the Gemini API for processing.
-   [ ] TensorFlow.js schedule to get retrained to improve performance monthly

## Phase 4: Real-Time Competition & Public API

**Goal:** Enhance community engagement with live competition and expand the app's ecosystem by opening it up to other developers.

-   [ ] **Synchronous "Versus Mode":**
    -   [ ] Integrate Socket.IO into the backend and frontend.
    -   [ ] Create the real-time logic for match-making, live score updates, and winner determination with the time-based tie-breaker.
-   [ ] **Public REST API:**
    -   [ ] Formalize and document a set of public API endpoints for developers.
    -   [ ] Implement an API key generation and management system for users.
    -   [ ] Add tiered rate-limiting to the public API.
-   [ ] **Advanced Security & Logging:**
    -   [ ] Implement a detailed logging system with Winston.
    -   [ ] Configure logging to flag suspicious behavior and generate alerts for admins.

## Phase 5: Onboarding & Polish

**Goal:** Refine the user experience to ensure the application is welcoming, accessible, and professional.

-   [ ] **Guided Onboarding:**
    -   [ ] Create the automated, interactive tours for new users.
    -   [ ] Implement the in-app prompts to encourage tour completion.
-   [ ] **Accessibility & UX Refinements:**
    -   [ ] Conduct a full audit to ensure WCAG AA compliance.
    -   [ ] Implement the full suite of planned keyboard shortcuts.
-   [ ] **Community Documentation:**
    -   [ ] Author and publish the `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `CODING_STYLE_GUIDE.md`.