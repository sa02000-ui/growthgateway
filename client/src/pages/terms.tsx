import { Link } from 'wouter';
import { ArrowLeft, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/footer';

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">GrowthPortal</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2" data-testid="text-terms-title">
            Terms of Use & Disclaimer
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Purpose</h2>
              <p className="text-muted-foreground leading-relaxed">
                GrowthPortal is designed to help individuals understand their personality traits and foster personal growth. 
                The assessments, tools, and insights provided are intended for educational and self-improvement purposes only.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Important Disclaimer</h2>
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <p className="text-foreground leading-relaxed font-medium">
                  This portal is for educational and growth purposes only. It is not medical, psychological, or legal advice. 
                  By using this site, you agree that the providers are not liable for any actions taken based on these results 
                  and you agree to indemnify the providers from all claims.
                </p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Use of Assessments</h2>
              <p className="text-muted-foreground leading-relaxed">
                The personality assessments offered through GrowthPortal, including the IPIP-NEO-120, are based on 
                established psychological research. However, these tools are not diagnostic instruments and should not 
                be used to make clinical decisions or as substitutes for professional evaluation.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">No Professional Relationship</h2>
              <p className="text-muted-foreground leading-relaxed">
                Using GrowthPortal does not create a professional relationship between you and the providers. 
                If you have concerns about your mental health or wellbeing, please consult with a qualified 
                healthcare professional.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Data & Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your assessment responses and results are stored securely. We do not share your personal data 
                with third parties without your explicit consent. You may request deletion of your data at any time 
                by contacting support.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, GrowthPortal and its providers disclaim all liability 
                for any direct, indirect, incidental, consequential, or special damages arising from your use 
                of this service or reliance on any information provided.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By creating an account and using GrowthPortal, you acknowledge that you have read, understood, 
                and agree to be bound by these terms. If you do not agree, please do not use our services.
              </p>
            </section>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border">
            <Link href="/">
              <Button data-testid="button-return-home">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
