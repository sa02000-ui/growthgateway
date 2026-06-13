import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Users, Copy, CheckCircle2, Clock, Shield, Eye, EyeOff, Loader2, Mail, Plus, X, ArrowLeft, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { getAuthHeaders } from '@/lib/queryClient';
import {
  selfMiniQuestions,
  calculateSelfMiniScores,
  likertScale,
  traitNames,
  relationshipOptions,
  relationshipLabels,
  relationshipValues,
  type RelationshipValue,
} from '@shared/peer-feedback-questions';
import { PEER_360_INSTRUMENT, peer360CompetencyNames } from '@shared/assessments/category-five-seed';

const PRIVACY_THRESHOLD = 3;
const BIG_FIVE_TRAITS = ['N', 'E', 'O', 'A', 'C'] as const;
type Instrument = 'big-five' | 'peer-360';

interface PeerFeedbackItem {
  id: string;
  target_user_id: string;
  scores: Record<string, number>;
  peer_name: string | null;
  is_anonymous: string;
  created_at: string;
  relationship: RelationshipValue | null;
  instrument: Instrument | null;
}

function averageScores(rows: PeerFeedbackItem[], keys: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of keys) {
    const vals = rows.map((r) => r.scores?.[key]).filter((v): v is number => typeof v === 'number');
    out[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  return out;
}

export default function PeerFeedbackTab() {
  const { toast } = useToast();
  const { user, supabase } = useAuth();
  const [feedbackList, setFeedbackList] = useState<PeerFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [feedbackToken, setFeedbackToken] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>(['']);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteInstrument, setInviteInstrument] = useState<Instrument>('big-five');
  const [sendingInvites, setSendingInvites] = useState(false);

  const [selfBigFive, setSelfBigFive] = useState<Record<string, number> | null>(null);
  const [matchedSelf, setMatchedSelf] = useState<Record<string, number> | null>(null);

  const [showSelfMiniModal, setShowSelfMiniModal] = useState(false);
  const [miniResponses, setMiniResponses] = useState<Record<string, number>>({});
  const [miniPage, setMiniPage] = useState(0);
  const miniPerPage = 10;

  const userName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Someone';
  const defaultMessage = `${userName} is using GrowthPortal to better understand their personality and how others perceive them. Your honest feedback would be incredibly valuable for their personal growth journey.\n\nThe assessment takes about 5 minutes and you can choose to remain anonymous.`;

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

  // Load any previously saved matched self mini-form (app-only, localStorage).
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`matched-self:${user.id}`);
      if (raw) setMatchedSelf(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const feedbackUrl = feedbackToken ? `${window.location.origin}/feedback/${feedbackToken}` : '';

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('peer_feedback')
          .select('*')
          .eq('target_user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setFeedbackList(data as PeerFeedbackItem[]);
        }
      } catch (err) {
        console.log('Error fetching peer feedback:', err);
      }

      // Self Big Five anchor (latest assessment with NEOAC scores).
      try {
        const { data: results } = await supabase
          .from('results_log')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });
        if (results) {
          const row = results.find((r: any) => r.scores && ['N', 'E', 'O', 'A', 'C'].every((k) => k in r.scores));
          if (row) setSelfBigFive(row.scores as Record<string, number>);
        }
      } catch {
        /* ignore */
      }

      setIsLoading(false);
    }

    fetchData();
  }, [user?.id, supabase]);

  const validFeedback = feedbackList.filter((fb) => fb.scores && Object.keys(fb.scores).length > 0);
  const bigFiveFeedback = validFeedback.filter((fb) => (fb.instrument ?? 'big-five') !== 'peer-360');
  const peer360Feedback = validFeedback.filter((fb) => fb.instrument === 'peer-360');
  const completedCount = validFeedback.length;
  const showNames = completedCount >= PRIVACY_THRESHOLD;

  // Self anchor: prefer the matched mini-form, fall back to full assessment.
  const selfAnchor = matchedSelf || selfBigFive;

  // Group big-five feedback by relationship for the segmented view.
  const segments = relationshipValues
    .map((rel) => {
      const rows = bigFiveFeedback.filter((fb) => fb.relationship === rel);
      return { rel, rows, count: rows.length };
    })
    .filter((s) => s.count >= PRIVACY_THRESHOLD)
    .map((s) => ({ ...s, averages: averageScores(s.rows, BIG_FIVE_TRAITS) }));

  // 360 competency results (overall + by relationship), min-3 each.
  const competencyKeys = PEER_360_INSTRUMENT.competencies.map((c) => c.key);
  const peer360Overall = peer360Feedback.length >= PRIVACY_THRESHOLD ? averageScores(peer360Feedback, competencyKeys) : null;
  const peer360Segments = relationshipValues
    .map((rel) => {
      const rows = peer360Feedback.filter((fb) => fb.relationship === rel);
      return { rel, count: rows.length, averages: averageScores(rows, competencyKeys) };
    })
    .filter((s) => s.count >= PRIVACY_THRESHOLD);

  // Headline gap: matched self vs big-five peer average (overall, min-3).
  const bigFivePeerAvg = bigFiveFeedback.length >= PRIVACY_THRESHOLD ? averageScores(bigFiveFeedback, BIG_FIVE_TRAITS) : null;
  const headlineGaps =
    matchedSelf && bigFivePeerAvg
      ? BIG_FIVE_TRAITS.map((t) => ({
          trait: t,
          self: matchedSelf[t] ?? 0,
          peer: bigFivePeerAvg[t] ?? 0,
          gap: (matchedSelf[t] ?? 0) - (bigFivePeerAvg[t] ?? 0),
        }))
      : null;
  const avgAbsGap = headlineGaps
    ? Math.round(headlineGaps.reduce((a, g) => a + Math.abs(g.gap), 0) / headlineGaps.length)
    : null;

  const handleCopyLink = async () => {
    try {
      if (!feedbackUrl) return;
      await navigator.clipboard.writeText(feedbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link copied!', description: 'Share this link with peers to request feedback.' });
    } catch (err) {
      toast({ title: 'Failed to copy', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDisplayName = (feedback: PeerFeedbackItem) => {
    if (!showNames) return 'Hidden (privacy threshold not met)';
    if (feedback.is_anonymous === 'true' || !feedback.peer_name) return 'Anonymous';
    return feedback.peer_name;
  };

  const getInitials = (feedback: PeerFeedbackItem) => {
    if (!showNames || feedback.is_anonymous === 'true' || !feedback.peer_name) return '?';
    return feedback.peer_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const openInviteModal = () => {
    setInviteEmails(['']);
    setInviteMessage(defaultMessage);
    setInviteInstrument('big-five');
    setShowInviteModal(true);
  };

  const addEmailField = () => setInviteEmails([...inviteEmails, '']);
  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };
  const updateEmail = (index: number, value: string) => {
    const next = [...inviteEmails];
    next[index] = value;
    setInviteEmails(next);
  };

  const handleSendInvites = async () => {
    const validEmails = inviteEmails.filter((e) => e.trim() && e.includes('@'));
    if (validEmails.length === 0) {
      toast({ title: 'No valid emails', description: 'Please enter at least one valid email address.', variant: 'destructive' });
      return;
    }

    setSendingInvites(true);
    try {
      // Generate one one-time invite link per recipient.
      const res = await fetch('/api/peer-invites', {
        method: 'POST',
        headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: validEmails.length, instrument: inviteInstrument }),
      });
      if (!res.ok) throw new Error('Failed to create invites');
      const { invites } = (await res.json()) as { invites: { token: string }[] };

      const links = invites.map((inv) => `${window.location.origin}/feedback/${inv.token}`);
      // Each recipient gets their own unique, single-use link.
      const bodyLines = validEmails.map((email, i) => `${email}: ${links[i] ?? feedbackUrl}`).join('\n');
      const emailBody = `${inviteMessage}\n\nEach person below has a unique, single-use feedback link:\n${bodyLines}`;
      const mailtoLink = `mailto:${validEmails.join(',')}?subject=Request for Personality Feedback&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink, '_blank');

      toast({
        title: 'One-time invites created!',
        description: `${links.length} unique link(s) generated. Your email client will open to send them.`,
      });
      setShowInviteModal(false);
    } catch (err) {
      toast({
        title: 'Failed to create invites',
        description: 'Please try copying your general link instead.',
        variant: 'destructive',
      });
    } finally {
      setSendingInvites(false);
    }
  };

  // --- Matched self mini-form ---
  const openSelfMini = () => {
    setMiniResponses({});
    setMiniPage(0);
    setShowSelfMiniModal(true);
  };

  const miniPages = Math.ceil(selfMiniQuestions.length / miniPerPage);
  const miniPageQuestions = selfMiniQuestions.slice(miniPage * miniPerPage, miniPage * miniPerPage + miniPerPage);
  const miniPageComplete = miniPageQuestions.every((q) => miniResponses[String(q.id)] !== undefined);
  const miniAllComplete = selfMiniQuestions.every((q) => miniResponses[String(q.id)] !== undefined);

  const submitSelfMini = () => {
    if (!user?.id || !miniAllComplete) return;
    const scores = calculateSelfMiniScores(miniResponses);
    try {
      localStorage.setItem(`matched-self:${user.id}`, JSON.stringify(scores));
    } catch {
      /* ignore */
    }
    setMatchedSelf(scores);
    setShowSelfMiniModal(false);
    toast({ title: 'Self-view saved', description: 'Your matched self-view is now compared against peer feedback.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-feedback-title">
            Peer Feedback
          </h1>
          <p className="text-muted-foreground mt-1">Gather insights from people who know you best</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openSelfMini} variant="outline" className="gap-2" data-testid="button-self-mini">
            <UserCheck className="w-4 h-4" />
            {matchedSelf ? 'Update Self-View' : 'Take Self-View'}
          </Button>
          <Button onClick={openInviteModal} className="gap-2" data-testid="button-invite-peer">
            <Mail className="w-4 h-4" />
            Invite Peer
          </Button>
          <Button onClick={handleCopyLink} variant="outline" className="gap-2" data-testid="button-copy-link">
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
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
      </div>

      {/* Headline self-vs-peer gap */}
      {headlineGaps ? (
        <Card className="bg-primary/5 border-primary/20" data-testid="card-headline-gap">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Self vs. Peer Perception
            </CardTitle>
            <CardDescription>
              Average gap of {avgAbsGap} points between how you see yourself and how peers see you (matched items).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {headlineGaps.map((g) => (
                <div key={g.trait} className="text-center" data-testid={`gap-trait-${g.trait}`}>
                  <p className="text-xs text-muted-foreground mb-1">{traitNames[g.trait]}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {g.gap > 0 ? '+' : ''}
                    {Math.round(g.gap)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    you {Math.round(g.self)} · peers {Math.round(g.peer)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/30 border-border" data-testid="card-gap-cta">
          <CardContent className="p-6 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {matchedSelf ? 'Collecting peer feedback' : 'Take your matched self-view'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {matchedSelf
                  ? `Once ${PRIVACY_THRESHOLD}+ peers complete the Big Five feedback, you'll see your self-vs-peer gap here.`
                  : 'Answer 30 quick "I…" statements so we can compare your self-view against peer feedback on identical items.'}
              </p>
              {!matchedSelf && (
                <Button onClick={openSelfMini} size="sm" className="mt-3 gap-2" data-testid="button-self-mini-cta">
                  <UserCheck className="w-4 h-4" />
                  Take Self-View
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-total-responses">
                  {completedCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name Visibility</p>
                <p className="text-lg font-semibold text-foreground flex items-center gap-2" data-testid="text-visibility-status">
                  {showNames ? (
                    <>
                      <Eye className="w-4 h-4 text-primary" />
                      Names Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      {PRIVACY_THRESHOLD - completedCount} more needed
                    </>
                  )}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relationship-segmented self vs peer (Big Five) */}
      {segments.length > 0 && (
        <Card className="bg-card border-border" data-testid="card-segments">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              How Different Groups See You
            </CardTitle>
            <CardDescription>
              Big Five averages by relationship (shown only for groups with {PRIVACY_THRESHOLD}+ responses).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {segments.map((seg) => (
              <div key={seg.rel} data-testid={`segment-${seg.rel}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-foreground">{relationshipLabels[seg.rel]}</p>
                  <Badge variant="secondary">{seg.count} responses</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {BIG_FIVE_TRAITS.map((t) => {
                    const peerVal = Math.round(seg.averages[t] ?? 0);
                    const selfVal = selfAnchor ? Math.round(selfAnchor[t] ?? 0) : null;
                    return (
                      <div key={t} className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">{traitNames[t]}</p>
                        <p className="text-lg font-semibold text-foreground">{peerVal}</p>
                        {selfVal !== null && (
                          <p className="text-xs text-muted-foreground">you: {selfVal}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 360 competency results */}
      {(peer360Overall || peer360Segments.length > 0) && (
        <Card className="bg-card border-border" data-testid="card-360">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              360° Competencies
            </CardTitle>
            <CardDescription>
              Everyday strengths rated by peers (shown only for {PRIVACY_THRESHOLD}+ responses).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {peer360Overall && (
              <div data-testid="segment-360-overall">
                <p className="font-medium text-foreground mb-3">Overall</p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {competencyKeys.map((k) => (
                    <div key={k} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">{peer360CompetencyNames[k]}</p>
                      <p className="text-lg font-semibold text-foreground">{Math.round(peer360Overall[k] ?? 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {peer360Segments.map((seg) => (
              <div key={seg.rel} data-testid={`segment-360-${seg.rel}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-foreground">{relationshipLabels[seg.rel]}</p>
                  <Badge variant="secondary">{seg.count} responses</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {competencyKeys.map((k) => (
                    <div key={k} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">{peer360CompetencyNames[k]}</p>
                      <p className="text-lg font-semibold text-foreground">{Math.round(seg.averages[k] ?? 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!showNames && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Privacy Protection Active</p>
                <p className="text-sm text-muted-foreground mt-1">
                  To protect the privacy of your peers, individual respondent names are hidden until at least{' '}
                  {PRIVACY_THRESHOLD} people have submitted feedback. This prevents identification of early responders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Feedback Responses
          </CardTitle>
          <CardDescription>
            {completedCount > 0
              ? `${completedCount} peer${completedCount !== 1 ? 's' : ''} have shared their perspective on you`
              : 'Share your invite link to start collecting feedback'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validFeedback.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No feedback received yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your invite link with colleagues, friends, and family
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {validFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border"
                  data-testid={`row-feedback-${feedback.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(feedback)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`font-medium ${showNames ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                        {getDisplayName(feedback)}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(feedback.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {feedback.relationship && (
                      <Badge variant="outline" className="text-xs" data-testid={`badge-relationship-${feedback.id}`}>
                        {relationshipLabels[feedback.relationship]}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {feedback.instrument === 'peer-360' ? '360°' : 'Big Five'}
                    </Badge>
                    {feedback.is_anonymous === 'true' && showNames && (
                      <Badge variant="secondary" className="text-xs">
                        Anonymous
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Share Your Feedback Link</CardTitle>
          <CardDescription>
            This general link can be reused by anyone. For one-time, per-person links, use “Invite Peer”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-muted/50 rounded-md px-4 py-2.5 text-sm text-muted-foreground truncate border border-border">
              {feedbackUrl || 'Generating your secure link…'}
            </div>
            <Button onClick={handleCopyLink} disabled={!feedbackUrl} className="gap-2 flex-shrink-0" data-testid="button-copy-link-bottom">
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
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
        </CardContent>
      </Card>

      {/* Invite modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Invite Peers for Feedback
            </DialogTitle>
            <DialogDescription>
              Each recipient gets a unique, single-use link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Feedback Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={inviteInstrument === 'big-five' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInviteInstrument('big-five')}
                  data-testid="button-instrument-big-five"
                >
                  Big Five
                </Button>
                <Button
                  type="button"
                  variant={inviteInstrument === 'peer-360' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInviteInstrument('peer-360')}
                  data-testid="button-instrument-360"
                >
                  360° Competencies
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Email Addresses</Label>
              {inviteEmails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="peer@example.com"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    data-testid={`input-invite-email-${index}`}
                  />
                  {inviteEmails.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeEmailField(index)} data-testid={`button-remove-email-${index}`}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEmailField} className="gap-1" data-testid="button-add-email">
                <Plus className="w-3 h-3" />
                Add Another Email
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Personal Message</Label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={5}
                className="resize-none"
                data-testid="textarea-invite-message"
              />
              <p className="text-xs text-muted-foreground">A unique link for each recipient will be added to your message.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)} data-testid="button-cancel-invite">
              Cancel
            </Button>
            <Button onClick={handleSendInvites} disabled={sendingInvites} className="gap-2" data-testid="button-send-invites">
              {sendingInvites ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Create &amp; Open Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Matched self mini-form */}
      <Dialog open={showSelfMiniModal} onOpenChange={setShowSelfMiniModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Your Matched Self-View
            </DialogTitle>
            <DialogDescription>
              Rate these statements about yourself. They mirror the peer questions for an apples-to-apples comparison.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Page {miniPage + 1} of {miniPages}
              </span>
              <span className="text-xs text-muted-foreground">
                {selfMiniQuestions.filter((q) => miniResponses[String(q.id)] !== undefined).length}/{selfMiniQuestions.length}
              </span>
            </div>
            <Progress
              value={(selfMiniQuestions.filter((q) => miniResponses[String(q.id)] !== undefined).length / selfMiniQuestions.length) * 100}
              className="h-1 mb-4"
            />

            <div className="space-y-6">
              {miniPageQuestions.map((q) => (
                <div key={q.id} className="space-y-3">
                  <p className="text-sm font-medium text-foreground" data-testid={`text-self-question-${q.id}`}>
                    {q.text}
                  </p>
                  <RadioGroup
                    value={miniResponses[String(q.id)]?.toString() || ''}
                    onValueChange={(v) => setMiniResponses((prev) => ({ ...prev, [String(q.id)]: parseInt(v) }))}
                    className="flex flex-wrap gap-2"
                  >
                    {likertScale.map((opt) => (
                      <div key={opt.value} className="flex items-center">
                        <RadioGroupItem value={opt.value.toString()} id={`self-${q.id}-${opt.value}`} className="sr-only" />
                        <Label
                          htmlFor={`self-${q.id}-${opt.value}`}
                          className={`px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors border ${
                            miniResponses[String(q.id)] === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                          }`}
                          data-testid={`radio-self-${q.id}-${opt.value}`}
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setMiniPage((p) => p - 1)}
              disabled={miniPage === 0}
              className="gap-2"
              data-testid="button-self-prev"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            {miniPage < miniPages - 1 ? (
              <Button onClick={() => setMiniPage((p) => p + 1)} disabled={!miniPageComplete} className="gap-2" data-testid="button-self-next">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={submitSelfMini} disabled={!miniAllComplete} className="gap-2" data-testid="button-self-submit">
                <CheckCircle2 className="w-4 h-4" />
                Save Self-View
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
