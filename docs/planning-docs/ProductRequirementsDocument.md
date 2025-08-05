### **Product Requirements Document: Flashcard AI Pro MVP**

**Version:** 1.1
**Date:** July 4, 2025
**Author:** Code Architect
**Status:** In Review

#### **1. Introduction & Purpose**
This document outlines the requirements for the Minimum Viable Product (MVP) of Flashcard AI Pro: The Today I L.E.A.R.N.T. Show (TIL.Show). This product is a mobile-first, AI-powered Progressive Web App (PWA) designed to revolutionize flashcard-based learning. The primary goal of this MVP is to validate the core value proposition: making flashcard creation effortless and studying more effective through AI.

#### **2. The Problem**
Today's learners, particularly those in demanding fields like medicine, spend countless hours on the inefficient, manual task of creating digital study materials from dense source content like textbooks, lectures, and videos. Existing tools can be unintuitive and lack sophisticated features to vary study methods or optimize for long-term retention. Flashcard AI Pro solves this by providing an intelligent, efficient, and user-friendly platform that automates card creation and optimizes study schedules, allowing users to focus on learning, not on tool administration.

#### **3. Target Audience & Personas**
While the application will serve a variety of users, the **primary target persona for the MVP is "The Med Student."**. All MVP features should be prioritized to solve her problems first.

* **Primary Persona 1: "The Med Student" - Maria Garcia**
    * **Demographics:** 24, female, urban (New York), medical student.
    * **Psychographics:** Highly disciplined, ambitious, and time-poor. Values efficiency and proven results above all. Terrified of failing her boards and seeks the best tools for a competitive edge.
    * **Pain Points:** Spends hours manually creating flashcards from dense textbooks and lecture slides. Finds existing tool interfaces (like Anki) to be unintuitive. Struggles to test her knowledge in different ways beyond simple recall.

* **Secondary Persona 2: "The Language Hacker" - Ben Carter**
    * **Demographics:** 32, male, remote software engineer.
    * **Psychographics:** Loves systems and optimization. Views language learning as a system to be solved and wants to create flashcards from real-world content.
    * **Pain Points:** Finds mainstream apps too gamified. Wants more control and the ability to generate study materials from articles and videos.

* **Tertiary Persona 3: "The Corporate Trainer" - David Chen**
    * **Demographics:** 45, male, L&D professional.
    * **Psychographics:** Focused on ROI, employee performance, and scalability.
    * **Pain Points:** Needs to create and track engaging training materials efficiently for non-technical employees.

#### **4. Goals & Success Metrics (MVP)**
The business goal for this MVP is to validate market demand and the core feature set.
* **Primary Metric:** Acquire **100 paying "Lifetime Learner" users** at the $100 price point by the end of Summer 2025.
* **Secondary Metric:** Achieve a high level of user engagement, measured by the number of flashcard sets created via AI and the frequency of completed study sessions.

#### **5. MVP Features & User Stories**
The MVP will focus on the core loop of AI-powered creation and ML-scheduled review.

* **User Accounts & Monetization**
    * As a new user, I need to create a secure account using my email.
    * As a user, I want the ability to create and switch between multiple profiles within my single account, so I can separate my study subjects (e.g., 'Medical Boards' vs. 'Language Learning').
    * As a user, I want to clearly understand the differences between the free and paid tiers.
    * As Maria, I want to upgrade to the "Lifetime Learner" tier by paying a one-time $100 fee via Stripe integration, so I can access all premium features.

* **AI-Powered Flashcard Creation**
    * As Maria, I want to generate a flashcard set (defaulting to a max of 20 cards) from a text prompt, a PDF of my lecture notes, a public YouTube link, or an audio file, so I can save hours of manual data entry.
    * As Maria, I want to upload multiple images, like screenshots of my lecture slides or photos of my textbook pages, to create a single flashcard set, so I can digitize my physical study materials quickly.
    * As a user, I want to use the online Gemini AI for high-quality card generation (a premium feature).

* **Flashcard & Study Management**
    * As Maria, I want to import and export my flashcard sets using a provided CSV template, so I can manage my content in bulk or use cards from other sources.
    * As Maria, I want to set up to three "learning goals" per profile so the app can personalize my experience.
    * As Maria, I want the app's AI/ML to recommend new public flashcard sets based on my learning goals, so I can discover relevant study materials.
    * As Maria, I want to share a link to my public flashcard sets with my study group.

* **Intelligent Study Experience**
    * As Maria, I need the app to use an on-device TensorFlow.js model for spaced repetition, so it can create an optimal study schedule for me, even when I'm offline.
    * As Maria, I want to receive push alerts when the ML model recommends it's time to study a specific set, so I stay on track.
    * As Maria, I want to schedule up to three custom study alerts per profile for times that fit my daily routine (e.g., 8 AM, 12 PM, 10 PM), in addition to the AI-generated alerts, so I have full control over my study reminders.
    * As a user, I need a clear progress indicator during my study sessions to see how much I have left.

* **Onboarding**
    * As a new user, I want a brief, guided tour of the MVP's core features so I can get started quickly.

#### **6. Non-Functional Requirements (MVP)**

* **Architecture:** The application must be a Progressive Web App (PWA). User profiles and flashcards will be saved on the server database.
* **Offline Capability:** The app must work offline. Study progress and data will be stored locally using IndexedDB and synced with the server when a connection is re-established.
* **Accessibility:** The UI must be mobile-first and responsive, adhering to Web Content Accessibility Guidelines (WCAG) AA standards.
* **Security & Logging:** The system will implement thorough and efficient logging to flag suspicious behavior and anomalies, which will be brought to the attention of the Admin.
* **AI Strategy:** The default experience for core ML features like spaced repetition scheduling will use an on-device TensorFlow.js model to reduce API costs and ensure offline functionality. The more resource-intensive Gemini API will be used for premium online features like initial card generation from source materials.

#### **7. Out of Scope (For MVP Release)**
To ensure a timely and focused launch, the following features from the initial plan are explicitly out of scope for the MVP:
* **Versus Mode** (both synchronous and asynchronous)
* **Advanced User Roles** (Teammate, Community Leader, Teacher/Parent) and their associated management dashboards
* **Public API** for third-party developers
* **Community Leaderboards**
* **Advanced Study Modes** (e.g., multiple-choice or typed/spoken answers)
* **Commission tracking** for Teammates

#### **8. Assumptions & Constraints**

* **Assumption:** Users in the target persona are willing to pay a one-time fee for a tool that provides significant time savings and study efficiency.
* **Assumption:** The quality of AI-generated flashcards from the specified sources will be high enough to be considered valuable by users.
* **Constraint:** The application **must** be developed as a full-stack Next.js application to simplify development.