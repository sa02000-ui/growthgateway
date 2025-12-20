import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Calendar, Activity, Minus, Loader2 } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend, 
  ResponsiveContainer 
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight" data-testid="text-dashboard-title">
          Your Growth Timeline
        </h1>
        <p className="text-gray-500 mt-1">
          Track your Big Five personality traits over time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white border-[#0f172a]/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#0f172a] mt-1" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#0f172a]/5 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-[#0f172a]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-[#0f172a]/10">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Trait Timeline
              </CardTitle>
              <CardDescription className="mt-1">
                Your Big Five personality scores over time
              </CardDescription>
            </div>
            {filteredResults.length > 0 && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-data-points">
                {filteredResults.length} data point{filteredResults.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length > 0 ? (
            <div className="h-[300px] md:h-[400px]" data-testid="chart-timeline">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickCount={6}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullDate;
                      }
                      return '';
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
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
                      dot={{ fill: traitColors[trait], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-center">
              <div>
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No assessment data yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete your first IPIP-NEO-120 assessment to see your timeline
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {comparison && (
        <Card className="bg-white border-[#0f172a]/10" data-testid="card-comparison">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Growth Comparison
              </CardTitle>
              <CardDescription className="mt-1">
                Since {format(new Date(baseline.completed_at), 'MMMM d, yyyy')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {comparison.map((item) => (
                <div 
                  key={item.trait} 
                  className="p-4 rounded-lg bg-[#0f172a]/5 border border-[#0f172a]/10"
                  data-testid={`comparison-${item.trait}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">{item.name}</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: traitColors[item.trait] }}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-[#0f172a]">{item.latest}%</span>
                    {item.change !== 0 ? (
                      <span 
                        className={`text-sm font-medium flex items-center gap-0.5 ${
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
                      <span className="text-sm text-gray-400 flex items-center gap-0.5">
                        <Minus className="w-3 h-3" />
                        No change
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
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
