# Gemini Flashcard Maker

## Overview

This web application allows users to instantly generate interactive, flippable flashcards for any topic using the Google Gemini API. Enter a subject, concept, or even a list of term/definition pairs, and the app will leverage AI to create study cards.

## Features

*   **AI-Powered Generation:** Uses the Google Gemini API (`gemini-2.0-flash-exp` model) to create flashcard content based on user input.
*   **Flexible Input:** Accepts general topics (e.g., "Ancient Rome") or specific "Term: Definition" pairs provided by the user.
*   **Interactive Flashcards:** Displays generated content as flippable cards (term on the front, definition on the back).
*   **Simple Interface:** Easy-to-use web interface built with HTML, CSS, and TypeScript.
*   **Dynamic Display:** Fetches data from the API and dynamically renders the flashcards on the page.
*   **Visual Feedback:** Includes loading states and error messages.
*   **Modern Styling:** Features a clean design with light/dark mode support based on system preferences.

## How it Works

1.  The user enters a topic or term/definition pairs into the text area.
2.  Clicking "Generate Flashcards" triggers a request to the Google Gemini API.
3.  A prompt is constructed asking the Gemini model to generate flashcards in a "Term: Definition" format based on the user's input.
4.  The application receives the response, parses the text to extract terms and definitions.
5.  Interactive HTML flashcard elements are created dynamically and displayed in the container.
6.  Users can click on any flashcard to flip it and reveal the definition.

## Technology Stack

*   **Frontend:** HTML, CSS, TypeScript
*   **AI:** Google Gemini API (via `@google/genai` SDK)
*   **Build Tool:** Vite
*   **Styling:** Custom CSS with CSS Variables for theming.

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Set the `API_KEY` in .env.local to your Gemini API key. You can obtain one from Google AI Studio.
    ```.env.local
    API_KEY=YOUR_API_KEY_HERE
    ```
3.  Run the app:
    ```bash
    npm run dev
    ```
4.  Open your browser to the local address provided by Vite (usually `http://localhost:5173`).
