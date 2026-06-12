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
import { getDisplayName } from '@/lib/assessment-display-names';
import { 
  Brain, 
  Users, 
  Lightbulb, 
  Heart, 
  BookOpen, 
  CheckCircle2,
  Play,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  History,
  Info,
  Trophy,
  Target
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface LibraryAssessment {
  id: string;
  slug?: string;
  category: string;
  name: string;
  popular_equivalent: string | null;
  scientific_reference: string | null;
  description: string | null;
  question_count: number | null;
  estimated_time: string | null;
  is_active: boolean;
}

interface DynamicQuestion {
  questionNumber: number;
  text: string;
  traitKey: string;
  facetKey?: string;
  subCategory?: string;
  reverseCoded: boolean;
  correctOption?: string;
  options?: { value: string; label: string }[];
}

interface TraitConfig {
  traits: { key: string; name: string; description?: string; color?: string }[];
  facets?: { key: string; name: string; parentTrait: string }[];
}

interface AssessmentData {
  slug: string;
  name: string;
  category: string;
  description: string;
  questionCount: number;
  estimatedTime: string;
  scoringAlgorithm: string;
  scoringType: string;
  inputType: string;
  traitConfig: TraitConfig;
  questions: DynamicQuestion[];
  likertScale?: { value: number; label: string }[];
}

interface TraitScore {
  traitKey: string;
  traitName: string;
  score: number;
  percentageScore?: number;
  color?: string;
  interpretation?: string;
  maxScore?: number;
  percentile?: number;
}

interface AssessmentResult {
  slug: string;
  totalScore?: number;
  percentageScore?: number;
  traitScores: TraitScore[];
  facetScores?: TraitScore[];
  categoryScores?: Record<string, number>;
  assessmentName: string;
  category: string;
  traitConfig: TraitConfig;
}

const categoryConfig: Record<string, { name: string; subtitle: string; icon: typeof Brain; description: string; color: string; bgColor: string; borderColor: string; badgeColor: string }> = {
  'Who Am I': { name: 'Who Am I?', subtitle: 'Core Personality', icon: Brain, description: 'Foundational personality traits that define who you are', color: 'text-slate-700 dark:text-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-950/40', borderColor: 'border-slate-200 dark:border-slate-800', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300' },
  'How I Think': { name: 'How I Think?', subtitle: 'Cognitive & Productivity', icon: Lightbulb, description: 'Work styles, decision-making, and thinking patterns', color: 'text-indigo-700 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-950/40', borderColor: 'border-indigo-200 dark:border-indigo-800', badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  'How I Interact': { name: 'How I Interact?', subtitle: 'Behavioral & Social', icon: Users, description: 'Interpersonal dynamics and social behaviors', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/40', borderColor: 'border-orange-200 dark:border-orange-800', badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  'How I Feel': { name: 'How I Feel?', subtitle: 'Well-being & Resilience', icon: Heart, description: 'Mental health indicators and emotional resilience', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40', borderColor: 'border-emerald-200 dark:border-emerald-800', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
};

const assessmentMeta: Record<string, { displayName: string; popularName?: string; scientificRef: string; description: string }> = {
  'ipip-neo-120': {
    displayName: 'Big Five Personality Assessment',
    popularName: 'Similar to Myers-Briggs / 16Personalities',
    scientificRef: 'Johnson, J.A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory. Journal of Research in Personality, 51, 78-89.',
    description: 'The scientific gold standard for personality profiling. Measures Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.',
  },
  'schwartz-pvq-21': {
    displayName: 'Core Values & Motivations Assessment',
    popularName: 'Similar to VIA Character Strengths',
    scientificRef: 'Schwartz, S.H. (2003). A proposal for measuring value orientations across nations. European Social Survey Core Questionnaire Development, Ch. 7.',
    description: 'Identifies your core drivers and motivations — what matters most to you in life, such as achievement, security, benevolence, or self-direction.',
  },
  'short-dark-triad-sd3': {
    displayName: 'Shadow Personality Traits',
    popularName: 'Dark Triad Assessment',
    scientificRef: 'Jones, D.N. & Paulhus, D.L. (2014). Introducing the Short Dark Triad (SD3): A brief measure of dark personality traits. Assessment, 21(1), 28-41.',
    description: 'Measures three socially aversive traits: Machiavellianism, Narcissism, and Psychopathy. Normal personality dimensions everyone has to some degree.',
  },
  'icar-16': {
    displayName: 'Logical Reasoning & Problem Solving',
    popularName: 'Similar to IQ / Cognitive Ability Test',
    scientificRef: 'Condon, D.M. & Revelle, W. (2014). The International Cognitive Ability Resource: Development and initial validation. Intelligence, 43, 52-64.',
    description: 'A brief, reliable measure of cognitive ability using verbal reasoning and number series problems. Tests your analytical thinking skills.',
  },
  'grit-s-8': {
    displayName: 'Grit & Perseverance Assessment',
    popularName: 'Angela Duckworth\'s Grit Scale',
    scientificRef: 'Duckworth, A.L. & Quinn, P.D. (2009). Development and validation of the Short Grit Scale (Grit-S). Journal of Personality Assessment, 91(2), 166-174.',
    description: 'Measures your perseverance and passion for long-term goals. A strong predictor of success in challenging environments.',
  },
  'onet-riasec-30': {
    displayName: 'Career Interest & Work Style Profile',
    popularName: 'Holland Code / RIASEC Career Test',
    scientificRef: 'Rounds, J. et al. (2010). O*NET Interest Profiler Short Form psychometric characteristics. U.S. Department of Labor.',
    description: 'Identifies your career interests across six dimensions to find careers that match your natural inclinations and work preferences.',
  },
  'teique-sf-30': {
    displayName: 'Emotional Intelligence Assessment',
    popularName: 'EQ / Emotional Quotient Test',
    scientificRef: 'Petrides, K.V. (2009). Psychometric properties of the Trait Emotional Intelligence Questionnaire (TEIQue). In C. Stough et al. (Eds.), Assessing Emotional Intelligence.',
    description: 'Measures your emotional intelligence across four factors: Well-being, Self-control, Emotionality, and Sociability.',
  },
  'pss-10': {
    displayName: 'Perceived Stress Scale',
    scientificRef: 'Cohen, S. et al. (1983). A global measure of perceived stress. Journal of Health and Social Behavior, 24(4), 385-396.',
    description: 'The most widely used instrument for measuring how stressful you perceive situations in your daily life.',
  },
  'swls-5': {
    displayName: 'Satisfaction With Life Scale',
    popularName: 'Life Happiness Assessment',
    scientificRef: 'Diener, E. et al. (1985). The Satisfaction With Life Scale. Journal of Personality Assessment, 49(1), 71-75.',
    description: 'A short, scientifically validated measure of your overall life satisfaction and subjective well-being.',
  },
  'brs-6': {
    displayName: 'Resilience & Bounce-Back Assessment',
    popularName: 'Stress Recovery Test',
    scientificRef: 'Smith, B.W. et al. (2008). The Brief Resilience Scale: Assessing the ability to bounce back. International Journal of Behavioral Medicine, 15(3), 194-200.',
    description: 'Measures your ability to bounce back and recover from stress, setbacks, and adversity.',
  },
  'flourishing-8': {
    displayName: 'Psychological Well-Being & Flourishing',
    popularName: 'Mental Wellness Assessment',
    scientificRef: 'Diener, E. et al. (2010). New well-being measures: Flourishing and positive and negative feelings. Social Indicators Research, 97(2), 143-156.',
    description: 'Measures self-perceived success in relationships, self-esteem, purpose, and optimism — how well you\'re thriving overall.',
  },
};

const categoryOrder = ['Who Am I', 'How I Think', 'How I Interact', 'How I Feel'];

type ViewState = 'library' | 'taking' | 'results' | 'history';

export default function ExploreAssessmentsTab() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<ViewState>('library');
  const [responses, setResponses] = useState<Record<string, number | string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [profileNoChange, setProfileNoChange] = useState(false);
  const [selectedAssessmentName, setSelectedAssessmentName] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentData | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  const questionsPerPage = 10;

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
    mutationFn: async (data: { assessmentId: string; userId: string; responses: Record<string, number | string> }) => {
      const res = await apiRequest('POST', `/api/assessments/${data.assessmentId}/submit`, {
        userId: data.userId,
        responses: data.responses,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      const mappedResult = {
        ...data.result,
        traitScores: (data.result.traitScores || []).map((t: Record<string, unknown>) => ({
          traitKey: t.key || t.traitKey || '',
          traitName: t.name || t.traitName || '',
          score: t.score || 0,
          percentageScore: t.percentageScore || t.score || 0,
          color: t.color || '',
          interpretation: t.interpretation || '',
          maxScore: t.maxScore,
          percentile: t.percentile,
        })),
        facetScores: (data.result.facetScores || []).map((t: Record<string, unknown>) => ({
          traitKey: t.key || t.traitKey || '',
          traitName: t.name || t.traitName || '',
          score: t.score || 0,
          color: t.color || '',
        })),
      };
      setLatestResult(mappedResult);
      setState('results');
      queryClient.invalidateQueries({ queryKey: ['/api/assessment/results', user?.id] });
    },
    onError: (error: Error) => {
      alert(`Assessment submission failed: ${error.message}\n\nPlease try again or contact support if this persists.`);
    },
  });

  const handleStartClick = async (assessmentId: string, assessmentName: string) => {
    setSelectedAssessmentId(assessmentId);
    setSelectedAssessmentName(assessmentName);
    setShowProfileConfirm(true);
  };

  const handleNavigateToProfile = () => {
    setShowProfileConfirm(false);
    setLocation('/dashboard/profile');
  };

  const confirmAndStart = async () => {
    if (!selectedAssessmentId) return;
    
    setShowProfileConfirm(false);
    setProfileNoChange(false);
    setLoadingAssessment(true);
    
    try {
      const response = await fetch(`/api/assessments/${selectedAssessmentId}/questions`);
      
      if (!response.ok) {
        throw new Error(`Failed to load assessment: ${response.statusText}`);
      }
      
      const assessmentData: AssessmentData = await response.json();
      setCurrentAssessment(assessmentData);
      setResponses({});
      setCurrentPage(0);
      setState('taking');
    } catch (error) {
      console.error('Failed to load assessment:', error);
      alert('Failed to load assessment. Please try again.');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleResponse = (questionNumber: number, value: number | string) => {
    setResponses(prev => ({
      ...prev,
      [String(questionNumber)]: value,
    }));
  };

  const getCurrentPageQuestions = (): DynamicQuestion[] => {
    if (!currentAssessment) return [];
    const start = currentPage * questionsPerPage;
    return currentAssessment.questions.slice(start, start + questionsPerPage);
  };

  const getTotalPages = () => {
    if (!currentAssessment) return 0;
    return Math.ceil(currentAssessment.questions.length / questionsPerPage);
  };

  const canProceed = () => {
    const pageQuestions = getCurrentPageQuestions();
    return pageQuestions.every(q => responses[String(q.questionNumber)] !== undefined);
  };

  const getCompletionPercentage = () => {
    if (!currentAssessment) return 0;
    const answered = Object.keys(responses).length;
    return Math.round((answered / currentAssessment.questions.length) * 100);
  };

  const handleSubmit = () => {
    if (user?.id && currentAssessment && selectedAssessmentId) {
      submitMutation.mutate({ 
        assessmentId: selectedAssessmentId, 
        userId: user.id, 
        responses 
      });
    }
  };

  const renderQuestionInput = (question: DynamicQuestion) => {
    if (!currentAssessment) return null;

    const inputType = currentAssessment.inputType;

    if (inputType === 'multiple_choice' && question.options) {
      return (
        <div className="flex flex-col gap-2 pl-9">
          {question.options.map((option) => (
            <Button
              key={option.value}
              variant={responses[String(question.questionNumber)] === option.value ? 'default' : 'outline'}
              onClick={() => handleResponse(question.questionNumber, option.value)}
              className="justify-start text-left h-auto py-3 px-4"
              data-testid={`option-q${question.questionNumber}-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      );
    }

    const likertScale = currentAssessment.likertScale || [];
    
    return (
      <RadioGroup
        value={responses[String(question.questionNumber)]?.toString() || ''}
        onValueChange={(val) => handleResponse(question.questionNumber, parseInt(val))}
        className="flex flex-wrap gap-2 pl-9"
      >
        {likertScale.map((option) => (
          <div key={option.value} className="flex items-center">
            <RadioGroupItem
              value={option.value.toString()}
              id={`q${question.questionNumber}-${option.value}`}
              className="sr-only"
            />
            <Label
              htmlFor={`q${question.questionNumber}-${option.value}`}
              className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors border ${
                responses[String(question.questionNumber)] === option.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
              data-testid={`radio-q${question.questionNumber}-${option.value}`}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  const renderResults = () => {
    if (!latestResult) return null;

    const { category, traitScores, totalScore, percentageScore } = latestResult;

    if (category === 'How I Think' && totalScore !== undefined) {
      const maxScore = currentAssessment?.questions.length || 16;
      const percentage = percentageScore || Math.round((totalScore / maxScore) * 100);
      
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setState('library'); setLatestResult(null); setCurrentAssessment(null); }}
              data-testid="button-back-to-library"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-results-title">
                Your Results
              </h1>
              <p className="text-muted-foreground">{getDisplayName(latestResult.slug || latestResult.assessmentName)}</p>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-12 h-12 text-primary" />
              </div>
              <div className="text-5xl font-bold text-foreground mb-2" data-testid="text-total-score">
                {totalScore}/{maxScore}
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                Cognitive Score
              </p>
              <Badge variant="secondary" className="text-base px-4 py-1">
                Top {100 - percentage}% of test takers
              </Badge>
            </CardContent>
          </Card>

          <Button onClick={() => { setState('library'); setLatestResult(null); setCurrentAssessment(null); }} data-testid="button-done">
            Done
          </Button>
        </div>
      );
    }

    if (category === 'How I Interact' && latestResult.slug?.includes('riasec')) {
      const sortedTraits = [...traitScores].sort((a, b) => b.score - a.score);
      const topThree = sortedTraits.slice(0, 3);
      
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setState('library'); setLatestResult(null); setCurrentAssessment(null); }}
              data-testid="button-back-to-library"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-results-title">
                Your Career Interest Profile
              </h1>
              <p className="text-muted-foreground">{getDisplayName(latestResult.slug || latestResult.assessmentName)}</p>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Your Top Career Themes
              </CardTitle>
              <CardDescription>
                Your Holland Code: <span className="font-semibold">{topThree.map(t => t.traitKey).join('')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topThree.map((trait, index) => {
                const traitInfo = latestResult.traitConfig?.traits?.find((t: { key: string }) => t.key === trait.traitKey);
                return (
                  <div key={trait.traitKey} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{trait.traitName}</span>
                        <span className="text-sm text-muted-foreground">{Math.round(trait.score)}%</span>
                      </div>
                      {traitInfo?.description && (
                        <p className="text-xs text-muted-foreground mb-1">{traitInfo.description}</p>
                      )}
                      <Progress value={trait.score} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {traitScores.map((trait) => {
              const traitInfo = latestResult.traitConfig?.traits?.find((t: { key: string }) => t.key === trait.traitKey);
              return (
                <Card key={trait.traitKey} className="bg-card border-border" data-testid={`card-trait-${trait.traitKey}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {trait.traitName}
                    </CardTitle>
                    {traitInfo?.description && (
                      <CardDescription className="text-xs">{traitInfo.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-foreground" data-testid={`text-score-${trait.traitKey}`}>
                          {Math.round(trait.score)}%
                        </span>
                      </div>
                      <Progress value={trait.score} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button onClick={() => { setState('library'); setLatestResult(null); setCurrentAssessment(null); }} data-testid="button-done">
            Done
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setState('library'); setLatestResult(null); setCurrentAssessment(null); }}
            data-testid="button-back-to-library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-results-title">
              Your Results
            </h1>
            <p className="text-muted-foreground">{getDisplayName(latestResult.slug || latestResult.assessmentName)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {traitScores.map((trait) => {
            const traitInfo = latestResult.traitConfig?.traits?.find((t: { key: string }) => t.key === trait.traitKey);
            return (
              <Card key={trait.traitKey} className="bg-card border-border" data-testid={`card-trait-${trait.traitKey}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {trait.traitName}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {trait.interpretation || (trait.score >= 70 ? 'High' : trait.score >= 40 ? 'Moderate' : 'Low')}
                    </Badge>
                  </div>
                  {traitInfo?.description && (
                    <CardDescription className="text-xs mt-1">{traitInfo.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-foreground" data-testid={`text-score-${trait.traitKey}`}>
                        {Math.round(trait.score)}%
                      </span>
                    </div>
                    <Progress value={trait.score} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button onClick={() => { setState('library'); setLatestResult(null); setCurrentAssessment(null); }} data-testid="button-done">
          Done
        </Button>
      </div>
    );
  };

  if (loadingAssessment) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (state === 'taking' && currentAssessment) {
    const pageQuestions = getCurrentPageQuestions();
    const totalPages = getTotalPages();
    const isLastPage = currentPage === totalPages - 1;
    const completionPct = getCompletionPercentage();

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setState('library'); setCurrentAssessment(null); }}
            data-testid="button-back-to-library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground" data-testid="text-assessment-title">
              {getDisplayName(currentAssessment.slug || currentAssessment.name)}
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

        {currentAssessment.slug === 'onet-riasec-30' && currentPage === 0 && (
          <Card className="bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                For each activity below, rate how much you would enjoy doing it — not whether you have the skills, but whether the activity appeals to you.
              </p>
            </CardContent>
          </Card>
        )}
        {currentAssessment.slug === 'schwartz-pvq-21' && currentPage === 0 && (
          <Card className="bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Each statement describes a person. Rate how much this person is like you — how similar are their values and priorities to yours?
              </p>
            </CardContent>
          </Card>
        )}
        {currentAssessment.slug === 'short-dark-triad-sd3' && currentPage === 0 && (
          <Card className="bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Rate how much you agree or disagree with each statement about yourself. There are no right or wrong answers — respond honestly.
              </p>
            </CardContent>
          </Card>
        )}
        {currentAssessment.slug === 'teique-sf-30' && currentPage === 0 && (
          <Card className="bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Rate how much you agree or disagree with each statement about yourself. Answer based on how you typically feel, not how you think you should feel.
              </p>
            </CardContent>
          </Card>
        )}
        {(currentAssessment.slug === 'pss-10') && currentPage === 0 && (
          <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                For each question, think about how often you felt or thought a certain way during the last month.
              </p>
            </CardContent>
          </Card>
        )}
        {(currentAssessment.slug === 'icar-16') && currentPage === 0 && (
          <Card className="bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                Select the best answer for each question. Take your time — there is no time limit.
              </p>
            </CardContent>
          </Card>
        )}
        {(currentAssessment.slug === 'grit-s-8') && currentPage === 0 && (
          <Card className="bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                Rate how much each statement describes you. Think about how you generally are, not how you wish to be.
              </p>
            </CardContent>
          </Card>
        )}
        {(currentAssessment.slug === 'ipip-neo-120') && currentPage === 0 && (
          <Card className="bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Rate how accurately each statement describes you as you generally are now, not as you wish to be in the future.
              </p>
            </CardContent>
          </Card>
        )}
        {(['swls-5', 'flourishing-8'].includes(currentAssessment.slug || '')) && currentPage === 0 && (
          <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Rate how much you agree or disagree with each statement about your life.
              </p>
            </CardContent>
          </Card>
        )}
        {(currentAssessment.slug === 'brs-6') && currentPage === 0 && (
          <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Rate how much you agree or disagree with each statement about how you handle stress and adversity.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-8">
            {pageQuestions.map((question) => {
              const slug = currentAssessment.slug;
              let questionPrefix = '';
              if (slug === 'onet-riasec-30') {
                questionPrefix = 'How much would you enjoy: ';
              }

              return (
                <div key={question.questionNumber} className="space-y-4">
                  <div className="flex gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                      {question.questionNumber}.
                    </span>
                    <p className="text-foreground font-medium" data-testid={`text-question-${question.questionNumber}`}>
                      {questionPrefix}{question.text}{slug === 'onet-riasec-30' ? '?' : ''}
                    </p>
                  </div>
                  {renderQuestionInput(question)}
                </div>
              );
            })}
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

  if (state === 'results' && latestResult) {
    return renderResults();
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
                  {!!result.scores && typeof result.scores === 'object' && (() => {
                    const scoresObj = result.scores as Record<string, number>;
                    const scoreEntries = Object.entries(scoresObj).slice(0, 5);
                    return (
                      <div className="flex flex-wrap gap-2">
                        {scoreEntries.map(([key, value]) => (
                          <div key={key} className="p-2 bg-muted/50 rounded-md">
                            <div className="text-xs text-muted-foreground">{key}</div>
                            <div className="text-sm font-semibold text-foreground">
                              {typeof value === 'number' ? `${Math.round(value)}%` : String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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
              <div className={`flex items-center gap-4 p-4 rounded-xl ${group.config.bgColor} border ${group.config.borderColor}`}>
                <div className={`w-12 h-12 rounded-xl ${group.config.badgeColor} flex items-center justify-center`}>
                  <CategoryIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${group.config.color}`} data-testid={`text-category-${group.category}`}>
                    {group.config.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{group.config.description}</p>
                </div>
                <Badge variant="outline" className={`ml-auto text-xs ${group.config.badgeColor} border-0`}>
                  {group.assessments.length} test{group.assessments.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.assessments.map((assessment) => {
                  const lastTaken = getLastTaken(assessment.name);
                  const historyCount = getHistoryCount(assessment.name);
                  const meta = assessmentMeta[assessment.slug || ''];
                  const displayName = meta?.displayName || assessment.name;
                  const popularName = meta?.popularName;
                  const scientificRef = meta?.scientificRef;
                  const enhancedDescription = meta?.description || assessment.description;

                  return (
                    <Card 
                      key={assessment.id} 
                      className={`bg-card border ${group.config.borderColor}/50`}
                      data-testid={`card-assessment-${assessment.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-foreground leading-snug" data-testid={`text-name-${assessment.id}`}>
                              {displayName}
                            </CardTitle>
                            {popularName && (
                              <p className={`text-xs font-medium mt-0.5 ${group.config.color}`} data-testid={`text-popular-${assessment.id}`}>
                                {popularName}
                              </p>
                            )}
                            <CardDescription className="mt-1.5 text-sm">
                              {enhancedDescription}
                            </CardDescription>
                          </div>
                          {scientificRef && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="flex-shrink-0 w-7 h-7 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors" data-testid={`button-info-${assessment.id}`}>
                                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[320px] p-3">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    <span className="text-xs font-semibold">Scientific Reference</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{scientificRef}</p>
                                  <Badge variant="outline" className="gap-1 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Peer Reviewed
                                  </Badge>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
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

                        <div className="pt-2 flex gap-2">
                          <Button 
                            onClick={() => handleStartClick(assessment.id, assessment.name)} 
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
