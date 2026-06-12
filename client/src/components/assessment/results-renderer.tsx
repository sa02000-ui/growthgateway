import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { AssessmentResult, TraitScore } from '../../../../shared/scoring-engine';
import { getAssessmentVisualizationType } from '../../../../shared/scoring-engine';
import { Info } from 'lucide-react';
import { ResultsDisclaimer, SupportiveResources } from './care-notices';

// Detect when a state-based result falls into a potentially distressing range,
// so we can surface supportive framing and resources.
function isDistressRange(result: AssessmentResult): boolean {
  const score = result.traitScores[0]?.score ?? 0;
  switch (result.slug) {
    case 'pss-10':
      return score > 50; // High / Very High perceived stress
    case 'swls-5':
      return score * 5 < 15; // Dissatisfied or worse
    case 'flourishing-8':
      return score * 8 < 32; // Low flourishing
    case 'brs-6':
      return score < 25; // Low resilience
    default:
      return false;
  }
}

interface ResultsRendererProps {
  result: AssessmentResult;
  assessmentName?: string;
  assessmentDescription?: string;
}

export function ResultsRenderer({ result, assessmentName, assessmentDescription }: ResultsRendererProps) {
  const visualizationType = getAssessmentVisualizationType(result.slug);

  return (
    <div className="space-y-6">
      {assessmentName && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground" data-testid="text-assessment-title">{assessmentName}</h2>
          {assessmentDescription && (
            <p className="text-muted-foreground mt-2">{assessmentDescription}</p>
          )}
        </div>
      )}

      {visualizationType === 'bar' && <BarChartVisualization traitScores={result.traitScores} />}
      {visualizationType === 'radar' && <RadarChartVisualization traitScores={result.traitScores} />}
      {visualizationType === 'hexagon' && <HexagonChartVisualization traitScores={result.traitScores} />}
      {visualizationType === 'gauge' && <GaugeVisualization result={result} />}
      {visualizationType === 'danger_meter' && <DangerMeterVisualization traitScores={result.traitScores} />}
      {visualizationType === 'stress_gauge' && <StressGaugeVisualization traitScores={result.traitScores} />}
      {visualizationType === 'scorecard' && <ScorecardVisualization result={result} />}
      {visualizationType === 'battery' && <BatteryVisualization traitScores={result.traitScores} />}

      {result.facetScores && result.facetScores.length > 0 && (
        <FacetScoresCard facetScores={result.facetScores} />
      )}

      {isDistressRange(result) && <SupportiveResources />}

      <ResultsDisclaimer />
    </div>
  );
}

function BarChartVisualization({ traitScores }: { traitScores: TraitScore[] }) {
  const chartData = useMemo(() => 
    traitScores.map(trait => ({
      name: trait.key,
      fullName: trait.name,
      score: trait.score,
      fill: trait.color || 'hsl(var(--primary))',
      interpretation: trait.interpretation,
    })),
    [traitScores]
  );

  return (
    <Card data-testid="card-bar-chart">
      <CardHeader>
        <CardTitle>Your Trait Profile</CardTitle>
        <CardDescription>Scores range from 0 (low) to 100 (high)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" width={40} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 space-y-3">
          {traitScores.map((trait) => (
            <div key={trait.key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: trait.color || 'hsl(var(--primary))' }}
                />
                <span className="font-medium truncate" data-testid={`text-trait-${trait.key}`}>{trait.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg font-semibold">{Math.round(trait.score)}%</span>
                {trait.interpretation && (
                  <Badge variant="outline" className="text-xs">{trait.interpretation}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RadarChartVisualization({ traitScores }: { traitScores: TraitScore[] }) {
  const chartData = useMemo(() => 
    traitScores.map(trait => ({
      subject: trait.key,
      fullName: trait.name,
      A: trait.score,
      fullMark: 100,
    })),
    [traitScores]
  );

  return (
    <Card data-testid="card-radar-chart">
      <CardHeader>
        <CardTitle>Values Profile</CardTitle>
        <CardDescription>Your relative priorities across different value dimensions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Radar
                name="Your Values"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {traitScores.map((trait) => (
            <div key={trait.key} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <span className="font-medium text-sm">{trait.key}</span>
              <span className="text-muted-foreground text-xs">- {trait.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HexagonChartVisualization({ traitScores }: { traitScores: TraitScore[] }) {
  const chartData = useMemo(() => 
    traitScores.map(trait => ({
      subject: trait.key,
      fullName: trait.name,
      A: trait.score,
      fullMark: 100,
      color: trait.color,
    })),
    [traitScores]
  );

  const topThree = useMemo(() => 
    [...traitScores].sort((a, b) => b.score - a.score).slice(0, 3),
    [traitScores]
  );

  return (
    <Card data-testid="card-hexagon-chart">
      <CardHeader>
        <CardTitle>Career Interest Profile (RIASEC)</CardTitle>
        <CardDescription>Your Holland Code: {topThree.map(t => t.key).join('')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 500 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Radar
                name="Your Interests"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.35}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Your Top Interests:</h4>
          {topThree.map((trait, index) => (
            <div key={trait.key} className="flex items-center gap-3">
              <Badge variant="secondary" className="min-w-[24px] justify-center">{index + 1}</Badge>
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: trait.color || 'hsl(var(--primary))' }}
              />
              <span className="font-medium">{trait.name}</span>
              <span className="text-muted-foreground ml-auto">{Math.round(trait.score)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GaugeVisualization({ result }: { result: AssessmentResult }) {
  const mainTrait = result.traitScores[0];
  const percentile = mainTrait?.percentile || 50;
  const score = result.percentageScore || mainTrait?.score || 0;

  const getGaugeColor = (percentile: number) => {
    if (percentile >= 75) return 'bg-green-500';
    if (percentile >= 50) return 'bg-blue-500';
    if (percentile >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card data-testid="card-gauge">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Cognitive Ability Score
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              Your score represents the percentage of questions answered correctly, converted to a population percentile.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Based on {result.totalScore || 0} correct answers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-24 overflow-hidden">
            <div className="absolute inset-0 flex items-end justify-center">
              <div className="relative w-48 h-48 rounded-full border-8 border-muted overflow-hidden">
                <div 
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ${getGaugeColor(percentile)}`}
                  style={{ height: `${percentile}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold">{Math.round(score)}%</div>
            <div className="text-muted-foreground text-sm">Accuracy</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Percentile Rank</span>
            <Badge variant="outline" className="text-lg px-3">{percentile}th</Badge>
          </div>
          <Progress value={percentile} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>25th</span>
            <span>50th</span>
            <span>75th</span>
            <span>100</span>
          </div>
        </div>

        {mainTrait?.interpretation && (
          <div className="p-4 rounded-md bg-muted/50 text-center">
            <span className="font-medium">{mainTrait.interpretation}</span>
            <p className="text-sm text-muted-foreground mt-1">
              You performed better than {percentile}% of the population.
            </p>
          </div>
        )}

        {result.categoryScores && Object.keys(result.categoryScores).length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-medium text-sm">Score Breakdown:</h4>
            {Object.entries(result.categoryScores).map(([category, catScore]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                <span className="text-sm font-medium">{Math.round(catScore)}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DangerMeterVisualization({ traitScores }: { traitScores: TraitScore[] }) {
  const getTraitLevel = (normalizedScore: number) => {
    if (normalizedScore >= 70) return { level: 'High', color: 'bg-red-500', textColor: 'text-red-500' };
    if (normalizedScore >= 40) return { level: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-500' };
  };

  return (
    <Card data-testid="card-danger-meter">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dark Triad Profile
          <Tooltip>
            <TooltipTrigger data-testid="button-danger-info">
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              These traits are normal personality dimensions. Everyone has them to some degree. High scores are common in leadership roles.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Normalized scores (0-100 scale)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {traitScores.map((trait) => {
          const maxScore = trait.maxScore || 5;
          const normalizedScore = maxScore <= 5 ? ((trait.score - 1) / (maxScore - 1)) * 100 : trait.score;
          const { level, color, textColor } = getTraitLevel(normalizedScore);
          const percentage = Math.max(0, Math.min(100, normalizedScore));

          return (
            <div key={trait.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: trait.color || 'hsl(var(--primary))' }}
                  />
                  <span className="font-medium" data-testid={`text-dark-trait-${trait.key}`}>{trait.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{trait.score.toFixed(1)}</span>
                  <Badge variant="outline" className={`${textColor} border-current`}>{level}</Badge>
                </div>
              </div>
              <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/3 bg-green-500/20" />
                  <div className="w-1/3 bg-yellow-500/20" />
                  <div className="w-1/3 bg-red-500/20" />
                </div>
                <div 
                  className={`absolute h-full ${color} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.max(5, Math.min(100, percentage))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function FacetScoresCard({ facetScores }: { facetScores: TraitScore[] }) {
  return (
    <Card data-testid="card-facet-scores">
      <CardHeader>
        <CardTitle>Detailed Facet Scores</CardTitle>
        <CardDescription>Breakdown of subscales for each major trait</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {facetScores.map((facet) => (
            <div key={facet.key} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <span className="text-sm">{facet.name}</span>
              <div className="flex items-center gap-2">
                <Progress value={facet.score} className="w-16 h-2" />
                <span className="text-sm font-medium w-10 text-right">{Math.round(facet.score)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StressGaugeVisualization({ traitScores }: { traitScores: TraitScore[] }) {
  const stressScore = traitScores[0]?.score || 0;
  
  const getStressLevel = (score: number) => {
    if (score <= 25) return { level: 'Low Stress', color: 'bg-green-500', description: 'You are managing stress well.' };
    if (score <= 50) return { level: 'Moderate Stress', color: 'bg-yellow-500', description: 'Some stress present, but manageable.' };
    if (score <= 75) return { level: 'High Stress', color: 'bg-orange-500', description: 'Consider stress reduction strategies.' };
    return { level: 'Very High Stress', color: 'bg-red-500', description: 'Significant stress levels detected.' };
  };
  
  const { level, color, description } = getStressLevel(stressScore);
  
  return (
    <Card data-testid="card-stress-gauge">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Perceived Stress Level
          <Tooltip>
            <TooltipTrigger data-testid="button-stress-info">
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              Higher scores indicate greater perceived stress. This measures how unpredictable and overloaded you find your life.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Based on your responses over the past month</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-24 overflow-hidden">
            <div className="absolute inset-0 flex items-end justify-center">
              <div className="relative w-48 h-48 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, hsl(142, 71%, 45%), hsl(48, 96%, 53%), hsl(25, 95%, 53%), hsl(0, 72%, 51%))' }}>
                <div className="absolute inset-2 rounded-full bg-card" />
                <div 
                  className="absolute w-1 h-20 bg-foreground origin-bottom left-1/2 -translate-x-1/2 bottom-1/2 transition-transform duration-1000"
                  style={{ transform: `translateX(-50%) rotate(${(stressScore / 100) * 180 - 90}deg)` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold" data-testid="text-stress-score">{Math.round(stressScore)}%</div>
            <Badge variant="outline" className="mt-2">{level}</Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="relative h-6 w-full rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="w-1/4 bg-green-500" />
              <div className="w-1/4 bg-yellow-500" />
              <div className="w-1/4 bg-orange-500" />
              <div className="w-1/4 bg-red-500" />
            </div>
            <div 
              className="absolute top-0 bottom-0 w-1 bg-foreground"
              style={{ left: `${Math.min(99, stressScore)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
            <span>Very High</span>
          </div>
        </div>
        
        <div className="p-4 rounded-md bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScorecardVisualization({ result }: { result: AssessmentResult }) {
  const mainTrait = result.traitScores[0];
  const score = mainTrait?.score || 0;
  const maxScore = mainTrait?.maxScore || 7;
  const traitName = mainTrait?.name || 'Score';
  
  const getSWLSInterpretation = (score: number) => {
    const totalScore = score * 5;
    if (totalScore >= 31) return { level: 'Extremely Satisfied', emoji: 'Very high life satisfaction' };
    if (totalScore >= 26) return { level: 'Satisfied', emoji: 'High life satisfaction' };
    if (totalScore >= 21) return { level: 'Slightly Satisfied', emoji: 'Above average satisfaction' };
    if (totalScore >= 20) return { level: 'Neutral', emoji: 'Neither satisfied nor dissatisfied' };
    if (totalScore >= 15) return { level: 'Slightly Dissatisfied', emoji: 'Below average satisfaction' };
    if (totalScore >= 10) return { level: 'Dissatisfied', emoji: 'Low life satisfaction' };
    return { level: 'Extremely Dissatisfied', emoji: 'Very low life satisfaction' };
  };
  
  const getFlourishingInterpretation = (score: number) => {
    const totalScore = score * 8;
    if (totalScore >= 48) return { level: 'High Flourishing', emoji: 'Strong psychological well-being' };
    if (totalScore >= 40) return { level: 'Good Flourishing', emoji: 'Good psychological resources' };
    if (totalScore >= 32) return { level: 'Moderate Flourishing', emoji: 'Average well-being' };
    return { level: 'Low Flourishing', emoji: 'Consider well-being strategies' };
  };
  
  const isSWLS = result.slug === 'swls-5';
  const interpretation = isSWLS ? getSWLSInterpretation(score) : getFlourishingInterpretation(score);
  const displayScore = Math.round(score * (isSWLS ? 5 : 8));
  const displayMax = isSWLS ? 35 : 56;
  
  return (
    <Card data-testid="card-scorecard">
      <CardHeader className="text-center">
        <CardTitle>{traitName}</CardTitle>
        <CardDescription>{isSWLS ? 'Satisfaction With Life Scale' : 'Flourishing Scale'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-primary/20">
            <div className="text-center">
              <div className="text-3xl font-bold" data-testid="text-scorecard-score">{displayScore}</div>
              <div className="text-sm text-muted-foreground">/{displayMax}</div>
            </div>
          </div>
          <Badge className="mt-4 text-lg px-4 py-1" variant="secondary">{interpretation.level}</Badge>
          <p className="text-sm text-muted-foreground mt-2 text-center">{interpretation.emoji}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Your Score</span>
            <span className="font-medium">{displayScore} / {displayMax}</span>
          </div>
          <Progress value={(displayScore / displayMax) * 100} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}

function BatteryVisualization({ traitScores }: { traitScores: TraitScore[] }) {
  const resilience = traitScores[0]?.score || 0;
  
  const getBatteryLevel = (score: number) => {
    if (score >= 75) return { level: 'High Resilience', bars: 4, color: 'bg-green-500' };
    if (score >= 50) return { level: 'Good Resilience', bars: 3, color: 'bg-blue-500' };
    if (score >= 25) return { level: 'Moderate Resilience', bars: 2, color: 'bg-yellow-500' };
    return { level: 'Low Resilience', bars: 1, color: 'bg-red-500' };
  };
  
  const { level, bars, color } = getBatteryLevel(resilience);
  
  return (
    <Card data-testid="card-battery">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Resilience Level
          <Tooltip>
            <TooltipTrigger data-testid="button-resilience-info">
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              Resilience is the ability to bounce back from stress, adversity, and challenges. Higher scores indicate greater resilience.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Your ability to recover from setbacks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-48">
            <div className="absolute inset-0 border-4 border-foreground/20 rounded-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-foreground/20 rounded-t-md" />
            </div>
            <div className="absolute inset-2 flex flex-col-reverse gap-1 p-1">
              {[1, 2, 3, 4].map((bar) => (
                <div 
                  key={bar}
                  className={`flex-1 rounded-sm transition-all duration-500 ${bar <= bars ? color : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold" data-testid="text-resilience-score">{Math.round(resilience)}%</div>
            <Badge variant="outline" className="mt-2">{level}</Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className={`p-2 rounded ${bars >= 1 ? 'bg-red-500/20' : 'bg-muted'}`}>Low</div>
          <div className={`p-2 rounded ${bars >= 2 ? 'bg-yellow-500/20' : 'bg-muted'}`}>Moderate</div>
          <div className={`p-2 rounded ${bars >= 3 ? 'bg-blue-500/20' : 'bg-muted'}`}>Good</div>
          <div className={`p-2 rounded ${bars >= 4 ? 'bg-green-500/20' : 'bg-muted'}`}>High</div>
        </div>
        
        <div className="p-4 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            {resilience >= 75 ? 'You bounce back quickly from adversity and handle stress well.' :
             resilience >= 50 ? 'You have good coping abilities but may take time to recover from major setbacks.' :
             resilience >= 25 ? 'You may find it challenging to recover from stressful events. Consider building coping strategies.' :
             'Building resilience through support systems and coping strategies may be beneficial.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
