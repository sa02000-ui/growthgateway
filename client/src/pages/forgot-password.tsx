import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Leaf, Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Footer from '@/components/footer';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function ForgotPasswordPage() {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getSupabaseClient()
      .then((client) => {
        setSupabaseClient(client);
        setClientLoading(false);
      })
      .catch((error) => {
        console.error('Failed to initialize Supabase:', error);
        setError('Server unreachable. Please try again later.');
        setClientLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient || !email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw new Error('Server unreachable. Please check your connection and try again.');
        }
        throw error;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 md:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground" data-testid="link-forgot-logo">
          <Leaf className="w-6 h-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight">GrowthPortal</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground" data-testid="text-forgot-title">
              Reset Password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                  <p className="text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If you don't see it, check your spam folder.
                  </p>
                </div>
                <Link href="/auth">
                  <Button variant="outline" className="w-full gap-2" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                      data-testid="input-forgot-email"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-md" data-testid="text-forgot-error">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !email.trim()}
                  data-testid="button-forgot-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/auth" className="text-sm text-primary hover:underline" data-testid="link-back-to-login">
                    <span className="inline-flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" />
                      Back to Login
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
