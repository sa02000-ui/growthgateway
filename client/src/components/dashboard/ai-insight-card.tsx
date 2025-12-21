import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Loader2, Brain, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AIInsightData {
  insight: string;
  generatedAt: string;
  hasPeerData: boolean;
  peerCount: number;
}

export default function AIInsightCard() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<AIInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/ai-insights/${user.id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load insight');
      }
      const data = await res.json();
      setInsight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate insight');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchInsight();
    }
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (error && error.includes('No assessment')) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="card-ai-insight">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                AI Insight of the Month
              </CardTitle>
              <CardDescription className="text-xs">
                Personalized growth analysis
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchInsight}
            disabled={isLoading}
            data-testid="button-refresh-insight"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        ) : insight ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-insight">
                {insight.insight}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Generated {formatDate(insight.generatedAt)}</span>
              {insight.hasPeerData && (
                <span className="text-primary">
                  (Based on {insight.peerCount} peer responses)
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Complete an assessment to receive personalized insights.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
