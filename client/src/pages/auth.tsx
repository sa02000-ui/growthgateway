import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Leaf, Loader2 } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';
import { Link } from 'wouter';
import type { SupabaseClient } from '@supabase/supabase-js';
import Footer from '@/components/footer';

type AuthView = 'sign_in' | 'sign_up';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseClient()
      .then((client) => {
        setSupabaseClient(client);
        setClientLoading(false);
      })
      .catch((error) => {
        console.error('Failed to initialize Supabase:', error);
        setClientLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setLocation('/dashboard');
    }
  }, [user, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) return;

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (authView === 'sign_up') {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabaseClient) return;

    setError(null);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  const toggleView = () => {
    setAuthView(authView === 'sign_in' ? 'sign_up' : 'sign_in');
    setError(null);
    setMessage(null);
  };

  if (loading || clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  if (!supabaseClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Failed to initialize authentication. Please refresh the page.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 md:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground" data-testid="link-auth-logo">
          <Leaf className="w-6 h-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight">GrowthPortal</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md bg-card border-border" data-testid="card-auth">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-foreground" data-testid="text-auth-title">
              {authView === 'sign_up' ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {authView === 'sign_up' 
                ? 'Sign up to start your growth journey' 
                : 'Sign in to continue your growth journey'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              data-testid="button-google-auth"
            >
              <SiGoogle className="w-4 h-4" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">
                  {authView === 'sign_up' ? 'Create a password' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" data-testid="text-auth-error">{error}</p>
              )}

              {message && (
                <p className="text-sm text-green-600" data-testid="text-auth-message">{message}</p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-medium"
                data-testid="button-auth-submit"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authView === 'sign_up' ? (
                  'Sign Up'
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {authView === 'sign_up' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleView}
                    className="text-primary underline underline-offset-2"
                    data-testid="button-toggle-sign-in"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleView}
                    className="text-primary underline underline-offset-2"
                    data-testid="button-toggle-sign-up"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
