# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs on port 9003 with Turbopack)
- `npm run build` - Build production application (uses increased memory allocation)
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run db:seed` - Seed database with recipes using tsx

### AI Development
- `npm run genkit:watch` - Start Genkit development server with watch mode for AI flows

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **AI/GenAI**: Google Genkit with Gemini models for meal planning and coaching
- **Database**: Firebase Firestore + local Dexie (IndexedDB) for offline-first architecture
- **Auth**: Firebase Authentication
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context with optimized providers
- **PWA**: Service worker with offline capabilities

### Key Architecture Patterns

#### Dual Storage Strategy
The app uses a hybrid storage approach:
- **Firebase Firestore**: Server-side persistence and cross-device sync
- **Dexie (IndexedDB)**: Local-first storage for offline capabilities
- Data flows through optimized context providers that handle sync between both stores

#### AI Integration (Genkit)
- AI flows located in `src/ai/flows/` directory
- Main AI instance configured in `src/ai/genkit.ts`
- Genkit prompts stored in `prompts/` directory as `.prompt` files
- API routes in `src/app/api/` handle AI request routing

#### Context Architecture
- `OptimizedAppContext`: Main app state with performance optimizations
- `AuthContext`: Firebase Authentication state
- `AppContext`: Legacy context (being phased out)
- Providers wrapped in `src/context/OptimizedProviders.tsx`

#### File Organization
- `src/app/`: Next.js App Router pages and layouts
- `src/components/`: Reusable React components (organized by feature)
- `src/lib/`: Utility libraries and Firebase configuration
- `src/hooks/`: Custom React hooks
- `src/types/`: TypeScript type definitions
- `src/features/`: Feature-specific components and logic

### Important Configuration Notes

#### Firebase Setup
- Multiple Firebase config files: `firebase-client.ts`, `firebase-optimized.ts`
- Legacy `firebase.ts` maintained for backward compatibility
- Firebase emulators configured for local development (ports: Auth 9099, Firestore 8080, UI 4000)

#### Build Configuration
- TypeScript and ESLint errors ignored during builds (configured in `next.config.ts`)
- Custom webpack configuration for handling Genkit server-side modules
- Handlebars and prompt file loaders configured

#### Environment Variables Required
- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY` for Genkit AI features
- Firebase configuration variables

### Development Workflow
1. Use Firebase emulators for local development
2. AI features require valid Gemini API key
3. App designed as PWA - test offline functionality
4. All new components should follow shadcn/ui patterns
5. Use the established context patterns for state management
6. Follow TypeScript strict mode conventions

### Testing Strategy
The codebase doesn't include explicit test frameworks. When adding tests:
- Check existing patterns before choosing testing tools
- Consider the dual storage architecture when testing data flows
- Test both online and offline scenarios for PWA functionality