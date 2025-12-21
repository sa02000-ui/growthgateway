import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Leaf, Loader2, ArrowLeft, ArrowRight, CheckCircle2, Heart } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import Footer from '@/components/footer';

interface Question {
  id: number;
  text: string;
  trait: string;
  keyed: '+' | '-';
}

const likertScale = [
  { value: 1, label: "Very Inaccurate" },
  { value: 2, label: "Moderately Inaccurate" },
  { value: 3, label: "Neither" },
  { value: 4, label: "Moderately Accurate" },
  { value: 5, label: "Very Accurate" },
];

type FeedbackState = 'intro' | 'taking' | 'identity' | 'success';

export default function FeedbackPage() {
  const { userId: tokenOrId } = useParams<{ userId: string }>();
  const [state, setState] = useState<FeedbackState>('intro');
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [peerName, setPeerName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const questionsPerPage = 10;

  useEffect(() => {
    async function resolveToken() {
      if (!tokenOrId) return;
      
      try {
        const res = await fetch(`/api/feedback-token/${tokenOrId}`);
        if (res.ok) {
          const data = await res.json();
          setResolvedUserId(data.userId);
          return;
        }
      } catch (err) {
        console.log('Token resolution failed');
      }
      setResolvedUserId(tokenOrId);
    }
    resolveToken();
  }, [tokenOrId]);

  const { data: questionsData, isLoading: questionsLoading } = useQuery<{ questions: Question[] }>({
    queryKey: ['/api/peer-feedback/questions'],
  });

  const { data: userData, isLoading: userLoading } = useQuery<{ userName: string; userId: string }>({
    queryKey: ['/api/peer-feedback/user', resolvedUserId],
    enabled: !!resolvedUserId,
  });

  const questions = questionsData?.questions || [];
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const userName = userData?.userName || 'This person';

  const submitMutation = useMutation({
    mutationFn: async (data: { responses: Record<string, number>; peerName: string | null; isAnonymous: boolean }) => {
      const res = await apiRequest('POST', `/api/peer-feedback/${resolvedUserId}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      setState('success');
    },
    onError: (error: Error) => {
      alert(`Submission failed: ${error.message}\n\nPlease try again.`);
    },
  });

  const handleResponse = (questionId: number, value: number) => {
    setResponses(prev => ({
      ...prev,
      [String(questionId)]: value,
    }));
  };

  const getCurrentPageQuestions = () => {
    const start = currentPage * questionsPerPage;
    return questions.slice(start, start + questionsPerPage);
  };

  const canProceed = () => {
    const pageQuestions = getCurrentPageQuestions();
    return pageQuestions.every(q => responses[String(q.id)] !== undefined);
  };

  const getCompletionPercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round((Object.keys(responses).length / questions.length) * 100);
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      responses,
      peerName: isAnonymous ? null : peerName || null,
      isAnonymous,
    });
  };

  if (questionsLoading || userLoading || !resolvedUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!resolvedUserId || (userData === undefined && !userLoading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4 md:p-8 border-b border-border">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg tracking-tight">GrowthPortal</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Link Not Found</h2>
              <p className="text-muted-foreground">This feedback link is invalid or has expired.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4 md:p-8 border-b border-border">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg tracking-tight">GrowthPortal</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3" data-testid="text-success-title">
                Thank You!
              </h2>
              <p className="text-muted-foreground">
                Your feedback has been submitted. {userName} will be able to see how you perceive them, 
                helping them on their growth journey.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (state === 'identity') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4 md:p-8 border-b border-border">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg tracking-tight">GrowthPortal</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Almost Done!</CardTitle>
              <CardDescription>
                How should your name appear to {userName}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="peerName">Your Name (optional)</Label>
                  <Input
                    id="peerName"
                    placeholder="Enter your name"
                    value={peerName}
                    onChange={(e) => setPeerName(e.target.value)}
                    disabled={isAnonymous}
                    data-testid="input-peer-name"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                    data-testid="checkbox-anonymous"
                  />
                  <Label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                    Remain Anonymous
                  </Label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setState('taking')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="flex-1 gap-2"
                  data-testid="button-submit-feedback"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Submit Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (state === 'taking') {
    const pageQuestions = getCurrentPageQuestions();
    const isLastPage = currentPage === totalPages - 1;
    const completionPct = getCompletionPercentage();

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 p-4 border-b border-border bg-background/95 backdrop-blur">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setState('intro')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </p>
            </div>
            <span className="text-sm font-medium text-foreground">{completionPct}%</span>
          </div>
          <div className="max-w-3xl mx-auto mt-2">
            <Progress value={completionPct} className="h-1" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-8">
                {pageQuestions.map((question) => (
                  <div key={question.id} className="space-y-4">
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                        {question.id}.
                      </span>
                      <p className="text-foreground font-medium" data-testid={`text-question-${question.id}`}>
                        {userName} tends to: {question.text.toLowerCase()}
                      </p>
                    </div>
                    <RadioGroup
                      value={responses[String(question.id)]?.toString() || ''}
                      onValueChange={(val) => handleResponse(question.id, parseInt(val))}
                      className="flex flex-wrap gap-2 pl-9"
                    >
                      {likertScale.map((option) => (
                        <div key={option.value} className="flex items-center">
                          <RadioGroupItem
                            value={option.value.toString()}
                            id={`q${question.id}-${option.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`q${question.id}-${option.value}`}
                            className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors border ${
                              responses[String(question.id)] === option.value
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                            }`}
                            data-testid={`radio-q${question.id}-${option.value}`}
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 0}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {isLastPage ? (
                <Button
                  onClick={() => setState('identity')}
                  disabled={!canProceed() || completionPct < 100}
                  className="gap-2"
                  data-testid="button-continue-to-identity"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Intro state
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 md:p-8 border-b border-border">
        <div className="flex items-center gap-2">
          <Leaf className="w-6 h-6 text-primary" />
          <span className="text-foreground font-semibold text-lg tracking-tight">GrowthPortal</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground" data-testid="text-intro-title">
              Help {userName} Grow
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {userName} has invited you to share how you perceive them. Your honest feedback 
              will help them understand how they come across to others.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">30 quick questions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">Takes about 5 minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">Option to remain anonymous</span>
              </div>
            </div>

            <Button 
              onClick={() => setState('taking')} 
              className="w-full gap-2"
              data-testid="button-start-feedback"
            >
              Start Feedback
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your responses are confidential and used only to provide {userName} with aggregated insights.
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
