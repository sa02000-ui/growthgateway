import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Users, TrendingUp, Leaf } from 'lucide-react';
import Footer from '@/components/footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg tracking-tight">GrowthPortal</span>
          </div>
          <Link href="/auth">
            <Button variant="outline" data-testid="button-header-sign-in">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <section className="min-h-screen flex items-center justify-center pt-16 px-4 md:px-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8">
            <Leaf className="w-4 h-4" />
            <span>Discover Your Authentic Self</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            Bridge the gap between who you are,{' '}
            <span className="text-muted-foreground">who you want to be,</span>{' '}
            and how others see you.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Gain powerful insights into your personality, track your growth journey, 
            and understand how your self-perception aligns with reality.
          </p>
          
          <Link href="/auth">
            <Button size="lg" className="font-semibold px-8 gap-2" data-testid="button-hero-get-started">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground text-center mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16">
            Our platform helps you understand how your self-perception aligns with how others experience you, guiding you toward authentic growth.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Target className="w-6 h-6" />}
              title="Self-Assessment"
              description="Complete comprehensive personality assessments to understand how you perceive yourself and your goals."
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6" />}
              title="Longitudinal Tracking"
              description="Map your personal growth over months and years with detailed timeline visualizations of your evolving traits."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Network Perspective"
              description="See how your self-perception aligns with how your colleagues, friends, and family experience you."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-6">
            Ready to discover your true self?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of professionals who are using data-driven insights to close their perception gaps.
          </p>
          <Link href="/auth">
            <Button size="lg" className="font-semibold px-8 gap-2" data-testid="button-cta-start-journey">
              Start Your Journey
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg border border-border bg-card" data-testid={`card-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
