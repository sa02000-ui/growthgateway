import { Link } from 'wouter';
import { ArrowLeft, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/footer';

export default function Privacy() {
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                GrowthPortal collects information you provide directly, including your email address, 
                name, and any profile information you choose to share. We also collect your assessment 
                responses and the feedback provided by your peers.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information is used to provide personality insights, track your growth over time, 
                and deliver personalized recommendations. We use aggregated, anonymized data to improve 
                our assessments and services. We do not sell your personal information to third parties.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Peer Feedback Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                When peers provide feedback about you, their responses are kept confidential. Individual 
                respondent names are hidden until at least 3 people have submitted feedback to protect 
                early responders from identification. Peers may choose to remain anonymous, in which case 
                their identity is never revealed.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data. Your assessment 
                responses and personal information are encrypted in transit and at rest. We use secure 
                authentication through Supabase to protect your account.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide you 
                services. You may request deletion of your account and associated data at any time by 
                contacting support. Historical assessment data may be retained in anonymized form for 
                research purposes.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to access, correct, or delete your personal information. You may 
                export your assessment history at any time. To exercise these rights, contact us through 
                the support channels provided in the application.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Important Disclaimer</h2>
              <div className="bg-muted/50 border border-border rounded-lg p-6">
                <p className="text-foreground leading-relaxed font-medium">
                  This portal is for educational and personal growth purposes only. It is not medical, 
                  psychological, or legal advice. By using this site, you agree that the providers are 
                  not liable for any actions taken based on these results and you agree to indemnify 
                  the providers from all claims.
                </p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Non-Medical Advice Notice</h2>
              <p className="text-muted-foreground leading-relaxed">
                GrowthPortal assessments are not clinical diagnostic tools. The results should not be 
                used to diagnose or treat any mental health condition. If you have concerns about your 
                mental health or wellbeing, please consult with a qualified healthcare professional. 
                Our AI-generated insights are for informational purposes only and do not constitute 
                professional psychological advice.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any changes 
                by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact 
                us through the support channels provided in the application.
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
