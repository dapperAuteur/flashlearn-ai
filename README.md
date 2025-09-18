# FlashLearn AI: Intelligent Flashcard Learning System

![FlashLearn AI Logo](https://via.placeholder.com/150x50?text=FlashLearn+AI)

## Project Overview

FlashLearn AI is an advanced flashcard application designed to enhance learning through AI-powered features and adaptive study techniques. Built with Next.js, TypeScript, and MongoDB, this application supports multiple learning modes, offline capabilities, and intelligent content extraction.

### Key Features

- **Multiple Study Modes**: Progress through increasingly difficult recall levels - from true/false to free text entry
- **AI-Generated Content**: Convert PDFs, websites, audio files, and YouTube videos into flashcards automatically
- **Spaced Repetition**: Smart scheduling system prioritizes cards you need to review most
- **Offline Support**: Study anywhere, even without internet connection
- **Team Collaboration**: Paid users can share flashcards and study with teammates in real-time
- **Custom Organization**: Tag, categorize, and organize flashcards for efficient study
- **Performance Analytics**: Track your progress with detailed statistics and reports

## Current Status

The project is currently in active development. Here's what's been completed:

- ✅ Project setup with Next.js App Router architecture  
- ✅ Authentication system (sign up, sign in)
- ✅ MongoDB integration
- ✅ Email verification with Mailgun
- ✅ Dashboard layout with responsive sidebar
- ✅ User profile management

### Next Features (Roadmap)

1. Flashcard CRUD operations and organization system
2. Basic study interface with multiple difficulty modes
3. Stripe subscription integration
4. AI-powered content extraction
5. Offline functionality
6. Team collaboration features
7. Real-time multiplayer study sessions

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- MongoDB database
- Mailgun account (for email verification)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dapperAuteur/flashlearn-ai.git
   cd flashlearn-ai

Set up Environment Variables:Create a file named .env.local in the root of the project and add the following variables. Do not commit this file to Git.# .env.local
# MongoDB
MONGODB_URI="your_mongodb_connection_string"
# Upstash Redis for Rate Limiting
# Get these from your Upstash Redis database dashboard
UPSTASH_REDIS_REST_URL="your_upstash_redis_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_token"
# NextAuth.js (for authentication)
# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
# Google Gemini API
GEMINI_API_KEY="your_gemini_api_key"
# Stripe
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"
# This is the price ID from your Stripe dashboard for the Lifetime Learner tier
STRIPE_LIFETIME_PRICE_ID="price_xxxxxxxxxxxxxx"
Run the development server:npm run dev
Open http://localhost:3000 with your browser to see the result.🤝 ContributingContributions are welcome! Please see CONTRIBUTING.md for guidelines on how to get started. Also, review our CODE_OF_CONDUCT.md and CODING_STYLE_GUIDE.md.
