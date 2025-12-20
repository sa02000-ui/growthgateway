import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

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

  if (loading || clientLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!supabaseClient) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-red-400">Failed to initialize authentication. Please refresh the page.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="p-4 md:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white" data-testid="link-auth-logo">
          <Sparkles className="w-6 h-6" />
          <span className="font-semibold text-lg tracking-tight">GrowthPortal</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md bg-[#1e293b] border-white/10" data-testid="card-auth">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-white" data-testid="text-auth-title">Welcome Back</CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to continue your growth journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabaseClient}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#ffffff',
                      brandAccent: '#e2e8f0',
                      brandButtonText: '#0f172a',
                      defaultButtonBackground: '#334155',
                      defaultButtonBackgroundHover: '#475569',
                      inputBackground: '#1e293b',
                      inputBorder: '#475569',
                      inputBorderHover: '#64748b',
                      inputBorderFocus: '#94a3b8',
                      inputText: '#ffffff',
                      inputLabelText: '#94a3b8',
                      inputPlaceholder: '#64748b',
                      messageText: '#f1f5f9',
                      messageTextDanger: '#fca5a5',
                      anchorTextColor: '#94a3b8',
                      anchorTextHoverColor: '#e2e8f0',
                    },
                    borderWidths: {
                      buttonBorderWidth: '1px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '6px',
                      buttonBorderRadius: '6px',
                      inputBorderRadius: '6px',
                    },
                    space: {
                      inputPadding: '12px',
                      buttonPadding: '12px',
                    },
                    fonts: {
                      bodyFontFamily: 'Inter, sans-serif',
                      buttonFontFamily: 'Inter, sans-serif',
                      inputFontFamily: 'Inter, sans-serif',
                      labelFontFamily: 'Inter, sans-serif',
                    },
                  },
                },
                className: {
                  container: 'auth-container',
                  button: 'auth-button font-medium',
                  input: 'auth-input',
                  label: 'auth-label text-sm',
                  anchor: 'text-sm',
                },
              }}
              providers={['google']}
              redirectTo={`${window.location.origin}/dashboard`}
              view="sign_in"
              showLinks={true}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email address',
                    password_label: 'Password',
                    button_label: 'Sign In',
                    social_provider_text: 'Continue with {{provider}}',
                    link_text: "Don't have an account? Sign up",
                  },
                  sign_up: {
                    email_label: 'Email address',
                    password_label: 'Create a password',
                    button_label: 'Sign Up',
                    social_provider_text: 'Continue with {{provider}}',
                    link_text: 'Already have an account? Sign in',
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
