import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Users, TrendingUp, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-white" />
            <span className="text-white font-semibold text-lg tracking-tight">GrowthPortal</span>
          </div>
          <Link href="/auth">
            <Button variant="outline" className="border-white/20 text-white bg-transparent" data-testid="button-header-sign-in">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <section className="min-h-screen flex items-center justify-center pt-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-gray-300 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Discover Your Authentic Self</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            Bridge the gap between who you are,{' '}
            <span className="text-gray-400">who you want to be,</span>{' '}
            and how others see you.
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Gain powerful insights into your personality, track your growth journey, 
            and understand how your self-perception aligns with reality.
          </p>
          
          <Link href="/auth">
            <Button size="lg" className="bg-white text-[#0f172a] font-semibold px-8 gap-2" data-testid="button-hero-get-started">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Our platform helps you understand the perception gaps in your life and guides you toward authentic growth.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Target className="w-6 h-6" />}
              title="Self-Assessment"
              description="Complete comprehensive personality assessments to understand how you perceive yourself and your goals."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Peer Feedback"
              description="Gather anonymous feedback from colleagues, friends, and family to see how others perceive you."
            />
            <FeatureCard 
              icon={<TrendingUp className="w-6 h-6" />}
              title="Track Growth"
              description="Visualize the gaps between perceptions and track your progress as you work toward alignment."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 bg-[#fefefe]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#0f172a] mb-6">
            Ready to discover your true self?
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Join thousands of professionals who are using data-driven insights to close their perception gaps.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-[#0f172a] text-white font-semibold px-8 gap-2" data-testid="button-cta-start-journey">
              Start Your Journey
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 md:px-8 border-t border-white/10 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white font-medium">GrowthPortal</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 GrowthPortal. All rights reserved.
          </p>
        </div>
      </footer>
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
    <div className="p-6 rounded-lg border border-white/10 bg-white/5" data-testid={`card-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
