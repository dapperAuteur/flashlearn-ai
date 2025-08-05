
### **Product Requirements Document: Flashcard AI Pro MVP**

**Version:** 1.2
**Date:** July 4, 2025
**Author:** Code Architect
**Status:** In Review

#### **1. Introduction & Purpose**
This document outlines the requirements for the Minimum Viable Product (MVP) of Flashcard AI Pro: The Today I L.E.A.R.N.T. Show (TIL.Show). This product is a mobile-first, AI-powered Progressive Web App (PWA) designed to revolutionize flashcard-based learning. The primary goal of this MVP is to validate the core value proposition: making flashcard creation effortless and studying more effective through AI.

#### **2. The Problem**
Today's learners, particularly those in demanding fields like medicine, spend countless hours on the inefficient, manual task of creating digital study materials from dense source content like textbooks, lectures, and videos. Existing tools can be unintuitive and lack sophisticated features to vary study methods or optimize for long-term retention. Flashcard AI Pro solves this by providing an intelligent, efficient, and user-friendly platform that automates card creation and optimizes study schedules, allowing users to focus on learning, not on tool administration.

#### **3. Target Audience & Personas**
The **primary target persona for the MVP is "The Med Student."**

* **Primary Persona 1: "The Med Student" - Maria Garcia**
* **Secondary Persona 2: "The Language Hacker" - Ben Carter**
* **Tertiary Persona 3: "The Corporate Trainer" - David Chen**

#### **4. Goals & Success Metrics (MVP)**
* **Primary Metric:** Acquire **100 paying "Lifetime Learner" users** at the $100 price point by the end of Summer 2025.
* **Secondary Metric:** Achieve a high level of user engagement, measured by the number of flashcard sets created via AI and the frequency of completed study sessions.

#### **5. MVP Features & User Stories**
* **User Accounts & Monetization**
    * As a new user, I need to create a secure account using my email.
    * As a user, I want the ability to create and switch between multiple profiles within my single account.
    * As a user, I want to clearly understand the differences between the free and paid tiers.
    * As Maria, I want to upgrade to the "Lifetime Learner" tier by paying a one-time $100 fee via Stripe.

* **AI-Powered Flashcard Creation**
    * As Maria, I want to generate a flashcard set from a text prompt, PDF, public YouTube link, audio file, or by uploading multiple images.
    * As Maria, I want to edit a flashcard set or flashcard. This generates new set of analytics for the editted flashcard.
    * As a user, I want to use the online Gemini AI for high-quality card generation (a premium feature).

* **Flashcard & Study Management**
    * As Maria, I want to import and export my flashcard sets using a provided CSV template.
    * As Maria, I want to set up to three "learning goals" per profile.
    * As Maria, I want the app's AI/ML to recommend new public flashcard sets based on my learning goals.
    * As Maria, I want to share a link to my public flashcard sets.

* **Intelligent Study Experience**
    * As Maria, I need the app to use an on-device TensorFlow.js model for spaced repetition.
    * As Maria, I want to receive push alerts when the ML model recommends it's time to study.
    * As Maria, I want to schedule up to three custom study alerts per profile.
    * As a user, I need a clear progress indicator during my study sessions.

* **Onboarding**
    * As a new user, I want a brief, guided tour of the MVP's core features.

#### **6. Data Models & Analytics (New Section)**

* **Data Model:**
    * **StudyAnalytics Model:** This model will store user-specific performance data and the ML-driven review schedules for each user profile. It will be the foundation for all analytics presented in the app and used for business intelligence.

* **Analytics & Insights:** The system will track and present different analytics tailored to the needs of different stakeholders.

    * **For the Student (Maria):** To provide actionable insights for improving study habits.
        * **Core Stats:** Time spent studying per set, average time per card, correct/incorrect stats for each card and set, and study frequency per set.
        * **Performance Over Time:** A chart showing her accuracy on a specific set over time (e.g., 70% -> 85% -> 95%) to visualize improvement and build confidence.
        * **"Problem Card" Identification:** Automatically flag the top 5 cards she gets wrong most often in any given set, so she knows exactly where to focus her efforts.
        * **Session Consistency:** A streak calendar (similar to GitHub's contribution graph) showing which days she has met her study goals to encourage consistent behavior.

    * **For the Teacher/Parent (Future Role - e.g., David Chen):** To enable progress tracking and intervention. (Note: These will be tracked in the backend during MVP but UI will be built post-MVP).
        * **Completion Rates:** Track what percentage of assigned students have completed a required flashcard set.
        * **Cohort Performance:** An aggregated view of class-wide accuracy on a specific set to identify topics the entire group is struggling with.
        * **Struggling Student Identification:** A list of students with the lowest accuracy scores or who are falling behind on their study schedules, enabling targeted support.

    * **For the Business Owner (You):** To measure product health and drive strategic decisions.
        * **Activation Rate:** What percentage of new sign-ups create their first flashcard set within 24 hours?
        * **Conversion Rate:** What percentage of free-tier users upgrade to the "Lifetime Learner" paid tier?
        * **Feature Adoption:** Which methods of flashcard creation (PDF, YouTube, Image, etc.) are most popular? This helps prioritize future development.
        * **Retention Cohorts:** Of the users who sign up in a given week, what percentage are still active 1, 7, and 30 days later? This is the key indicator of long-term product value.
        * **Power User Identification:** Identify the characteristics and behaviors of the most active users to understand what a "successful" user journey looks like.

#### **7. Non-Functional Requirements (MVP)**
* **Architecture:** Progressive Web App (PWA) with offline capability via IndexedDB.
* **Accessibility:** WCAG AA standards.
* **Security:** Thorough logging to flag anomalies.
* **AI Strategy:** On-device TensorFlow.js for core scheduling and Gemini API for premium generation.

#### **8. Out of Scope (For MVP Release)**
* Versus Mode, advanced user roles (Teammate, Community Leader), Public API, leaderboards, advanced study modes, and commission tracking.

#### **9. Assumptions & Constraints**
* **Assumption:** Users will pay for significant time savings and study efficiency.
* **Assumption:** AI-generated card quality will be high.
* **Constraint:** The application **must** be developed as a full-stack Next.js 15 application using App Router and typescripts.
  * Write tests before writing code for features. Use Jest for Unit tests and Cypress for End to End tests
  * Set up Authentication using NextAuth and use the pattern on https://next-auth.js.org/getting-started/example
  * Please build a NextJS full stack pwa using the Project Requirements Document in the Project Knowledge. Build single-responsibility components. I've already ran the npx create-next-app@latest command to start the next's 15 app using App Router. Please create the rest of the files. Remember to write tests before implementing features. Set up Authentication using NextAuth and use the pattern on https://next-auth.js.org/getting-started/example
* Use "Implementation Plan-Flashcard AI Pro TIL Show template.md" to find the order to implement features.