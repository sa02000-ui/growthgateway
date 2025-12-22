import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Brain, 
  Users, 
  Lightbulb, 
  Heart, 
  BookOpen, 
  Award,
  Lock,
  CheckCircle2,
  Play,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  History,
  Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import questionsData from '@/data/questions.json';
import { getCompletionPercentage, getTraitInterpretation } from '@shared/scoring';
import type { TraitScores, AssessmentResponses } from '@shared/schema';

type TraitKey = 'N' | 'E' | 'O' | 'A' | 'C';

interface Question {
  id: number;
  text: string;
  trait: TraitKey;
  keyed: '+' | '-';
}

const questions = questionsData.questions as Question[];
const likertScale = questionsData.likertScale;
const traitNames = questionsData.traitNames as Record<TraitKey, string>;

interface LibraryAssessment {
  id: string;
  category: string;
  name: string;
  popular_equivalent: string | null;
  scientific_reference: string | null;
  description: string | null;
  question_count: number | null;
  estimated_time: string | null;
  is_active: boolean;
}

const categoryConfig: Record<string, { name: string; subtitle: string; icon: typeof Brain; description: string }> = {
  'Who Am I': { name: 'Who Am I?', subtitle: 'Core Personality', icon: Brain, description: 'Foundational personality traits that define who you are' },
  'How I Think': { name: 'How I Think?', subtitle: 'Cognitive & Productivity', icon: Lightbulb, description: 'Work styles, decision-making, and thinking patterns' },
  'How I Interact': { name: 'How I Interact?', subtitle: 'Behavioral & Social', icon: Users, description: 'Interpersonal dynamics and social behaviors' },
  'How I Feel': { name: 'How I Feel?', subtitle: 'Well-being & Resilience', icon: Heart, description: 'Mental health indicators and emotional resilience' },
};

const categoryOrder = ['Who Am I', 'How I Think', 'How I Interact', 'How I Feel'];

type ViewState = 'library' | 'taking' | 'results' | 'history';

export default function ExploreAssessmentsTab() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<ViewState>('library');
  const [responses, setResponses] = useState<AssessmentResponses>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [latestScores, setLatestScores] = useState<TraitScores | null>(null);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [profileNoChange, setProfileNoChange] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);

  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const { data: libraryData, isLoading: libraryLoading } = useQuery<{ assessments: LibraryAssessment[] }>({
    queryKey: ['/api/assessments-library'],
  });

  const { data: resultsData, isLoading: resultsLoading } = useQuery<{ results: Array<Record<string, unknown>> }>({
    queryKey: ['/api/assessment/results', user?.id],
    enabled: !!user?.id,
  });

  const libraryAssessments = libraryData?.assessments || [];
  const results = resultsData?.results || [];

  const getLastTaken = (assessmentName: string) => {
    const assessmentResults = results.filter(r => 
      (r.assessment_type as string)?.toLowerCase().includes(assessmentName.toLowerCase().split(' ')[0]) ||
      (r.assessment_type as string)?.toLowerCase() === assessmentName.toLowerCase()
    );
    if (assessmentResults.length === 0) return null;
    const sorted = assessmentResults.sort((a, b) => 
      new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime()
    );
    return new Date(sorted[0].completed_at as string);
  };

  const getHistoryCount = (assessmentName: string) => {
    return results.filter(r => 
      (r.assessment_type as string)?.toLowerCase().includes(assessmentName.toLowerCase().split(' ')[0]) ||
      (r.assessment_type as string)?.toLowerCase() === assessmentName.toLowerCase()
    ).length;
  };

  const groupedAssessments = categoryOrder.map(category => ({
    category,
    config: categoryConfig[category],
    assessments: libraryAssessments.filter(a => a.category === category),
  })).filter(group => group.assessments.length > 0);

  const submitMutation = useMutation({
    mutationFn: async (data: { userId: string; responses: AssessmentResponses }) => {
      const res = await apiRequest('POST', '/api/assessment/submit', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLatestScores(data.scores);
      setState('results');
      queryClient.invalidateQueries({ queryKey: ['/api/assessment/results', user?.id] });
    },
    onError: (error: Error) => {
      alert(`Assessment submission failed: ${error.message}\n\nPlease try again or contact support if this persists.`);
    },
  });

  const handleStartClick = (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    setShowProfileConfirm(true);
  };

  const handleNavigateToProfile = () => {
    setShowProfileConfirm(false);
    setLocation('/dashboard/profile');
  };

  const confirmAndStart = () => {
    setShowProfileConfirm(false);
    setProfileNoChange(false);
    setResponses({});
    setCurrentPage(0);
    setState('taking');
  };

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

  const handleSubmit = () => {
    if (user?.id) {
      submitMutation.mutate({ userId: user.id, responses });
    }
  };

  const completionPct = getCompletionPercentage(responses);

  if (state === 'taking') {
    const pageQuestions = getCurrentPageQuestions();
    const isLastPage = currentPage === totalPages - 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setState('library')}
            data-testid="button-back-to-library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground" data-testid="text-assessment-title">
              IPIP-NEO-120 Personality Assessment
            </h1>
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium text-foreground">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2" />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-8">
            {pageQuestions.map((question) => (
              <div key={question.id} className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                    {question.id}.
                  </span>
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

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
            className="gap-2"
            data-testid="button-prev-page"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          {isLastPage ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitMutation.isPending || completionPct < 100}
              className="gap-2"
              data-testid="button-submit-assessment"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Submit Assessment
            </Button>
          ) : (
            <Button
              onClick={() => {
                setCurrentPage(p => p + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={!canProceed()}
              className="gap-2"
              data-testid="button-next-page"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state === 'results' && latestScores) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setState('library'); setLatestScores(null); }}
            data-testid="button-back-to-library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-results-title">
              Your Results
            </h1>
            <p className="text-muted-foreground">IPIP-NEO-120 Personality Assessment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(latestScores) as TraitKey[]).map((trait) => {
            const score = latestScores[trait];
            const interpretation = getTraitInterpretation(trait, score);
            return (
              <Card key={trait} className="bg-card border-border" data-testid={`card-trait-${trait}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground">
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
                      <span className="text-3xl font-bold text-foreground" data-testid={`text-score-${trait}`}>
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

        <Button onClick={() => { setState('library'); setLatestScores(null); }} data-testid="button-done">
          Done
        </Button>
      </div>
    );
  }

  if (state === 'history') {
    const historyResults = results.sort((a, b) => 
      new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime()
    );

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setState('library')}
            data-testid="button-back-to-library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-history-title">
              Assessment History
            </h1>
            <p className="text-muted-foreground">{historyResults.length} assessment{historyResults.length !== 1 ? 's' : ''} completed</p>
          </div>
        </div>

        {resultsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : historyResults.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {historyResults.map((result: Record<string, unknown>) => (
              <Card key={result.id as string} className="bg-card border-border" data-testid={`card-result-${result.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-foreground">
                          {result.assessment_type as string}
                        </CardTitle>
                        <CardDescription className="text-sm mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(result.completed_at as string).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {(['O', 'C', 'E', 'A', 'N'] as TraitKey[]).map((trait) => {
                      const scores = result.scores as TraitScores;
                      return (
                        <div key={trait} className="p-2 bg-muted/50 rounded-md">
                          <div className="text-xs text-muted-foreground">{trait}</div>
                          <div className="text-sm font-semibold text-foreground">
                            {Math.round(scores[trait])}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No assessment history yet</p>
              <p className="text-sm text-muted-foreground mt-1">Complete your first assessment to start tracking</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-explore-title">
            Explore Assessments
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover insights about yourself with our curated test library
          </p>
        </div>
        {results.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => setState('history')}
            className="gap-2"
            data-testid="button-view-all-history"
          >
            <History className="w-4 h-4" />
            View All History ({results.length})
          </Button>
        )}
      </div>

      {libraryLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : groupedAssessments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No assessments available yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon for new assessments</p>
          </CardContent>
        </Card>
      ) : (
        groupedAssessments.map((group) => {
          const CategoryIcon = group.config.icon;
          return (
            <div key={group.category} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{group.config.name}</h2>
                  <p className="text-sm text-muted-foreground">{group.config.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.assessments.map((assessment) => {
                  const lastTaken = getLastTaken(assessment.name);
                  const historyCount = getHistoryCount(assessment.name);
                  const isImplemented = assessment.name === 'IPIP-NEO-120';

                  return (
                    <Card 
                      key={assessment.id} 
                      className={`bg-card border-border ${!isImplemented ? 'opacity-70' : ''}`}
                      data-testid={`card-assessment-${assessment.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                              {assessment.name}
                              {assessment.popular_equivalent && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                  data-testid="badge-popular-equivalent"
                                >
                                  {assessment.popular_equivalent}
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1 text-sm">
                              {assessment.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {assessment.question_count && (
                            <Badge variant="secondary" className="text-xs">
                              {assessment.question_count} questions
                            </Badge>
                          )}
                          {assessment.estimated_time && (
                            <Badge variant="secondary" className="text-xs">
                              {assessment.estimated_time}
                            </Badge>
                          )}
                          {lastTaken && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="w-3 h-3" />
                              Last: {lastTaken.toLocaleDateString()}
                            </Badge>
                          )}
                        </div>

                        {assessment.scientific_reference && (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                              <span>{assessment.scientific_reference}</span>
                              <Badge 
                                variant="outline" 
                                className="gap-1 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                              >
                                <Award className="w-3 h-3" />
                                Peer Reviewed
                              </Badge>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex gap-2">
                          {isImplemented ? (
                            <>
                              <Button 
                                onClick={() => handleStartClick(assessment.id)} 
                                className="flex-1 gap-2" 
                                data-testid={`button-start-${assessment.id}`}
                              >
                                <Play className="w-4 h-4" />
                                {lastTaken ? 'Retake Assessment' : 'Start Assessment'}
                              </Button>
                              {historyCount > 0 && (
                                <Button 
                                  variant="outline" 
                                  onClick={() => setState('history')}
                                  className="gap-2"
                                  data-testid={`button-history-${assessment.id}`}
                                >
                                  <History className="w-4 h-4" />
                                  History ({historyCount})
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button variant="outline" className="w-full gap-2" disabled>
                              <Lock className="w-4 h-4" />
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <Dialog open={showProfileConfirm} onOpenChange={setShowProfileConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Confirm Your Profile
            </DialogTitle>
            <DialogDescription>
              Before taking the assessment, please ensure your demographic profile is up to date. 
              This helps us provide more accurate longitudinal insights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="noChange"
                checked={profileNoChange}
                onCheckedChange={(checked) => setProfileNoChange(checked === true)}
                data-testid="checkbox-no-change"
              />
              <Label htmlFor="noChange" className="text-sm cursor-pointer">
                No changes since my last assessment
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              If your life circumstances have changed (job, location, relationships, etc.), 
              please update your profile before continuing.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleNavigateToProfile}
              className="w-full sm:w-auto gap-2" 
              data-testid="button-update-profile"
            >
              <User className="w-4 h-4" />
              Update Profile
            </Button>
            <Button 
              onClick={confirmAndStart} 
              disabled={!profileNoChange}
              className="w-full sm:w-auto gap-2"
              data-testid="button-confirm-start"
            >
              <Play className="w-4 h-4" />
              Continue to Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
