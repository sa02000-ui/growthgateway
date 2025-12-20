import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Target, Calendar, Activity, Minus, Loader2, ClipboardList, Leaf } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { format, differenceInDays } from 'date-fns';

type TraitKey = 'N' | 'E' | 'O' | 'A' | 'C';

interface AssessmentResult {
  id: string;
  user_id: string;
  assessment_type: string;
  scores: Record<TraitKey, number>;
  completed_at: string;
}

const traitNames: Record<TraitKey, string> = {
  N: 'Neuroticism',
  E: 'Extraversion',
  O: 'Openness',
  A: 'Agreeableness',
  C: 'Conscientiousness',
};

const traitColors: Record<TraitKey, string> = {
  N: '#ef4444',
  E: '#3b82f6',
  O: '#8b5cf6',
  A: '#10b981',
  C: '#f59e0b',
};

function filterTo30DayWindows(results: AssessmentResult[]): AssessmentResult[] {
  if (results.length === 0) return [];
  
  const sorted = [...results].sort((a, b) => 
    new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );
  
  const filtered: AssessmentResult[] = [];
  let lastIncludedDate: Date | null = null;
  
  for (const result of sorted) {
    const resultDate = new Date(result.completed_at);
    
    if (!lastIncludedDate || differenceInDays(resultDate, lastIncludedDate) >= 30) {
      filtered.push(result);
      lastIncludedDate = resultDate;
    } else {
      filtered[filtered.length - 1] = result;
    }
  }
  
  return filtered;
}

function calculateComparison(baseline: AssessmentResult, latest: AssessmentResult) {
  const traits: TraitKey[] = ['O', 'C', 'E', 'A', 'N'];
  return traits.map(trait => ({
    trait,
    name: traitNames[trait],
    baseline: Math.round(baseline.scores[trait]),
    latest: Math.round(latest.scores[trait]),
    change: Math.round(latest.scores[trait] - baseline.scores[trait]),
  }));
}

export default function HomeTab() {
  const { user } = useAuth();

  const { data: resultsData, isLoading } = useQuery<{ results: AssessmentResult[] }>({
    queryKey: ['/api/assessment/results', user?.id],
    enabled: !!user?.id,
  });

  const results = resultsData?.results || [];
  const filteredResults = filterTo30DayWindows(results);
  
  const chartData = filteredResults.map(result => ({
    date: format(new Date(result.completed_at), 'MMM d'),
    fullDate: format(new Date(result.completed_at), 'MMM d, yyyy'),
    N: Math.round(result.scores.N),
    E: Math.round(result.scores.E),
    O: Math.round(result.scores.O),
    A: Math.round(result.scores.A),
    C: Math.round(result.scores.C),
  }));

  const sortedByDate = [...results].sort((a, b) => 
    new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );
  const baseline = sortedByDate[0];
  const latest = sortedByDate[sortedByDate.length - 1];
  const hasComparison = baseline && latest && baseline.id !== latest.id;
  const comparison = hasComparison ? calculateComparison(baseline, latest) : null;

  const radarData = latest ? [
    { trait: 'Openness', value: Math.round(latest.scores.O), fullMark: 100 },
    { trait: 'Conscientiousness', value: Math.round(latest.scores.C), fullMark: 100 },
    { trait: 'Extraversion', value: Math.round(latest.scores.E), fullMark: 100 },
    { trait: 'Agreeableness', value: Math.round(latest.scores.A), fullMark: 100 },
    { trait: 'Neuroticism', value: Math.round(latest.scores.N), fullMark: 100 },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-dashboard-title">
            Welcome to GrowthPortal
          </h1>
          <p className="text-muted-foreground mt-1">
            Your journey to self-discovery starts here
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-8 md:p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
              Take Your First Assessment
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Complete the IPIP-NEO-120 personality assessment to discover your Big Five traits 
              and begin tracking your personal growth journey.
            </p>
            <Link href="/dashboard/assessments">
              <Button size="lg" className="gap-2" data-testid="button-take-first-assessment">
                <ClipboardList className="w-4 h-4" />
                Take Your First Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Discover Your Traits</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Learn about your personality across five key dimensions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Track Your Growth</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    See how your traits evolve over time with timeline charts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Compare Progress</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Measure your growth from baseline to current
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Assessments Completed', 
      value: results.length.toString(), 
      icon: Target, 
      change: results.length > 0 ? 'Keep tracking your growth' : 'Take your first assessment'
    },
    { 
      label: 'First Assessment', 
      value: baseline ? format(new Date(baseline.completed_at), 'MMM d, yyyy') : 'N/A', 
      icon: Calendar, 
      change: baseline ? 'Your baseline date' : 'Not yet started'
    },
    { 
      label: 'Latest Assessment', 
      value: latest ? format(new Date(latest.completed_at), 'MMM d, yyyy') : 'N/A', 
      icon: Activity, 
      change: latest ? 'Most recent result' : 'Not yet started'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-dashboard-title">
          Your Growth Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your Big Five personality traits over time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Current Snapshot
            </CardTitle>
            <CardDescription>
              Your latest personality profile
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px]" data-testid="chart-radar">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="trait" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickCount={5}
                  />
                  <Radar
                    name="Your Profile"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Trait Timeline
                </CardTitle>
                <CardDescription>
                  How your traits have evolved
                </CardDescription>
              </div>
              {filteredResults.length > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-data-points">
                  {filteredResults.length} point{filteredResults.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {chartData.length > 1 ? (
              <div className="h-[280px]" data-testid="chart-timeline">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickCount={5}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(_, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullDate;
                        }
                        return '';
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                      formatter={(value) => traitNames[value as TraitKey] || value}
                    />
                    {(['O', 'C', 'E', 'A', 'N'] as TraitKey[]).map((trait) => (
                      <Line
                        key={trait}
                        type="monotone"
                        dataKey={trait}
                        name={trait}
                        stroke={traitColors[trait]}
                        strokeWidth={2}
                        dot={{ fill: traitColors[trait], strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-center">
                <div>
                  <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Take more assessments to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {comparison && (
        <Card className="bg-card border-border" data-testid="card-comparison">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Growth Comparison
              </CardTitle>
              <CardDescription>
                Since {format(new Date(baseline.completed_at), 'MMMM d, yyyy')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {comparison.map((item) => (
                <div 
                  key={item.trait} 
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                  data-testid={`comparison-${item.trait}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: traitColors[item.trait] }}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-bold text-foreground">{item.latest}%</span>
                    {item.change !== 0 ? (
                      <span 
                        className={`text-xs font-medium flex items-center gap-0.5 ${
                          item.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                        data-testid={`change-${item.trait}`}
                      >
                        {item.change > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {item.change > 0 ? '+' : ''}{item.change}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Minus className="w-3 h-3" />
                        0%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseline: {item.baseline}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
