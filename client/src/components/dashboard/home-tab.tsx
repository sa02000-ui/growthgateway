import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Target, Calendar, Activity, Minus, Loader2, ClipboardList, Leaf, Share2, Copy, Check, Users, Bug, Info } from 'lucide-react';
import { apiRequest, queryClient, getAuthHeaders } from '@/lib/queryClient';
import AIInsightCard from './ai-insight-card';
import { 
  LineChart, 
  Line, 
  Area,
  ComposedChart,
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
  Radar,
  ReferenceLine
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { format, differenceInDays } from 'date-fns';
import type { AssessmentScores } from '@shared/schema';
import {
  assessChange,
  standardErrorOfMeasurement,
  classifyAssessment,
  isOneTimeAssessment,
  BIG_FIVE_PSYCHOMETRICS,
} from '@shared/reliable-change';

type TraitKey = 'N' | 'E' | 'O' | 'A' | 'C';

interface AssessmentResult {
  id: string;
  user_id: string;
  assessment_type: string;
  scores: AssessmentScores;
  completed_at: string;
}

interface PeerFeedbackResponse {
  feedback: Array<{
    id: string;
    target_user_id: string;
    scores: Record<TraitKey, number>;
    peer_name: string | null;
    is_anonymous: string;
    created_at: string;
  }>;
  count: number;
  averageScores: Record<TraitKey, number> | null;
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
  return traits.map(trait => {
    const baseScore = baseline?.scores?.[trait] || 0;
    const lateScore = latest?.scores?.[trait] || 0;
    const rawChange = lateScore - baseScore;
    const { alpha, sd } = BIG_FIVE_PSYCHOMETRICS[trait];
    const { rci, meaningful } = assessChange(rawChange, sd, alpha);
    return {
      trait,
      name: traitNames[trait],
      baseline: Math.round(baseScore),
      latest: Math.round(lateScore),
      change: Math.round(rawChange),
      rci: rci !== null ? Math.round(rci) : null,
      meaningful,
    };
  });
}

// Standard error of measurement for a given trend series, used to draw a
// ±1 SEM confidence band so users don't over-interpret small wiggles.
function semForKey(selectedTimeline: string, key: string): number | null {
  if (selectedTimeline === 'Big Five') {
    const p = BIG_FIVE_PSYCHOMETRICS[key as TraitKey];
    return p ? standardErrorOfMeasurement(p.sd, p.alpha) : null;
  }
  const c = classifyAssessment(selectedTimeline);
  if (c?.sd != null && c?.cronbachAlpha != null) {
    return standardErrorOfMeasurement(c.sd, c.cronbachAlpha);
  }
  return null;
}

export default function HomeTab() {
  const { user, supabase } = useAuth();
  const isAdmin = user?.user_metadata?.is_admin === true;
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [peerCount, setPeerCount] = useState(0);
  const [peerAverages, setPeerAverages] = useState<Record<TraitKey, number> | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<string>('Big Five');
  const [lifeEvents, setLifeEvents] = useState<{ event_type: string; year: number; significance: number }[]>([]);

  // Fetch assessment results directly from Supabase with user's auth
  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !supabase) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch assessment results
        const { data: resultsData, error: resultsError } = await supabase
          .from('results_log')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error('Error fetching results:', resultsError);
        } else if (resultsData) {
          // Map database format to component format
          const mappedResults: AssessmentResult[] = resultsData.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            assessment_type: row.assessment_type,
            completed_at: row.completed_at,
            scores: row.scores || {
              N: row.neuroticism_score || 0,
              E: row.extraversion_score || 0,
              O: row.openness_score || 0,
              A: row.agreeableness_score || 0,
              C: row.conscientiousness_score || 0,
            },
          }));
          setResults(mappedResults);
        }

        // Fetch peer feedback (if table exists)
        try {
          const { data: peerData, error: peerError } = await supabase
            .from('peer_feedback')
            .select('*')
            .eq('target_user_id', user.id);

          // Big Five radar uses only big-five rows; 360 rows carry
          // competency-keyed scores that would pollute NEOAC averages.
          const bigFivePeers = (peerData || []).filter(
            (fb: any) => (fb.instrument ?? 'big-five') !== 'peer-360'
          );
          if (!peerError && bigFivePeers.length > 0) {
            setPeerCount(bigFivePeers.length);
            // Calculate averages
            const traits: TraitKey[] = ['N', 'E', 'O', 'A', 'C'];
            const averages: Record<TraitKey, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 };
            for (const trait of traits) {
              const sum = bigFivePeers.reduce((acc: number, fb: any) => acc + (fb.scores?.[trait] || 0), 0);
              averages[trait] = sum / bigFivePeers.length;
            }
            setPeerAverages(averages);
          }
        } catch (peerErr) {
          console.log('Peer feedback table may not exist yet');
        }

        // Fetch logged life events (Replit Postgres via profile API) for journey overlays
        try {
          const profileRes = await fetch(`/api/profile/${user.id}`, { headers: await getAuthHeaders() });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (Array.isArray(profileData.lifeEvents)) {
              setLifeEvents(
                profileData.lifeEvents
                  .filter((e: any) => e.event_type && e.year)
                  .map((e: any) => ({
                    event_type: String(e.event_type),
                    year: Number(e.year),
                    significance: Number(e.significance) || 5,
                  }))
              );
            }
          }
        } catch (lifeErr) {
          console.log('Life events not available');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user?.id, supabase]);

  const bigFiveNames = ['IPIP-NEO-120', 'Big Five Personality Assessment'];
  const allAssessmentTypes = Array.from(new Set(results.map(r => r.assessment_type)));
  // One-time measures (e.g. ICAR cognitive ability) are excluded from trend views:
  // retaking them mainly captures item memory, not real change.
  const trendableTypes = allAssessmentTypes.filter(a => !isOneTimeAssessment(a));
  const dropdownOptions = ['Big Five', ...trendableTypes.filter(a => !bigFiveNames.includes(a))];

  const bigFiveResults = results.filter(r => bigFiveNames.includes(r.assessment_type));
  const sortedBigFive = [...bigFiveResults].sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
  const baseline = sortedBigFive[0];
  const latest = sortedBigFive[sortedBigFive.length - 1];
  const hasComparison = baseline && latest && baseline.id !== latest.id;
  const comparison = hasComparison ? calculateComparison(baseline, latest) : null;

  const timelineRawResults = selectedTimeline === 'Big Five'
    ? bigFiveResults
    : results.filter(r => r.assessment_type === selectedTimeline);
  const filteredTimelineResults = filterTo30DayWindows(timelineRawResults);
  const hiddenSameMonthCount = timelineRawResults.length - filteredTimelineResults.length;
  const dataKeys = selectedTimeline === 'Big Five'
    ? ['O', 'C', 'E', 'A', 'N']
    : Object.keys(filteredTimelineResults[0]?.scores || {});
  const hasConfidenceBand = dataKeys.some(key => semForKey(selectedTimeline, key) != null);
  const chartData = filteredTimelineResults.map(result => {
    const point: any = {
      date: format(new Date(result.completed_at), 'MMM d'),
      fullDate: format(new Date(result.completed_at), 'MMM d, yyyy'),
      ts: new Date(result.completed_at).getTime(),
    };
    const scores = result.scores || {};
    dataKeys.forEach(key => {
      const value = Math.round((scores as Record<string, number>)[key] || 0);
      point[key] = value;
      const sem = semForKey(selectedTimeline, key);
      if (sem != null) {
        point[`${key}_band`] = [
          Math.max(0, Math.round(value - sem)),
          Math.min(100, Math.round(value + sem)),
        ];
      }
    });
    return point;
  });
  const dynamicColors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#0d9488'];

  // Life events logged with year granularity are placed mid-year and only drawn
  // when they fall inside the visible date range of the current trend series.
  const timelineMinTs = chartData.length ? chartData[0].ts : 0;
  const timelineMaxTs = chartData.length ? chartData[chartData.length - 1].ts : 0;
  const timelineEvents = chartData.length > 1
    ? lifeEvents
        .map(e => ({ ...e, ts: new Date(e.year, 6, 1).getTime() }))
        .filter(e => e.ts >= timelineMinTs && e.ts <= timelineMaxTs)
    : [];

  // Phase 2: "What changed, and is it meaningful?" — RCI-gated trait + state shifts.
  const stateChanges = allAssessmentTypes
    .filter(t => classifyAssessment(t)?.measurementClass === 'state')
    .map(type => {
      const series = filterTo30DayWindows(results.filter(r => r.assessment_type === type));
      if (series.length < 2) return null;
      const repr = (r: AssessmentResult) => {
        const vals = Object.values(r.scores || {}).filter(v => typeof v === 'number') as number[];
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      };
      const change = Math.round(repr(series[series.length - 1]) - repr(series[0]));
      const c = classifyAssessment(type);
      const { meaningful } = assessChange(change, c?.sd, c?.cronbachAlpha);
      return { label: type, change, meaningful };
    })
    .filter((x): x is { label: string; change: number; meaningful: boolean | null } => x !== null);

  const meaningfulTraitChanges = (comparison || []).filter(c => c.meaningful === true);
  const meaningfulStateChanges = stateChanges.filter(c => c.meaningful === true);
  const totalMeaningful = meaningfulTraitChanges.length + meaningfulStateChanges.length;
  const hasRetestData = !!comparison || stateChanges.length > 0;

  const radarData = latest && latest.scores && latest.scores.O !== undefined ? [
    { trait: 'Openness', self: Math.round(latest.scores.O), peer: peerAverages ? Math.round(peerAverages.O) : null, fullMark: 100 },
    { trait: 'Conscientiousness', self: Math.round(latest.scores.C), peer: peerAverages ? Math.round(peerAverages.C) : null, fullMark: 100 },
    { trait: 'Extraversion', self: Math.round(latest.scores.E), peer: peerAverages ? Math.round(peerAverages.E) : null, fullMark: 100 },
    { trait: 'Agreeableness', self: Math.round(latest.scores.A), peer: peerAverages ? Math.round(peerAverages.A) : null, fullMark: 100 },
    { trait: 'Neuroticism', self: Math.round(latest.scores.N), peer: peerAverages ? Math.round(peerAverages.N) : null, fullMark: 100 },
  ] : [];

  const [feedbackToken, setFeedbackToken] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchToken() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/my-feedback-token/${user.id}`, { headers: await getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setFeedbackToken(data.token);
        }
      } catch (err) {
        console.log('Failed to fetch feedback token');
      }
    }
    fetchToken();
  }, [user?.id]);

  // Never expose the raw user id in a shareable link — wait until the
  // privacy-preserving token has loaded before showing/enabling the link.
  const feedbackUrl = feedbackToken 
    ? `${window.location.origin}/feedback/${feedbackToken}` 
    : '';

  const copyLink = async () => {
    try {
      if (!feedbackUrl) return;
      await navigator.clipboard.writeText(feedbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link. Please copy manually: ' + feedbackUrl);
    }
  };

  const [injecting, setInjecting] = useState(false);

  const { session } = useAuth();

  const injectTestData = async () => {
    if (!user?.id || !session?.access_token) {
      alert('You must be logged in to inject test data');
      return;
    }
    setInjecting(true);
    try {
      const response = await apiRequest('POST', '/api/debug/inject-test-data', { 
        userId: user.id,
        accessToken: session.access_token
      });
      const data = await response.json();
      if (data.success) {
        alert('Test data injected! Scores: O:80, C:40, E:70, A:60, N:30');
        queryClient.invalidateQueries({ queryKey: ['/api/assessment/results', user.id] });
      } else {
        alert('Error: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to inject test data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setInjecting(false);
    }
  };

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-dashboard-title">
              Welcome to GrowthPortal
            </h1>
            <p className="text-muted-foreground mt-1">
              Your journey to self-discovery starts here
            </p>
          </div>
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={injectTestData}
              disabled={injecting}
              className="gap-2 text-xs"
              data-testid="button-debug-inject-empty"
            >
              <Bug className="w-3 h-3" />
              {injecting ? 'Injecting...' : 'Debug: Inject Test Data'}
            </Button>
          )}
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
            <Link href="/dashboard/explore">
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
      label: 'Peer Feedback', 
      value: peerCount.toString(), 
      icon: Users, 
      change: peerCount > 0 ? `${peerCount} response${peerCount !== 1 ? 's' : ''} received` : 'Invite peers for feedback'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-dashboard-title">
            Personal Growth Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your Big Five personality traits over time
          </p>
        </div>
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={injectTestData}
            disabled={injecting}
            className="gap-2 text-xs"
            data-testid="button-debug-inject"
          >
            <Bug className="w-3 h-3" />
            {injecting ? 'Injecting...' : 'Debug: Inject Test Data'}
          </Button>
        )}
      </div>

      {/* Phase 2: top "What changed, and is it meaningful?" RCI-gated summary */}
      <Card className="bg-card border-border" data-testid="card-what-changed">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            What changed, and is it meaningful?
          </CardTitle>
          <CardDescription>
            We only flag shifts large enough to exceed the measurement margin — smaller wiggles are likely noise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasRetestData ? (
            <p className="text-sm text-muted-foreground" data-testid="text-what-changed-empty">
              Take an assessment a second time to see what's changed. We'll compare it against your baseline and tell you whether any movement is real.
            </p>
          ) : totalMeaningful === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-what-changed-stable">
              Nothing has moved beyond the measurement margin since your baseline — your results are stable.
            </p>
          ) : (
            <div className="space-y-3" data-testid="list-what-changed">
              <div className="flex flex-wrap gap-2">
                {meaningfulTraitChanges.map((item) => (
                  <Badge
                    key={`trait-${item.trait}`}
                    variant="secondary"
                    className="gap-1 text-xs"
                    data-testid={`badge-changed-${item.trait}`}
                  >
                    {item.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {item.name} {item.change > 0 ? '+' : ''}{item.change}
                  </Badge>
                ))}
                {meaningfulStateChanges.map((item) => (
                  <Badge
                    key={`state-${item.label}`}
                    variant="secondary"
                    className="gap-1 text-xs"
                    data-testid={`badge-changed-state-${item.label}`}
                  >
                    {item.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {item.label} {item.change > 0 ? '+' : ''}{item.change}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalMeaningful} meaningful shift{totalMeaningful !== 1 ? 's' : ''} detected. Everything else has held steady within the measurement margin.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* AI Insight Card */}
      <AIInsightCard />

      {/* Invite Peers Section */}
      <Card className="bg-card border-border" data-testid="card-invite-peers">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Invite Peers
              </CardTitle>
              <CardDescription>
                Get feedback from friends, family, or colleagues to see how others perceive you
              </CardDescription>
            </div>
            {peerCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {peerCount} response{peerCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-muted/50 rounded-md px-4 py-2.5 text-sm text-muted-foreground truncate border border-border">
              {feedbackUrl || 'Generating your secure link…'}
            </div>
            <Button 
              onClick={copyLink}
              disabled={!feedbackUrl}
              className="gap-2 flex-shrink-0"
              data-testid="button-copy-link"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Share this link with people who know you well. They can provide anonymous feedback on how they perceive your personality.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" data-testid="section-your-profile">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Your Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">A snapshot of your stable traits as they stand today.</p>
        </div>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Perspective Alignment
            </CardTitle>
            <CardDescription>
              Compare your self-perception with how your network experiences you
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px]" data-testid="chart-radar">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="trait" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    tickCount={5}
                  />
                  <Radar
                    name="My Perception (Self)"
                    dataKey="self"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  {peerAverages && (
                    <Radar
                      name="Network Perspective (Peers)"
                      dataKey="peer"
                      stroke="hsl(var(--chart-2))"
                      fill="transparent"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                    />
                  )}
                  <Legend 
                    wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-md p-3 shadow-md text-sm" data-testid="tooltip-radar" role="tooltip" aria-label={`${data.trait} scores`}>
                            <p className="font-medium text-foreground mb-2">{data.trait}</p>
                            <p className="text-muted-foreground" data-testid="tooltip-self-score">
                              <span className="inline-block w-3 h-3 rounded-full bg-primary mr-2" aria-hidden="true"></span>
                              My Perception: <span className="font-medium text-foreground">{data.self}%</span>
                            </p>
                            {data.peer !== null && (
                              <p className="text-muted-foreground mt-1" data-testid="tooltip-peer-score">
                                <span className="inline-block w-3 h-3 rounded-full border-2 border-[hsl(var(--chart-2))] mr-2" aria-hidden="true"></span>
                                Network View: <span className="font-medium text-foreground">{data.peer}%</span>
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {!peerAverages && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Invite peers to see how your self-perception aligns with their perspective
              </p>
            )}
            {peerAverages && (
              <div className="mt-3 p-3 bg-muted/30 rounded-md border border-border" data-testid="text-chart-legend">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How to read this chart:</strong> The solid shape represents how you see yourself. 
                  The dashed outline shows the average of how your peers perceive you. 
                  Areas where these shapes align indicate consistent self-awareness.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" data-testid="section-your-journey">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Your Journey</h2>
          <p className="text-sm text-muted-foreground mt-1">How your traits and states have moved over time. Life events you've logged appear as vertical markers.</p>
        </div>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Trait &amp; State Timeline
                </CardTitle>
                <CardDescription>How your traits and states have evolved</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedTimeline} onValueChange={setSelectedTimeline}>
                  <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-timeline-assessment">
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredTimelineResults.length > 0 && (
                  <Badge variant="secondary" className="text-xs" data-testid="badge-data-points">
                    {filteredTimelineResults.length} point{filteredTimelineResults.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {chartData.length > 1 ? (
              <>
              <div className="h-[280px]" data-testid="chart-timeline">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="ts" 
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      ticks={chartData.map(d => d.ts)}
                      tickFormatter={(v) => format(new Date(v), 'MMM d')}
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
                    {dataKeys.map((key, index) => {
                      const strokeColor = selectedTimeline === 'Big Five' ? traitColors[key as TraitKey] : dynamicColors[index % dynamicColors.length];
                      return (
                        <Area
                          key={`${key}_band`}
                          type="monotone"
                          dataKey={`${key}_band`}
                          stroke="none"
                          fill={strokeColor}
                          fillOpacity={0.1}
                          legendType="none"
                          tooltipType="none"
                          activeDot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      );
                    })}
                    {dataKeys.map((key, index) => {
                      const strokeColor = selectedTimeline === 'Big Five' ? traitColors[key as TraitKey] : dynamicColors[index % dynamicColors.length];
                      const lineName = selectedTimeline === 'Big Five' ? traitNames[key as TraitKey] : key;
                      return (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={lineName}
                          stroke={strokeColor}
                          strokeWidth={2}
                          dot={{ fill: strokeColor, strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      );
                    })}
                    {timelineEvents.map((event, i) => (
                      <ReferenceLine
                        key={`event-${event.event_type}-${event.year}-${i}`}
                        x={event.ts}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        label={{
                          value: event.event_type,
                          position: 'insideTopRight',
                          fill: 'hsl(var(--muted-foreground))',
                          fontSize: 10,
                        }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {(hasConfidenceBand || hiddenSameMonthCount > 0) && (
                <div className="mt-3 space-y-1" data-testid="text-timeline-notes">
                  {hasConfidenceBand && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      The shaded band is the measurement margin (±1 standard error). Movement inside the band is likely noise, not real change.
                    </p>
                  )}
                  {hiddenSameMonthCount > 0 && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5" data-testid="text-dedup-note">
                      <Calendar className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Showing your most recent result per month ({hiddenSameMonthCount} earlier same-month result{hiddenSameMonthCount !== 1 ? 's' : ''} hidden).
                    </p>
                  )}
                </div>
              )}
              </>
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
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-4" data-testid="text-comparison-note">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Only changes large enough to exceed the measurement margin are marked as meaningful. Smaller shifts are likely measurement noise, not real change.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {comparison.map((item) => {
                const isMeaningful = item.meaningful === true;
                return (
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
                          isMeaningful
                            ? (item.change > 0 ? 'text-green-600' : 'text-red-600')
                            : 'text-muted-foreground'
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
                  {item.change !== 0 && (
                    <p
                      className={`text-[11px] font-medium mt-1.5 ${isMeaningful ? 'text-primary' : 'text-muted-foreground'}`}
                      data-testid={`meaningful-${item.trait}`}
                    >
                      {isMeaningful ? 'Meaningful change' : 'Within measurement noise'}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      </section>
    </div>
  );
}
