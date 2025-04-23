# FlashLearn AI - Coding Style Guide & Standards

## 1. Introduction

This document outlines the coding standards and style guidelines for the FlashLearn AI project. Adhering to these standards ensures code consistency, readability, maintainability, and collaboration efficiency. All contributors are expected to follow these guidelines.

This is a living document and may be updated as the project evolves. Suggestions for improvements are welcome via Pull Requests.

## 2. General Principles

*   **Readability:** Write code that is easy for other developers (and your future self) to understand. Prioritize clarity over cleverness.
*   **Consistency:** Follow the established patterns and conventions within the codebase.
*   **Simplicity (KISS - Keep It Simple, Stupid):** Avoid unnecessary complexity. Find the simplest solution that works effectively.
*   **DRY (Don't Repeat Yourself):** Abstract reusable logic and components to avoid duplication.
*   **Predictability:** Code should behave as expected. Avoid surprising side effects.

## 3. Code Formatting

*   **Tooling:** We use **Prettier** for automatic code formatting and **ESLint** for code linting.
    *   Ensure you have the recommended VS Code extensions installed (`dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`).
    *   Configure your editor to format on save using Prettier.
*   **Configuration:** Adhere to the settings defined in `.prettierrc` and `.eslintrc.js` (or similar config files). Key rules generally include:
    *   Indentation: 2 spaces.
    *   Quotes: Single quotes (`'`) for strings, unless template literals are needed.
    *   Semicolons: Yes.
    *   Trailing Commas: Yes (`es5` or `all`).
    *   Line Length: Aim for a maximum of 100-120 characters, but prioritize readability over strict adherence if breaking lines harms clarity.

## 4. Naming Conventions

*   **Variables & Functions:** Use `camelCase`.
    *   Example: `const userProfile = ...;`, `function calculateScore() { ... }`
*   **Components (React/JSX):** Use `PascalCase`.
    *   Example: `function UserAvatar() { ... }`, `<UserProfileCard />`
*   **Types & Interfaces:** Use `PascalCase`.
    *   Example: `interface UserSettings { ... }`, `type AuthStatus = ...;`
*   **Constants:** Use `UPPER_SNAKE_CASE` for true constants (values that never change and are widely used).
    *   Example: `const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;`
*   **Files & Directories:**
    *   Components: `PascalCase.tsx` (e.g., `UserProfileCard.tsx`).
    *   Pages/Layouts/Routes (Next.js App Router): `kebab-case.tsx` or specific names like `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`.
    *   Utility/Helper files: `camelCase.ts` or `kebab-case.ts` (e.g., `dateUtils.ts`, `api-helpers.ts`).
    *   Configuration files: Use standard names (e.g., `tailwind.config.js`, `next.config.mjs`).
*   **Boolean Variables:** Prefix with `is`, `has`, `should`, `can`.
    *   Example: `const isLoggedIn = ...;`, `const hasPermission = ...;`
*   **Event Handlers:** Prefix with `handle`.
    *   Example: `const handleClick = () => { ... };`, `onChange={handleInputChange}`

## 5. TypeScript Usage

*   **Strong Typing:** Leverage TypeScript's static typing. Avoid using `any` whenever possible. Use `unknown` for values where the type is truly unknown and perform type checks.
*   **Interfaces vs. Types:**
    *   Use `interface` for defining the shape of objects or classes.
    *   Use `type` for defining unions, intersections, primitive aliases, mapped types, or conditional types.
*   **Explicit Types:**
    *   Add explicit types for function parameters and return values, especially for exported functions/methods.
    *   Let TypeScript infer types for local variables where the assignment makes the type obvious.
*   **Utility Types:** Use built-in utility types like `Partial`, `Required`, `Readonly`, `Pick`, `Omit` where appropriate.
*   **Non-null Assertion (`!`):** Avoid using the non-null assertion operator (`!`) unless you are absolutely certain the value cannot be `null` or `undefined` and TypeScript cannot infer it. Prefer explicit checks or optional chaining (`?.`).

## 6. React & Component Structure

*   **Functional Components:** Use functional components with Hooks. Avoid class components unless necessary for specific legacy reasons or error boundaries (though functional alternatives exist).
*   **Component Size:** Keep components small and focused on a single responsibility (SRP). Decompose large components into smaller, reusable ones.
*   **Props:**
    *   Define prop types using TypeScript interfaces (e.g., `interface MyComponentProps { ... }`).
    *   Use destructuring for props in the function signature.
    *   Avoid overly complex prop objects; pass only necessary data.
*   **Hooks:** Follow the Rules of Hooks (call them at the top level, only from React functions). Use custom hooks (`useSomething`) to encapsulate reusable stateful logic.
*   **File Structure:** Organize components logically within the `src/components` (or similar) directory. Consider subdirectories like `ui` (generic UI elements), `features` (feature-specific components), `layouts`.
*   **Composition:** Use the `children` prop for component composition where appropriate.

## 7. Next.js (App Router)

*   **Directory Structure:** Follow the App Router conventions (`app/`, `page.tsx`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `route.ts`).
*   **Server vs. Client Components:**
    *   Default to Server Components for better performance and security.
    *   Use the `'use client'` directive only when necessary (for interactivity, lifecycle effects, browser APIs, state/hooks). Keep Client Components as small as possible ("leaf" components).
    *   Pass data from Server Components to Client Components via props.
*   **API Routes (Route Handlers):**
    *   Place API logic in `app/api/.../route.ts` files.
    *   Use standard HTTP methods (exported functions like `GET`, `POST`, `PUT`, `DELETE`).
    *   Validate request data rigorously.
    *   Return meaningful responses using `NextResponse.json()`.
    *   Handle errors gracefully and return appropriate status codes.
*   **Data Fetching:** Use `fetch` in Server Components (Next.js extends it). Use libraries like SWR or React Query in Client Components if client-side fetching or caching is needed.
*   **Optimizations:** Leverage built-in Next.js components like `<Image>`, `<Link>`, and font optimization (`next/font`).

## 8. Tailwind CSS

*   **Utility-First:** Embrace the utility-first approach. Apply styles directly in the JSX using Tailwind classes.
*   **Avoid Premature Abstraction:** Don't create custom CSS classes or use `@apply` unless there's a clear need for a reusable component pattern that cannot be easily achieved with component composition and props.
*   **Configuration:** Customize the theme (`colors`, `spacing`, `fontFamily`, etc.) in `tailwind.config.js` rather than overriding utilities with custom CSS.
*   **Readability:** Keep class lists organized. Consider using Tailwind Prettier plugins to automatically sort classes.
*   **Conditional Classes:** Use libraries like `clsx` or `classnames` for conditionally applying classes cleanly.

## 9. State Management

*   **Local State:** Use `useState` and `useReducer` for component-local state.
*   **Shared State:** Use React Context API for sharing state between nested components when prop drilling becomes excessive.
*   **Global State:** If complex global state is required across different parts of the application, consider libraries like Zustand or Jotai. Avoid introducing complex state management libraries prematurely.

## 10. Error Handling

*   **Use `try...catch`:** Wrap asynchronous operations (API calls, database interactions) in `try...catch` blocks.
*   **Meaningful Errors:** Provide informative error messages for debugging and user feedback.
*   **Error Boundaries:** Use Next.js `error.tsx` files to handle runtime errors within specific route segments and provide fallback UI.
*   **API Error Responses:** Ensure API routes return consistent error formats (e.g., `{ "error": "message" }`) with appropriate HTTP status codes.

## 11. Testing

*   **Unit Tests:** Write unit tests for utility functions, complex logic, and potentially individual components using Jest and React Testing Library.
*   **Integration Tests:** Test interactions between components and modules.
*   **End-to-End (E2E) Tests:** Use frameworks like Playwright or Cypress to test critical user flows from the user's perspective.
*   **Coverage:** Aim for reasonable test coverage, focusing on critical paths and business logic.

## 12. Git Workflow

*   **Branching:** Use feature branches based off the main development branch (e.g., `main` or `develop`). Name branches descriptively (e.g., `feat/user-authentication`, `fix/login-bug`).
*   **Commits:** Write clear, concise, and descriptive commit messages. Consider using the Conventional Commits specification.
*   **Pull Requests (PRs):**
    *   Create PRs for all code changes targeting the main development branch.
    *   Provide a clear description of the changes in the PR.
    *   Ensure code is reviewed by at least one other team member before merging.
    *   Ensure all automated checks (linting, tests, builds) pass.
*   **Merging:** Use squash merges or rebase merges to keep the main branch history clean (discuss team preference).

## 13. Documentation

*   **Code Comments:** Use JSDoc comments (`/** ... */`) for functions, interfaces, types, and complex logic blocks. Explain *why* something is done, not just *what* it does (if the code isn't self-explanatory).
*   **README:** Keep the main `README.md` updated with project setup, running instructions, and overview.
*   **Architecture Decisions:** Document significant architectural choices in a designated `docs` folder or similar.

## 14. Security

*   **API Keys & Secrets:** **Never** commit API keys, database credentials, or other secrets directly into the codebase. Use environment variables (`.env.local`) accessed via `process.env`. Ensure `.env.local` is in `.gitignore`. Access secrets *only* on the server-side (Server Components, API Routes).
*   **Input Validation:** Validate and sanitize all user input on both the client-side (for UX) and server-side (for security).
*   **Authentication/Authorization:** Use Auth.js (NextAuth) correctly. Protect sensitive routes and API endpoints. Ensure proper session management.
*   **Dependencies:** Keep dependencies updated to patch security vulnerabilities. Use tools like `npm audit` or Dependabot.
*   **XSS/CSRF:** Be mindful of Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF). Next.js and React provide some protection, but understand the risks (e.g., using `dangerouslySetInnerHTML`).

---

By following these guidelines, we can build a high-quality, maintainable, and scalable application together.
