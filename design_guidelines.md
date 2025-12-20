# Design Guidelines: Personality & Growth Portal

## Design Approach
**Clean Growth Aesthetic** - Professional, organic interface with earth tones, generous whitespace, and focus on clarity over decoration.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Hierarchy**:
  - Hero Heading: text-5xl md:text-6xl, font-bold, tracking-tight
  - Section Headings: text-3xl md:text-4xl, font-semibold
  - Body Text: text-base md:text-lg, font-normal
  - UI Labels: text-sm, font-medium

### Color Palette
- **Primary**: Sage Green (#4f7942 / hsl 93 28% 36%) - buttons, active states, icons
- **Background**: Warm Cream (#fdfbf7 / hsl 40 33% 98%) - main backgrounds
- **Card**: Light Cream (#faf8f5 / hsl 40 30% 97%) - card backgrounds
- **Foreground**: Charcoal (#2d2a26 / hsl 30 10% 15%) - primary text
- **Muted**: Earth Gray (hsl 30 8% 45%) - secondary text
- **Borders**: Warm Gray (hsl 40 15% 88%) - subtle borders

### Layout System
- **Spacing Units**: Tailwind's 4, 6, 8, 12, 16, 24 for consistency
- **Container**: max-w-7xl with px-4 md:px-8
- **Section Padding**: py-16 md:py-24 for generous vertical breathing room
- **Card Spacing**: p-6 md:p-8 with rounded-lg borders

## Component Specifications

### Landing Page
**Hero Section**:
- Gradient background from primary/5 to background
- Large, bold headline with foreground text
- Subheading with muted-foreground
- Single prominent CTA button (primary variant)
- Leaf icon branding

**Additional Sections**:
- Features grid: 3-column on desktop (grid-cols-1 md:grid-cols-3)
- Cards with bg-card, border-border
- Primary/10 backgrounds for icon containers

### Dashboard Layout
**Sidebar**:
- Warm cream background (bg-sidebar)
- Charcoal text (text-sidebar-foreground)
- Active items: bg-primary with primary-foreground text
- Leaf icon branding

**Main Content**:
- Cream background (bg-background)
- Content cards with bg-card and border-border
- Generous padding (p-6 md:p-8)

**Charts**:
- Radar Chart: Current snapshot with primary color fill
- Timeline Line Chart: Five trait colors
  - Neuroticism: #ef4444 (red)
  - Extraversion: #3b82f6 (blue)
  - Openness: #8b5cf6 (purple)
  - Agreeableness: #10b981 (green)
  - Conscientiousness: #f59e0b (orange)

### Footer
- Border-t with border-border
- Background: muted/30
- Links to Terms page
- Brief disclaimer text

## Component Library (Shadcn UI)
**Required Components**:
- Button (primary, secondary, ghost, outline variants)
- Card (with CardHeader, CardContent, CardDescription)
- Badge (for data point counts)
- Avatar (for user profiles)
- Separator (for dividers)
- Tooltip (for information)

## Mobile Responsiveness
- Sidebar: Collapse to hamburger menu on mobile (<768px)
- Hero text: Scale down from text-6xl to text-4xl
- Charts: Side-by-side on lg:, stacked on mobile
- Grid layouts: Stack to single column on mobile
- Touch-friendly targets: min 44px height for interactive elements

## Animations
**Minimal & Purposeful**:
- Sidebar navigation: transition-colors duration-200
- Button states: Built-in Shadcn transitions
- Loading states: animate-spin on Loader2 icon
- Avoid heavy scroll-based or continuous animations

---

**Design Principle**: Every element should feel intentional and organic. The sage green and earth tones create a calming, growth-focused environment. Use whitespace generously, maintain clean boundaries, and let content breathe. Professional, supportive, not clinical.
