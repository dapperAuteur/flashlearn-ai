# **Admin Dashboard Implementation Plan**

## **1. Introduction**

This document outlines the phased implementation plan for the Flashcard AI Pro Admin Dashboard. The goal is to create a comprehensive internal tool for application monitoring, user and content management, and dynamic configuration. This will empower the admin to make data-driven decisions, manage the platform effectively, and respond to issues without requiring new code deployments.

The plan is structured based on the following priority list:

1. **Logs & Monitoring**

2. **Analytics & Usage**

3. **Flashcard Set Management**

4. **User Management**

5. **Dynamic App Configuration**


## **Phase 0: Foundational Setup & Data Migration**

This preliminary phase is crucial for establishing the secure foundation of the admin dashboard and preparing the data structures for the upcoming features.


### **Task 1: Secure Admin Section**

- **Goal:** Protect all admin-related pages and API endpoints.

- **Action:**

* Create a middleware file (/middleware.ts) that checks for a valid user session.

* If the session exists and the user.role is 'Admin', allow access to any route under /admin/\*\*.

* If the user is not an admin, redirect them to the main application homepage.

* Apply this same logic to protect all new API endpoints under /api/admin/\*\*.


### **Task 2: Create Admin Layout**

- **Goal:** Build the main reusable layout for all admin pages.

- **Action:**

* Create a new layout file at /app/admin/layout.tsx.

* This layout will include a persistent sidebar for navigation between the different admin sections (Dashboard, Logs, Users, etc.) and a main content area where the specific pages will be rendered.


### **Task 3: Unify Flashcard Set Collections**

- **Goal:** Consolidate shared\_flashcard\_sets and flashcard\_sets into a single flashcard\_sets collection to simplify management.

- **Action:**

* **Create a one-time migration script.** This script will:

1. Read all documents from the shared\_flashcard\_sets collection.

2. For each document, add a new field: isPublic: true.

3. Insert the modified document into the flashcard\_sets collection.

4. Handle any potential duplicates based on the topic or another unique identifier.

- **Refactor all application code.** Update all API routes and frontend components that currently reference shared\_flashcard\_sets to point exclusively to flashcard\_sets and utilize the new isPublic flag where necessary.


### **Task 4: Create Dynamic Configuration Model**

- **Goal:** Move hardcoded constants to the database so they can be managed from the dashboard.

- **Action:**

* Create a new Mongoose schema and model for AppConfig. This collection will store key-value pairs.

* Create initial documents in this collection for RATE\_LIMITS and FLASHCARD\_MAX. The RATE\_LIMITS document could store an object like { "Free": 1, "Lifetime Learner": 2 }.

* Refactor the rateLimitGemini.ts file and any other relevant code to fetch these values from the database at application startup. Implement a simple in-memory cache to avoid querying the database on every request.


## **Phase 1: Log Viewer**

**Goal:** Provide a searchable interface to view all system and authentication logs.

- **Backend (/api/admin/logs):**

* Create a new API endpoint that queries the system\_logs and auth\_logs collections.

* Implement query parameters for filtering by:

- logLevel (e.g., 'ERROR', 'INFO')

- context (e.g., 'AI', 'AUTH')

- userId

- dateRange (start and end dates)

* Add support for pagination to handle large volumes of logs.

- **Frontend (/admin/logs):**

* Build a new page with a filter section containing dropdowns, text inputs, and date pickers.

* Display the logs in a clear, tabular format with columns for Timestamp, Level, Context, Message, and User ID.

* Implement a "View Details" action for each log row that opens a modal displaying the full metadata object.

* Add pagination controls at the bottom of the table.


## **Phase 2: Analytics Dashboard**

**Goal:** Visualize key metrics about app usage and user engagement.

- **Backend (/api/admin/analytics):**

* Create several endpoints that use MongoDB aggregation pipelines to compute stats efficiently.

* **User Analytics:** Endpoint to return data on total users, new sign-ups over time, and distribution by role and subscription tier.

* **Usage Analytics:** Endpoint to return data on study sessions completed, flashcard sets created, and AI generations used over time.

* **Content Analytics:** Endpoint to return lists of the most studied and highest-rated flashcard sets.

- **Frontend (/admin/dashboard):**

* Create the main dashboard page.

* Use "Stat Cards" at the top to display key metrics (e.g., "Total Users," "Active Users Today").

* Use a charting library (like Chart.js) to create visual graphs for:

- "New Users per Week"

- "Study Sessions per Day"

* Include tables to display "Top 5 Most Studied Sets" and "Top 5 Most Active Users."


## **Phase 3: User Management**

**Goal:** Enable full control over user accounts.

- **Backend (/api/admin/users):**

* GET /api/admin/users: An endpoint to fetch a paginated list of all users, with search functionality by email.

* PUT /api/admin/users/\[id]/role: An endpoint to update a user's role.

* POST /api/admin/users/\[id]/reset-password: An endpoint that triggers a password reset email to the user.

* PUT /api/admin/users/\[id]/status: An endpoint to toggle a user's active/suspended status.

- **Frontend (/admin/users):**

* Create a user management page with a searchable table of all users.

* Columns should include User ID, Email, Role, Subscription Tier, and Status.

* Each row will have action buttons/menus to:

- Change Role (via a dropdown).

- Send Password Reset.

- Suspend/Unsuspend Account (via a toggle switch).


## **Phase 4: App Configuration Management**

**Goal:** Allow dynamic updates to application constants and rate limits from the UI.

- **Backend (/api/admin/configs):**

* GET /api/admin/configs: An endpoint to fetch all documents from the AppConfig collection.

* PUT /api/admin/configs: An endpoint to update the values in the AppConfig collection. This endpoint's logic must also clear the server's in-memory cache for these settings to ensure changes are applied immediately.

- **Frontend (/admin/settings):**

* Create a new "Settings" or "Configuration" page.

* Build a form that is dynamically generated based on the configs fetched from the API.

* For RATE\_LIMITS, this would be a set of number inputs for each tier.

* For FLASHCARD\_MAX, this would be a single number input.

* Include a "Save Changes" button that submits the form and displays a confirmation message on success.
