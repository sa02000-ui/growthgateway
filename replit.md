# Personality & Growth Portal

## Overview
A web application that helps users bridge the gap between self-perception, desired perception, and how others see them. Built with a "Linear-style" minimalist aesthetic.

## Tech Stack
- **Frontend**: React + Vite, Shadcn UI, Tailwind CSS
- **Backend**: Node.js (Express)
- **Database**: External Supabase (PostgreSQL + Auth) + Replit PostgreSQL (user profiles, life events)
- **Charts**: Recharts for radar charts

## Project Structure
```
client/src/
├── components/
│   ├── dashboard/       # Dashboard tab components
│   │   ├── home-tab.tsx           # Perspective Alignment radar chart
│   │   ├── assessments-tab.tsx    # My Assessments page
│   │   ├── peer-feedback-tab.tsx  # Peer Feedback page
│   │   ├── profile-tab.tsx        # My Profile page (demographics + life events)
│   │   └── family-teams-tab.tsx   # Family & Teams page
│   └── ui/              # Shadcn UI components
├── lib/
│   ├── supabase.ts      # Supabase client initialization
│   ├── auth-context.tsx # Auth context provider
│   ├── queryClient.ts   # TanStack Query client
│   └── utils.ts         # Utility functions
├── pages/
│   ├── landing.tsx      # Landing page with hero
│   ├── auth.tsx         # Authentication page
│   ├── dashboard.tsx    # Dashboard with sidebar
│   └── not-found.tsx    # 404 page
└── App.tsx              # Main app with routing

server/
├── db.ts                # Supabase server-side client
├── routes.ts            # API routes
├── index.ts             # Express server entry
├── storage.ts           # Storage interface
├── ai-insights.ts       # AI-powered growth insights using OpenAI
├── feedback-tokens.ts   # Secure token generation for feedback URLs
├── profile-routes.ts    # Profile CRUD (Replit PostgreSQL)
└── replit_integrations/ # AI integration utilities
```

## Key Features
1. **Landing Page**: Hero section with value proposition
2. **Authentication**: Email/Password + Google OAuth via Supabase Auth UI
3. **Dashboard**: Multi-tab layout with sidebar navigation
4. **Perspective Alignment Chart**: Radar chart with two distinct layers (solid Self, dashed Peers)
5. **IPIP-NEO-120 Assessment**: Complete 120-question personality assessment with:
   - Paginated question display (10 per page)
   - Positive/negative keyed scoring
   - Big Five trait calculation (OCEAN)
   - Results visualization with trait interpretations
   - Assessment history tracking
   - Profile confirmation dialog before starting assessments
6. **My Profile**: Demographic tracking (marital status, cultural background, profession, education, income, parental context)
7. **Life Events Log**: Track major life events (new job, relocation, marriage, divorce, etc.)
8. **Privacy Protection**: "Threshold of 3" rule - peer feedback names hidden until 3+ responses received
9. **AI-Powered Growth Insights**: Personalized 3-sentence growth recommendations from AI (Senior I-O Psychologist persona)
10. **Secure Feedback Tokens**: Privacy-preserving URL tokens (e.g., /feedback/ax79-k2-rt) instead of raw user IDs
11. **Explore Tab**: Categorized test library with scientific validation badges (Core Personality, Behavioral & Social, Cognitive & Productivity, Well-being & Resilience)
12. **Share Assessment Results**: Share assessment results with others via unique time-limited links (7-day expiration)

## Shared Modules
- `shared/ipip-neo-120.ts` - All 120 questions with trait assignments and +/- keying
- `shared/scoring.ts` - Scoring logic for calculating Big Five trait percentages
- `shared/scoring-engine.ts` - Unified scoring engine with 5 algorithms (average, summation, complex_centering, binary_correct, multi_category)
- `shared/assessments/category-one-seed.ts` - Seed data for Category 1: IPIP-NEO-120, PVQ-21, SD3
- `shared/assessments/category-two-seed.ts` - Seed data for Category 2: ICAR-16, Grit-S
- `shared/assessments/category-three-seed.ts` - Seed data for Category 3: RIASEC-30, TEIQue-SF-30
- `shared/assessments/category-four-seed.ts` - Seed data for Category 4: PSS-10, SWLS-5, BRS-6, Flourishing-8
- `shared/models/chat.ts` - Chat/conversation schema (for AI integrations)

## Environment Variables
Required secrets in Replit Secrets:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon/public key

## Design Theme
- **Primary**: Sage Green (#4f7942 / hsl 93 28% 36%)
- **Background**: Warm Cream (#fdfbf7)
- **Foreground**: Charcoal (#2d2a26)
- **Font**: Inter
- **Style**: Clean Growth aesthetic with earth tones, generous whitespace

## Running the App
The app runs on port 5000 via the "Start application" workflow:
```bash
npm run dev
```

## API Endpoints
- `GET /api/config` - Returns Supabase configuration for frontend
- `GET /api/health` - Health check endpoint
- `GET /api/assessment/questions` - Returns all 120 IPIP-NEO questions
- `POST /api/assessment/submit` - Submit responses and get trait scores
- `GET /api/assessment/results/:userId` - Get user's assessment history
- `GET /api/assessment/result/:resultId` - Get single assessment result
- `GET /api/peer-feedback/questions` - Returns 30 peer feedback questions (public)
- `GET /api/peer-feedback/user/:userId` - Check if user exists (public, no PII)
- `POST /api/peer-feedback/:userId` - Submit peer feedback (public)
- `GET /api/peer-feedback/:userId` - Get all peer feedback with averages (authenticated)
- `GET /api/ai-insights/:userId` - Get AI-powered personalized growth insights
- `GET /api/my-feedback-token/:userId` - Get or create secure feedback token
- `GET /api/feedback-token/:token` - Resolve token to user ID (public, case-insensitive)
- `GET /api/assessments-library` - Returns all assessments from database grouped by category
- `POST /api/assessments-library/seed` - Seeds database with 16 research-grade assessments
- `POST /api/send-invite` - Send feedback invitation email (mock in dev)
- `POST /api/share-result` - Generate shareable link token for assessment results
- `GET /api/shared-result/:token` - Retrieve shared assessment results (public)
- `GET /api/profile/:userId` - Get user profile and life events (Replit PostgreSQL)
- `POST /api/profile/:userId` - Save/update user profile and life events (Replit PostgreSQL)
- `DELETE /api/profile/:userId/event` - Delete a life event
- `DELETE /api/user/me` - Delete user account and all associated data (authenticated)

## Database Tables
- `assessments_library` - Stores assessment metadata (category, name, slug, scoring_algorithm, scoring_type, input_type, trait_config, question_count, estimated_time, is_active)
- `assessment_questions` - Stores individual questions (assessment_slug, question_number, text, trait_key, facet_key, sub_category, reverse_coded, input_type, correct_option, options)
- `feedback_tokens` - Maps secure URL tokens to user IDs for privacy-preserving feedback URLs

## Scoring Algorithms
- **average**: Calculates mean score per trait (IPIP-NEO-120, Grit-S)
- **summation**: Sums raw Likert values per trait (Dark Triad SD3)
- **complex_centering**: Schwartz ipsative centering (PVQ-21)
- **binary_correct**: Counts correct answers for IQ-style tests (ICAR-16)
- **multi_category**: Scores across multiple independent categories (RIASEC, TEIQue-SF)

## Recent Changes
- 2025-01-02: Phase 14 Identity & Privacy Layer complete
  - Added Forgot Password flow (/forgot-password page with Supabase resetPasswordForEmail)
  - Added Delete Account feature in Profile (Danger Zone with confirmation dialog)
  - DELETE /api/user/me endpoint removes all user data from database tables
  - Mobile-responsive login/signup forms
- 2024-12-22: Completed Phase 11 Category 4 well-being assessments (PSS-10, SWLS-5, BRS-6, Flourishing-8) with reverse coding
- 2024-12-22: Added 3 new visualizations: StressGauge (PSS-10), Scorecard (SWLS/FS), Battery indicator (BRS)
- 2024-12-22: Enhanced scoring engine with likert_0_4 scale support for 0-4 Likert responses
- 2024-12-22: Added Share Assessment feature with copy link and email sharing options, public shared results page at /shared/:token
- 2024-12-22: Created ResultsRenderer visualization component with 8 chart types (Bar, Radar, Hexagon, Gauge, DangerMeter, StressGauge, Scorecard, Battery)
- 2024-12-22: Built unified scoring-engine.ts supporting 5 scoring algorithms
- 2024-12-22: Added content injection for Category 3 assessments (RIASEC-30, TEIQue-SF-30)
- 2024-12-22: Added content injection for Category 2 assessments (ICAR-16 cognitive, Grit-S scale)
- 2024-12-22: Enhanced schema with correct_option, sub_category, scoring_type fields for complex assessments
- 2024-12-22: Integrated Explore Assessments with database-driven assessments_library table (16 research-grade assessments across 4 categories)
- 2024-12-22: Added mock email service for peer feedback invitations with POST /api/send-invite endpoint
- 2024-12-22: Fixed feedback token verification bug with case-insensitive token lookup
- 2024-12-21: Enhanced Family & Teams tab with interactive group creation, member management, and privacy settings
- 2024-12-21: Added scientific tooltips for Cronbach's Alpha and Validity scores on assessment cards
- 2024-12-21: Implemented Peer Invitation system with multi-email input and customizable message template
- 2024-12-21: Enhanced Profile with SOC occupation categories, Field of Study, and Geography tracking (country of birth, current country, total regions lived)
- 2024-12-21: Added Life Events Log with event type dropdown, year input, and significance slider (1-10 scale)
- 2024-12-21: Made navigation logo/profile clickable (conditional routing based on auth state)
- 2024-12-21: Added AI-powered growth insights using OpenAI gpt-4o-mini with Senior I-O Psychologist persona
- 2024-12-21: Implemented secure feedback token system (privacy-preserving URLs with xxxx-xx-xx format)
- 2024-12-21: Created Explore tab with categorized test library and scientific validation badges
- 2024-12-21: Added AI Insight Card to dashboard home showing personalized growth recommendations
- 2024-12-21: Added profile confirmation dialog before assessments (must confirm profile is current)
- 2024-12-21: Created comprehensive Profile page with demographic tracking and Life Events Log
- 2024-12-21: Implemented "Threshold of 3" privacy rule for peer feedback (names hidden until 3+ responses)
- 2024-12-21: Updated terminology from "Gap" to "Perspective Alignment" throughout the app
- 2024-12-21: Enhanced Radar Chart with two visual layers (solid Self, dashed Peers) and interpretive legend
- 2024-12-21: Added auto-scroll to top on assessment page navigation
- 2024-12-21: Updated Landing Page with "Longitudinal Tracking" and "Network Perspective" messaging
- 2024-12-20: Added Peer Feedback Engine - public /feedback/:userId route, 30-question test, anonymity option
- 2024-12-20: Updated Radar Chart to show self vs peer perception gap with two shapes
- 2024-12-20: Fixed Sign Out button and added error handling to assessment submission
- 2024-12-20: UI polish - Sage Green theme, Footer with Terms page, improved sidebar
- 2024-12-20: Added Timeline View with Line Chart and Growth Comparison feature
- 2024-12-20: Added IPIP-NEO-120 personality assessment with scoring engine and results storage
- 2024-12-20: Initial MVP with landing, auth, and dashboard pages
