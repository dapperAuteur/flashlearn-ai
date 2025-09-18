# Flashcard AI Pro - Coding Style Guide

## Introduction

A consistent coding style is crucial for maintaining the quality and readability of our codebase. This guide outlines the standards and best practices we follow. All contributions must adhere to this guide.

-----

## Tools

We use **ESLint** and **Prettier** to automate code formatting and catch common errors.

  * Before committing, please run `npm run lint` to check your code.
  * Configure your editor to "format on save" using Prettier for the best experience.

-----

## Naming Conventions

  * **Variables and Functions:** Use `camelCase`.
    ```javascript
    const userProfile = {};
    function getUserData() {}
    ```
  * **React Components:** Use `PascalCase`.
    ```javascript
    function ProfileCard() {}
    ```
  * **Files and Folders:**
      * React Components: `PascalCase.jsx` (e.g., `ProfileCard.jsx`)
      * All other JS/TS files: `kebab-case.js` (e.g., `stripe-helpers.js`)
      * Folders: `kebab-case` (e.g., `user-profile`)
  * **Constants:** Use `UPPER_SNAKE_CASE` for global or exported constants.
    ```javascript
    export const MAX_FLASHCARDS = 20;
    ```

-----

## React & Next.js

  * **Functional Components:** Always use functional components with Hooks. Class components are not permitted for new features.
  * **Folder Structure:** Organize components logically.
      * `/components/ui/`: For general-purpose, reusable UI elements (e.g., `Button.jsx`, `Input.jsx`, `Modal.jsx`).
      * `/components/layouts/`: For major layout components (e.g., `DashboardLayout.jsx`, `Sidebar.jsx`).
      * `/components/[feature]/`: For complex components related to a specific feature (e.g., `/components/study-session/`).
  * **State Management:**
      * For local component state, use the `useState` hook.
      * For complex local state or state transitions, use the `useReducer` hook.
      * For sharing state between a few nested components, prefer component composition or the `useContext` hook over prop-drilling.

-----

## Styling (Tailwind CSS)

  * **Utility-First:** Embrace the utility-first approach. Apply utility classes directly in your JSX.
  * **Class Order:** Keep your class strings organized and readable. We recommend using the official [Prettier Plugin for Tailwind CSS](https://github.com/tailwindlabs/prettier-plugin-tailwindcss), which automatically sorts classes according to a logical convention.
  * **Conditional Classes:** Use a library like `clsx` or `classnames` to conditionally apply classes.
    ```javascript
    import clsx from 'clsx';

    const MyButton = ({ isPrimary, isDisabled }) => {
      const buttonClasses = clsx(
        'px-4 py-2 rounded font-bold',
        { 'bg-blue-500 text-white': isPrimary },
        { 'bg-gray-200 text-gray-500': !isPrimary },
        { 'opacity-50 cursor-not-allowed': isDisabled }
      );
      return <button className={buttonClasses}>Click Me</button>;
    };
    ```

-----

## Commit Messages

We follow the **Conventional Commits** specification. This helps create a clear and browsable Git history.

### Format

```
<type>(<scope>): <subject>
```

### Type

Must be one of the following:

  * **feat**: A new feature
  * **fix**: A bug fix
  * **docs**: Documentation only changes
  * **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
  * **refactor**: A code change that neither fixes a bug nor adds a feature
  * **perf**: A code change that improves performance
  * **test**: Adding missing tests or correcting existing tests
  * **build**: Changes that affect the build system or external dependencies
  * **ci**: Changes to our CI configuration files and scripts
  * **chore**: Other changes that don't modify `src` or `test` files

### Examples

```
feat(auth): implement password reset functionality
fix(ui): resolve button alignment issue on safari
docs(readme): update environment variable instructions
refactor(api): simplify user data fetching logic
```