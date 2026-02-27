import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Loader2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { getDisplayName } from '@/lib/assessment-display-names';

type TraitKey = 'N' | 'E' | 'O' | 'A' | 'C';

const traitNames: Record<TraitKey, string> = {
  N: 'Neuroticism',
  E: 'Extraversion', 
  O: 'Openness',
  A: 'Agreeableness',
  C: 'Conscientiousness',
};

const traitDescriptions: Record<TraitKey, { low: string; high: string }> = {
  N: {
    low: 'Calm, emotionally stable, handles stress well',
    high: 'Experiences more negative emotions, sensitive to stress',
  },
  E: {
    low: 'Reserved, prefers solitude, thoughtful',
    high: 'Outgoing, energetic, enjoys social interactions',
  },
  O: {
    low: 'Practical, conventional, prefers routine',
    high: 'Creative, curious, open to new experiences',
  },
  A: {
    low: 'Analytical, competitive, values directness',
    high: 'Cooperative, trusting, empathetic',
  },
  C: {
    low: 'Flexible, spontaneous, adaptable',
    high: 'Organized, disciplined, goal-oriented',
  },
};

function getInterpretation(trait: TraitKey, score: number) {
  const desc = traitDescriptions[trait];
  if (score < 40) return { level: 'Low', description: desc.low };
  if (score > 60) return { level: 'High', description: desc.high };
  return { level: 'Average', description: 'Balanced between extremes' };
}

export default function SharedResultsPage() {
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading, error } = useQuery<{
    result: {
      assessmentType: string;
      scores: Record<TraitKey, number>;
      completedAt: string;
    };
    expiresAt: string;
  }>({
    queryKey: ['/api/shared-result', token],
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading shared results...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Link Not Found</h2>
                <p className="text-muted-foreground mt-2">
                  This share link may have expired or is invalid.
                </p>
              </div>
              <Link href="/">
                <Button variant="outline" data-testid="button-go-home">
                  Go to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { result, expiresAt } = data;
  const scores = result.scores;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-foreground">Shared Assessment Results</h1>
              <p className="text-sm text-muted-foreground">{getDisplayName(result.assessmentType)}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Completed {new Date(result.completedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(scores) as TraitKey[]).map((trait) => {
              const score = scores[trait];
              const interpretation = getInterpretation(trait, score);
              return (
                <Card key={trait} data-testid={`card-shared-trait-${trait}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-semibold">
                        {traitNames[trait]}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {interpretation.level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold" data-testid={`text-shared-score-${trait}`}>
                          {Math.round(score)}%
                        </span>
                      </div>
                      <Progress value={score} className="h-2" />
                      <p className="text-sm text-muted-foreground">{interpretation.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Want to discover your own personality profile?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This link expires on {new Date(expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Link href="/auth">
                  <Button data-testid="button-take-assessment">
                    Take Assessment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
