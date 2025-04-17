# FlashLearn AI: Intelligent Flashcard Learning System

## Project Overview

FlashLearn AI is an advanced flashcard application designed to enhance learning through AI-powered features and adaptive study techniques. Built with Next.js, TypeScript, and MongoDB, this application supports multiple learning modes, offline capabilities, and intelligent content extraction.

## Current Status

The project is currently in Phase 1: Project Foundation and Authentication. We have completed:

- ✅ Next.js project setup with App Router
- ✅ TypeScript configuration
- ✅ Tailwind CSS integration
- ✅ MongoDB connection setup
- ✅ Auth.js (NextAuth) configuration
- ✅ User registration API

## Next Steps

We will continue implementing Phase 1 with:
- Authentication UI components
- Sign-in and sign-up forms
- Protected routes
- Dashboard layout

## Technology Stack

- **Frontend**: Next.js with TypeScript and App Router, Tailwind CSS
- **Backend**: MongoDB, Next.js API routes, Auth.js for authentication
- **Future Integrations**: Stripe for payments, AI services for content extraction

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- MongoDB database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env.local` file with the required environment variables
4. Run the development server with `npm run dev`

## Testing API Endpoints

Test the registration API:
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'