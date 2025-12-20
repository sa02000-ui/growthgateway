# Personality & Growth Portal

## Overview
A web application that helps users bridge the gap between self-perception, desired perception, and how others see them. Built with a "Linear-style" minimalist aesthetic.

## Tech Stack
- **Frontend**: React + Vite, Shadcn UI, Tailwind CSS
- **Backend**: Node.js (Express)
- **Database**: External Supabase (PostgreSQL + Auth)
- **Charts**: Recharts for radar charts

## Project Structure
```
client/src/
├── components/
│   ├── dashboard/       # Dashboard tab components
│   │   ├── home-tab.tsx           # Perception Gap radar chart
│   │   ├── assessments-tab.tsx    # My Assessments page
│   │   ├── peer-feedback-tab.tsx  # Peer Feedback page
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
└── storage.ts           # Storage interface
```

## Key Features
1. **Landing Page**: Hero section with value proposition
2. **Authentication**: Email/Password + Google OAuth via Supabase Auth UI
3. **Dashboard**: Multi-tab layout with sidebar navigation
4. **Perception Gap Chart**: Radar chart showing 4 overlapping datasets
5. **IPIP-NEO-120 Assessment**: Complete 120-question personality assessment with:
   - Paginated question display (10 per page)
   - Positive/negative keyed scoring
   - Big Five trait calculation (OCEAN)
   - Results visualization with trait interpretations
   - Assessment history tracking

## Shared Modules
- `shared/ipip-neo-120.ts` - All 120 questions with trait assignments and +/- keying
- `shared/scoring.ts` - Scoring logic for calculating Big Five trait percentages

## Environment Variables
Required secrets in Replit Secrets:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon/public key

## Design Theme
- **Primary**: Navy Blue (#0f172a)
- **Secondary**: Cream/White (#fefefe)
- **Font**: Inter
- **Style**: Linear-style minimalism with crisp borders and generous whitespace

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

## Recent Changes
- 2024-12-20: Added IPIP-NEO-120 personality assessment with scoring engine and results storage
- 2024-12-20: Initial MVP with landing, auth, and dashboard pages
