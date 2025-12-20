import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ClipboardList, Play, Clock, CheckCircle2, ArrowLeft, ArrowRight, Brain, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
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

type AssessmentState = 'list' | 'taking' | 'results';

export default function AssessmentsTab() {
  const { user } = useAuth();
  const [state, setState] = useState<AssessmentState>('list');
  const [responses, setResponses] = useState<AssessmentResponses>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [latestScores, setLatestScores] = useState<TraitScores | null>(null);

  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const { data: resultsData, isLoading: resultsLoading } = useQuery<{ results: Array<Record<string, unknown>> }>({
    queryKey: ['/api/assessment/results', user?.id],
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { userId: string; responses: AssessmentResponses }) => {
      const res = await apiRequest('POST', '/api/assessment/submit', data);
      return res.json();
    },
    onSuccess: (data) => {
      setLatestScores(data.scores);
      setState('results');
      queryClient.invalidateQueries({ queryKey: ['/api/assessment/results', user?.id] });
    },
  });

  const startAssessment = () => {
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
  const results = resultsData?.results || [];

  if (state === 'taking') {
    const pageQuestions = getCurrentPageQuestions();
    const isLastPage = currentPage === totalPages - 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setState('list')}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#0f172a]" data-testid="text-assessment-title">
              IPIP-NEO-120 Personality Assessment
            </h1>
            <p className="text-sm text-gray-500">
              Page {currentPage + 1} of {totalPages}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Overall Progress</span>
            <span className="font-medium text-[#0f172a]">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2" />
        </div>

        <Card className="bg-white border-[#0f172a]/10">
          <CardContent className="p-6 space-y-8">
            {pageQuestions.map((question, idx) => (
              <div key={question.id} className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-sm font-medium text-gray-400 min-w-[2rem]">
                    {question.id}.
                  </span>
                  <p className="text-[#0f172a] font-medium" data-testid={`text-question-${question.id}`}>
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
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
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
              className="gap-2 bg-[#0f172a]"
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
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!canProceed()}
              className="gap-2 bg-[#0f172a]"
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
            onClick={() => { setState('list'); setLatestScores(null); }}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a]" data-testid="text-results-title">
              Your Results
            </h1>
            <p className="text-gray-500">IPIP-NEO-120 Personality Assessment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(latestScores) as TraitKey[]).map((trait) => {
            const score = latestScores[trait];
            const interpretation = getTraitInterpretation(trait, score);
            return (
              <Card key={trait} className="bg-white border-[#0f172a]/10" data-testid={`card-trait-${trait}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-[#0f172a]">
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
                      <span className="text-3xl font-bold text-[#0f172a]" data-testid={`text-score-${trait}`}>
                        {Math.round(score)}%
                      </span>
                    </div>
                    <Progress value={score} className="h-2" />
                    <p className="text-sm text-gray-500">{interpretation.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button onClick={() => { setState('list'); setLatestScores(null); }} className="bg-[#0f172a]" data-testid="button-done">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight" data-testid="text-assessments-title">
            My Assessments
          </h1>
          <p className="text-gray-500 mt-1">
            Complete assessments to build your personality profile
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white border-0" data-testid="card-ipip-neo">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold">IPIP-NEO-120</CardTitle>
              <CardDescription className="text-gray-300 mt-1">
                The gold standard personality assessment measuring the Big Five traits
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Badge variant="secondary" className="bg-white/10 text-white border-0">
              120 Questions
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white border-0">
              ~15-20 minutes
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white border-0">
              Scientific Validity
            </Badge>
          </div>
          <p className="text-gray-300 text-sm mb-6">
            This assessment measures five fundamental personality traits: Openness, Conscientiousness, 
            Extraversion, Agreeableness, and Neuroticism (OCEAN). Your results will help you understand 
            how you perceive yourself and identify areas for personal growth.
          </p>
          <Button 
            onClick={startAssessment} 
            className="bg-white text-[#0f172a] gap-2"
            data-testid="button-start-ipip"
          >
            <Play className="w-4 h-4" />
            Start Assessment
          </Button>
        </CardContent>
      </Card>

      {resultsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#0f172a]">Previous Results</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((result: Record<string, unknown>) => (
              <Card key={result.id as string} className="bg-white border-[#0f172a]/10" data-testid={`card-result-${result.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0f172a]/5 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-[#0f172a]" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-[#0f172a]">
                          {result.assessment_type as string}
                        </CardTitle>
                        <CardDescription className="text-sm mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(result.completed_at as string).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-0">
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
                        <div key={trait} className="p-2 bg-[#0f172a]/5 rounded-md">
                          <div className="text-xs text-gray-500">{trait}</div>
                          <div className="text-sm font-semibold text-[#0f172a]">
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
        </div>
      ) : null}
    </div>
  );
}
