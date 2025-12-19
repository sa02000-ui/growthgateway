# Design Guidelines: Personality & Growth Portal

## Design Approach
**Linear-Style Minimalism** - Clean, professional interface with generous whitespace, crisp borders, and focus on clarity over decoration.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Hierarchy**:
  - Hero Heading: text-5xl md:text-6xl, font-bold, tracking-tight
  - Section Headings: text-3xl md:text-4xl, font-semibold
  - Body Text: text-base md:text-lg, font-normal
  - UI Labels: text-sm, font-medium

### Color Palette
- **Primary**: Navy Blue (#0f172a) - backgrounds, primary text
- **Accent**: Cream/White (#fefefe) - content cards, alternating sections
- **Borders**: rgba(255,255,255,0.1) for dark backgrounds, rgba(15,23,42,0.1) for light
- **Interactive States**: Use opacity variations (hover: opacity-90, active: opacity-80)

### Layout System
- **Spacing Units**: Tailwind's 4, 8, 12, 16, 24 for consistency (p-4, p-8, p-12, p-16, p-24)
- **Container**: max-w-7xl with px-4 md:px-8
- **Section Padding**: py-16 md:py-24 for generous vertical breathing room
- **Card Spacing**: p-6 md:p-8 with rounded-lg borders

## Component Specifications

### Landing Page
**Hero Section**:
- Full viewport height (min-h-screen) with centered content
- Navy blue background (#0f172a)
- Large, bold headline emphasizing the value proposition
- Subheading with cream text (text-gray-200)
- Single prominent CTA button (Shadcn Button component) with backdrop-blur-sm if over imagery
- Optional: Subtle gradient overlay or geometric pattern background

**Additional Sections** (2-3 recommended):
- Features grid: 3-column on desktop (grid-cols-1 md:grid-cols-3)
- How It Works: Visual timeline or step-by-step cards
- CTA section: Cream background with navy text for contrast

### Authentication
- Centered card layout (max-w-md) on navy background
- Supabase Auth UI component with custom styling to match Linear aesthetic
- Clean input fields with subtle borders (border-gray-700)
- OAuth buttons with icon + text, full width
- Minimal decoration, focus on clarity

### Dashboard Layout
**Sidebar**:
- Fixed left sidebar (w-64) with navy background
- Navigation items: hover:bg-white/5, active:bg-white/10
- Clean icons from Lucide React
- Subtle dividers between sections (border-gray-800)

**Main Content**:
- Cream/white background (#fefefe)
- Content cards with shadow-sm and rounded-lg
- Generous padding (p-6 md:p-8)

**Radar Chart ("Perception Gap")**:
- Centered in card with p-8
- Chart height: 400px on desktop, 300px mobile
- Four datasets with distinct colors:
  - Self: Blue (#3b82f6)
  - Desired: Green (#10b981)
  - Peer: Purple (#8b5cf6)
  - Actual: Orange (#f59e0b)
- Legend below chart with subtle background
- "Coming Soon" tooltip on hover with backdrop-blur

## Component Library (Shadcn UI)
**Required Components**:
- Button (primary, secondary, ghost variants)
- Card (with CardHeader, CardContent)
- Input (for forms)
- Separator (for dividers)
- Tooltip (for "coming soon" indicators)
- Avatar (for user profiles)

## Mobile Responsiveness
- Sidebar: Collapse to hamburger menu on mobile (<768px)
- Hero text: Scale down from text-6xl to text-4xl
- Chart: Reduce height to 300px, adjust legend positioning
- Grid layouts: Stack to single column on mobile
- Touch-friendly targets: min 44px height for interactive elements

## Animations
**Minimal & Purposeful**:
- Sidebar navigation: transition-colors duration-200
- Button states: Built-in Shadcn transitions
- Page transitions: Simple fade-in (animate-in fade-in-0)
- Avoid heavy scroll-based or continuous animations

## Images
**Hero Section**: Optional abstract visualization of "perception gap" concept (overlapping circles, radar visualization, or professional stock imagery representing self-reflection). If used, apply dark overlay (bg-gradient-to-b from-transparent to-navy-900/50) for text readability.

---

**Design Principle**: Every element should feel intentional. Linear's aesthetic thrives on restraint—use whitespace as a design element, maintain crisp boundaries, and let content breathe. Professional, not playful.