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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Loader2, ArrowLeft, ArrowRight, CheckCircle2, Heart, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import {
  likertScale,
  ATTENTION_CHECK,
  relationshipOptions,
  relationshipLabels,
  type RelationshipValue,
} from '@shared/peer-feedback-questions';
import { PEER_360_INSTRUMENT } from '@shared/assessments/category-five-seed';
import Footer from '@/components/footer';

interface ApiQuestion {
  id: number;
  text: string;
  trait: string;
  keyed: '+' | '-';
}

interface FeedbackItem {
  id: number;
  text: string;
}

type Instrument = 'big-five' | 'peer-360';
type FeedbackState = 'intro' | 'taking' | 'identity' | 'success';
type InviteState = 'valid' | 'used' | 'expired' | null;

const peer360Items: FeedbackItem[] = PEER_360_INSTRUMENT.questions.map((q) => ({
  id: q.question_number,
  text: q.text,
}));

export default function FeedbackPage() {
  const { userId: tokenOrId } = useParams<{ userId: string }>();
  const [state, setState] = useState<FeedbackState>('intro');
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [peerName, setPeerName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [attentionResponse, setAttentionResponse] = useState<number | null>(null);

  const [resolving, setResolving] = useState(true);
  const [instrument, setInstrument] = useState<Instrument>('big-five');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>(null);
  const [lockedRelationship, setLockedRelationship] = useState<RelationshipValue | null>(null);
  const [relationship, setRelationship] = useState<RelationshipValue | ''>('');

  const questionsPerPage = 10;

  useEffect(() => {
    async function resolve() {
      if (!tokenOrId) {
        setResolving(false);
        return;
      }

      // 1. One-time invite token (carries instrument + optional relationship).
      try {
        const res = await fetch(`/api/peer-invite/${tokenOrId}`);
        if (res.ok) {
          const data = await res.json();
          setInviteToken(tokenOrId);
          setInstrument(data.instrument === 'peer-360' ? 'peer-360' : 'big-five');
          if (data.relationship) {
            setLockedRelationship(data.relationship);
            setRelationship(data.relationship);
          }
          setInviteState(data.status as InviteState);
          setResolvedUserId(data.userId);
          setResolving(false);
          return;
        }
      } catch {
        /* fall through */
      }

      // 2. Reusable secure feedback token.
      try {
        const res = await fetch(`/api/feedback-token/${tokenOrId}`);
        if (res.ok) {
          const data = await res.json();
          setResolvedUserId(data.userId);
          setResolving(false);
          return;
        }
      } catch {
        /* fall through */
      }

      // 3. Raw id fallback.
      setResolvedUserId(tokenOrId);
      setResolving(false);
    }
    resolve();
  }, [tokenOrId]);

  const { data: questionsData, isLoading: questionsLoading } = useQuery<{ questions: ApiQuestion[] }>({
    queryKey: ['/api/peer-feedback/questions'],
    enabled: instrument === 'big-five',
  });

  const { data: userData, isLoading: userLoading } = useQuery<{ userName: string; userId: string }>({
    queryKey: ['/api/peer-feedback/user', resolvedUserId],
    enabled: !!resolvedUserId,
  });

  const items: FeedbackItem[] =
    instrument === 'peer-360'
      ? peer360Items
      : (questionsData?.questions || []).map((q) => ({ id: q.id, text: q.text }));

  const totalPages = Math.max(1, Math.ceil(items.length / questionsPerPage));
  const userName = userData?.userName || 'This person';

  const submitMutation = useMutation({
    mutationFn: async (data: {
      responses: Record<string, number>;
      peerName: string | null;
      isAnonymous: boolean;
      relationship: RelationshipValue;
      instrument: Instrument;
      inviteToken: string | null;
      attentionResponse: number | null;
    }) => {
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
    setResponses((prev) => ({ ...prev, [String(questionId)]: value }));
  };

  const getCurrentPageQuestions = () => {
    const start = currentPage * questionsPerPage;
    return items.slice(start, start + questionsPerPage);
  };

  const canProceed = () => getCurrentPageQuestions().every((q) => responses[String(q.id)] !== undefined);

  const getCompletionPercentage = () => {
    if (items.length === 0) return 0;
    const answered = items.filter((q) => responses[String(q.id)] !== undefined).length;
    return Math.round((answered / items.length) * 100);
  };

  // Detect straight-lining: identical raw response to every item.
  const isStraightLining = () => {
    const vals = items.map((q) => responses[String(q.id)]).filter((v): v is number => v !== undefined);
    if (vals.length < items.length || vals.length === 0) return false;
    return new Set(vals).size === 1;
  };

  const handleFinishQuestions = () => {
    if (attentionResponse !== ATTENTION_CHECK.expected) {
      alert(
        'Attention check: please re-read the highlighted quality-control item and select the requested option before continuing.'
      );
      return;
    }
    if (isStraightLining()) {
      const proceed = window.confirm(
        'It looks like you gave the same answer to every question. Honest, varied answers help the most. Continue anyway?'
      );
      if (!proceed) return;
    }
    setState('identity');
  };

  const handleSubmit = () => {
    if (!relationship) {
      alert('Please choose how you know this person before submitting.');
      return;
    }
    submitMutation.mutate({
      responses,
      peerName: isAnonymous ? null : peerName || null,
      isAnonymous,
      relationship,
      instrument,
      inviteToken,
      attentionResponse,
    });
  };

  if (resolving || (instrument === 'big-five' && questionsLoading) || userLoading || !resolvedUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Used / expired one-time invite.
  if (inviteState === 'used' || inviteState === 'expired') {
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
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2" data-testid="text-invite-invalid">
                {inviteState === 'used' ? 'This link has already been used' : 'This link has expired'}
              </h2>
              <p className="text-muted-foreground">
                {inviteState === 'used'
                  ? 'Each invitation link works once to keep feedback fair. Please ask for a fresh link if you still need to respond.'
                  : 'This invitation is no longer active. Please ask for a new link to share your feedback.'}
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
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
              <CardDescription>How should your name appear to {userName}?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="relationship">How do you know {userName}?</Label>
                {lockedRelationship ? (
                  <div
                    className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                    data-testid="text-relationship-locked"
                  >
                    {relationshipLabels[lockedRelationship]}
                  </div>
                ) : (
                  <Select value={relationship} onValueChange={(v) => setRelationship(v as RelationshipValue)}>
                    <SelectTrigger id="relationship" data-testid="select-relationship">
                      <SelectValue placeholder="Select your relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} data-testid={`option-relationship-${opt.value}`}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  This groups feedback by relationship. {userName} only ever sees grouped averages, never who said what.
                </p>
              </div>

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
                <Button variant="outline" onClick={() => setState('taking')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending || !relationship}
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
            <Button variant="ghost" size="icon" onClick={() => setState('intro')}>
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
          <div className="max-w-3xl mx-auto space-y-4">
            {currentPage === 0 && (
              <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {instrument === 'peer-360'
                      ? <>Rate how much you agree that each statement describes <strong>{userName}</strong> in everyday situations. Base your answers on what you've personally observed.</>
                      : <>Rate how much you agree or disagree with each statement about <strong>{userName}</strong>. Base your answers on what you've personally observed — there are no right or wrong responses.</>}
                  </p>
                </CardContent>
              </Card>
            )}
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-8">
                {pageQuestions.map((question) => (
                  <div key={question.id} className="space-y-4">
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">{question.id}.</span>
                      <p className="text-foreground font-medium" data-testid={`text-question-${question.id}`}>
                        {question.text}
                      </p>
                    </div>
                    <RadioGroup
                      value={responses[String(question.id)]?.toString() || ''}
                      onValueChange={(val) => handleResponse(question.id, parseInt(val))}
                      className="flex flex-wrap gap-2 pl-9"
                    >
                      {likertScale.map((option) => (
                        <div key={option.value} className="flex items-center">
                          <RadioGroupItem value={option.value.toString()} id={`q${question.id}-${option.value}`} className="sr-only" />
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

            {isLastPage && (
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400 min-w-[2rem]">!</span>
                    <p className="text-foreground font-medium" data-testid="text-attention-check">
                      {ATTENTION_CHECK.text}
                    </p>
                  </div>
                  <RadioGroup
                    value={attentionResponse?.toString() || ''}
                    onValueChange={(val) => setAttentionResponse(parseInt(val))}
                    className="flex flex-wrap gap-2 pl-9"
                  >
                    {likertScale.map((option) => (
                      <div key={option.value} className="flex items-center">
                        <RadioGroupItem value={option.value.toString()} id={`attn-${option.value}`} className="sr-only" />
                        <Label
                          htmlFor={`attn-${option.value}`}
                          className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors border ${
                            attentionResponse === option.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                          }`}
                          data-testid={`radio-attn-${option.value}`}
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 0}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {isLastPage ? (
                <Button
                  onClick={handleFinishQuestions}
                  disabled={!canProceed() || completionPct < 100 || attentionResponse === null}
                  className="gap-2"
                  data-testid="button-continue-to-identity"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={() => setCurrentPage((p) => p + 1)} disabled={!canProceed()} className="gap-2">
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
              {userName} has invited you to share how you perceive them. Your honest feedback will help them
              understand how they come across to others.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">{items.length || 30} quick questions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">Takes about {instrument === 'peer-360' ? '3' : '5'} minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-foreground">Option to remain anonymous</span>
              </div>
            </div>

            <Button onClick={() => setState('taking')} className="w-full gap-2" data-testid="button-start-feedback">
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
