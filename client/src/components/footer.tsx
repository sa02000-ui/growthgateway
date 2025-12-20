import { Link } from 'wouter';
import { Leaf } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">GrowthPortal</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">
              Terms & Disclaimer
            </Link>
            <span className="hidden md:inline text-border">|</span>
            <span>&copy; {new Date().getFullYear()} GrowthPortal</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
            This portal is for educational and growth purposes only. It is not medical, psychological, or legal advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
