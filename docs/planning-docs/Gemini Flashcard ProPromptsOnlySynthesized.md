# **Implementation Plan: Flashcard AI Pro: The Today I L.E.A.R.N.T. Show**

### **1. Project Overview**

**Project Name:** Flashcard AI Pro: The Today I L.E.A.R.N.T. Show (TIL.Show)

**Acronym:** L.E.A.R.N.T. stands for Learnt, Executed, Asked, Recalled, Networked, Tried.

**Core Purpose:** To create a professional-grade, mobile-first Progressive Web App (PWA) that leverages AI/ML to revolutionize flashcard-based learning. The application will serve as a portfolio-worthy project demonstrating expertise in full-stack development, user experience, and cybersecurity. It will enable users to create, study, and share flashcards while providing rich analytics and a tiered user system.

### **2. Core Features**

#### **2.1. Flashcard Creation & Management**

- **AI-Powered Generation:** Users provide a text prompt and a number, and the Gemini API generates the specified quantity of flashcards from vetted, peer-reviewed, and trustworthy sources.
    
- **Diverse Source Input:** Users can create flashcards from uploaded files including PDF, Word Doc, CSV, public YouTube links, images, and audio files.
    
- **CSV Template:** Provide a downloadable CSV template to ensure users properly format their data for bulk uploads.
	- adding users at various roles
	- adding flashcards
    
- **Public API:** A public API will be available for developers to fetch public flashcard sets and integrate the app into their own tools.
    
- **Rate Limiting:** Implement rate limiting on the public API, with a discussion to determine the threshold for requiring an API key to manage costs.
    

#### **2.2. Study & Learning Modes**

- **Study Sessions:** Default study sessions to a maximum of 20 cards, with an option for the user to change the card count.
    
- **Study Modes:**
    
    - **Easy:** User self-reports if they answered a card correctly or incorrectly.
        
    - **Medium:** App provides multiple-choice options (A, B, C, D), with a hint option to eliminate two incorrect choices. User hint usage is tracked for analytics.
        
    - **Hard:** User must type text or speak their response, and the AI determines if the answer is correct.
        
- **Practice Scenarios:** Users can practice by guessing side B from side A, or side A from side B, with separate analytics tracked for each scenario.
    
- **Versus Mode:** Allows users to compete against each other synchronously and asynchronously.
    
- **Spaced Repetition & ML:**
    
    - Uses ML to schedule flashcard reviews for optimal retention.
        
    - Schedules cards a user struggles with more often until they perform better.
        
    - ML can recommend when to study new sets based on user goals and past performance.
        
    - AI/ML can create new flashcard lists based on a user's past study activity.
        
    - AI/ML should work offline and on-device to conserve API key quota.
        

#### **2.3. User Experience & Onboarding**

- **Progressive Web App (PWA):** The app works offline and syncs data to the server when back online.
    
- **User Alerts:** Send alerts to users when the ML recommends studying old or new lists.
    
- **Guided Tours:** An automated tour for first-time users directs them to where they can find more advanced tours after completion. A discussion is needed to determine the number of tours required for a comprehensive onboarding experience.
    
- **Accessibility:** UI will be mobile-first and adaptable to screen size, meeting Web Content Accessibility Guidelines (WCAG).
    
- **Keyboard Shortcuts:** Implement keyboard shortcuts for study sessions and major features.
    
- **Progress Indicators:** Implement a clear progress indicator for study sessions.
    

#### **2.4. Community & Sharing**

- **Flashcard Sets:** Users can have private or public flashcard sets, with public sets shared with the community.
    
- **Sharing:** Users can share public flashcard sets via email, text, and social media (LinkedIn, Facebook, Blue Sky).
    
- **Leaderboards:** Leaderboards will track user performance on public sets, by category (AI-determined), and across all flashcards, ranking users by best average, most study time, and most attempts.
    

### **3. User Roles & Permissions**

The app will implement a clear hierarchy of user roles, with higher-level roles inheriting the privileges of those below them.

- **Admin (App Owner):** Full control over all features, settings, users, and roles.
    
- **Teammate:** A new role to assist the admin with managing the app and users. This role is for developers, marketing, and other contributors to the app's improvement. Teammates can receive income from acquiring paid users and are not required to pay for app usage.
    
- **Community Leader:** Can add Community Leaders, Teachers, Parents, and Students via invitation or CSV upload. Can see analytics of those they manage.
    
- **Teacher/Parent:** Can assign flashcard sets, see their students' analytics, and add Parents and Students by invitation or CSV upload.
    
- **Student:** Can create, share, and manage private/public flashcard sets. Must be a registered user.
    
- **Study Partner:** No login required. Can only access public flashcard sets or those shared with them. Can share public sets.
    

### **4. Monetization & Revenue**

- **Free vs. Paid Tiers:** Features will be separated into free and paid tiers. A discussion is needed to define which features belong to each tier.
    
- **Subscription Tiers:** Paid tiers will be offered for Community Leader, Teacher/Parent, and Student roles on a monthly and annual basis with a discount.
    
- **Lifetime Membership:** A $100 one-time fee for students to access a "lifelong learner" tier.
    
- **Payment Gateway:** Use Stripe for payment processing.
    
- **Revenue Sharing:** Admin can set prices for different tiers and allow Teammates to receive income from user acquisition.
    

### **5. Technical Architecture & Stack**

- **Frontend:** Next.js, with a mobile-first UI that adapts to screen size.
    
- **Backend:** Next.js, with MongoDB as the server database.
    
- **Authentication:** Email/password or email/passphrase authentication.
    
- **AI/ML:**
    
    - **On-Device:** Default to TensorFlow.js for on-device ML to reduce API key quota usage and costs.
        
    - **Online:** The online Gemini model will be available for paid users for more robust features like initial card generation.
        
- **Data Storage:** User profiles and flashcards will be saved on the server database, with offline data stored in IndexedDB_API and synced when the app is back online.
    
- **API:** Separate API endpoints will be created with permissions logic to handle different user roles (e.g., `api/teacher/:teacherId/students`).
    

### **6. Security & Logging**

- **Cybersecurity:** The app will be optimized for cybersecurity.
    
- **Logging:** Implement thorough and efficient logging with AI/ML to flag suspicious behavior and anomalies, bringing these events to the attention of the Admin. A discussion is needed to define which behaviors should be flagged for Community Leaders and Teachers/Parents.
    
- **Rate Limiting:** Implement API rate limiting with a defined threshold for requiring an API key.
    

### **7. Project Documentation**

To ensure the app is professional-grade and portfolio-worthy, the following documentation will be created:

- `CONTRIBUTING.md`
    
- `CODING_STYLE_GUIDE.md`
    
- `CODE_OF_CONDUCT.md`
    

### **8. Dashboards**

Each role will have a specific dashboard to manage their privileges and view analytics:

- **Admin/Teammate/Community Leader/Teacher/Parent:** Multiple dashboards will be provided for managing users, content, and privileges.
    
- **Study Dashboard:** Each user will have a study dashboard to manage study features and see their own analytics.
    
- **Analytics Dashboards:** Higher-level roles can see the analytics of those they manage (e.g., Teachers/Parents can see student analytics).