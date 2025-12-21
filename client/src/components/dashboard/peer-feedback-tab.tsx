import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Copy, CheckCircle2, Clock, Shield, Eye, EyeOff, Loader2, Mail, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';

const PRIVACY_THRESHOLD = 3;

interface PeerFeedbackItem {
  id: string;
  target_user_id: string;
  scores: Record<string, number>;
  peer_name: string | null;
  is_anonymous: string;
  created_at: string;
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
  const [sendingInvites, setSendingInvites] = useState(false);

  const userName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Someone';
  const defaultMessage = `${userName} is using GrowthPortal to better understand their personality and how others perceive them. Your honest feedback would be incredibly valuable for their personal growth journey.\n\nThe assessment takes about 5 minutes and you can choose to remain anonymous.`;
  
  useEffect(() => {
    async function fetchToken() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/my-feedback-token/${user.id}`);
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

  const feedbackUrl = feedbackToken 
    ? `${window.location.origin}/feedback/${feedbackToken}` 
    : user?.id ? `${window.location.origin}/feedback/${user.id}` : '';
  // Only count feedback with valid scores (completed submissions)
  const completedFeedback = feedbackList.filter(fb => fb.scores && Object.keys(fb.scores).length > 0);
  const completedCount = completedFeedback.length;
  const showNames = completedCount >= PRIVACY_THRESHOLD;

  useEffect(() => {
    async function fetchFeedback() {
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
          setFeedbackList(data);
        }
      } catch (err) {
        console.log('Error fetching peer feedback:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeedback();
  }, [user?.id, supabase]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(feedbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'Share this link with peers to request feedback.',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDisplayName = (feedback: PeerFeedbackItem) => {
    if (!showNames) return 'Hidden (privacy threshold not met)';
    if (feedback.is_anonymous === 'true' || !feedback.peer_name) return 'Anonymous';
    return feedback.peer_name;
  };

  const getInitials = (feedback: PeerFeedbackItem) => {
    if (!showNames || feedback.is_anonymous === 'true' || !feedback.peer_name) return '?';
    return feedback.peer_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const openInviteModal = () => {
    setInviteEmails(['']);
    setInviteMessage(defaultMessage);
    setShowInviteModal(true);
  };

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, '']);
  };

  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
  };

  const handleSendInvites = async () => {
    const validEmails = inviteEmails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length === 0) {
      toast({
        title: 'No valid emails',
        description: 'Please enter at least one valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setSendingInvites(true);
    try {
      const emailBody = `${inviteMessage}\n\nClick here to provide feedback: ${feedbackUrl}`;
      const mailtoLink = `mailto:${validEmails.join(',')}?subject=Request for Personality Feedback&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink, '_blank');
      
      toast({
        title: 'Invite ready!',
        description: `Your email client will open with ${validEmails.length} recipient(s). Send the email to complete the invitation.`,
      });
      setShowInviteModal(false);
    } catch (err) {
      toast({
        title: 'Failed to prepare invite',
        description: 'Please try copying the link manually instead.',
        variant: 'destructive',
      });
    } finally {
      setSendingInvites(false);
    }
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
          <p className="text-muted-foreground mt-1">
            Gather insights from people who know you best
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={openInviteModal} 
            className="gap-2"
            data-testid="button-invite-peer"
          >
            <Mail className="w-4 h-4" />
            Invite Peer
          </Button>
          <Button 
            onClick={handleCopyLink} 
            variant="outline"
            className="gap-2"
            data-testid="button-copy-link"
          >
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-total-responses">{completedCount}</p>
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

      {!showNames && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Privacy Protection Active</p>
                <p className="text-sm text-muted-foreground mt-1">
                  To protect the privacy of your peers, individual respondent names are hidden until at least {PRIVACY_THRESHOLD} people 
                  have submitted feedback. This prevents identification of early responders.
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
              : 'Share your invite link to start collecting feedback'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackList.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No feedback received yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your invite link with colleagues, friends, and family
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
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
                  <div className="flex items-center gap-3 flex-wrap justify-end">
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
            Anyone with this link can provide anonymous feedback about how they perceive you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-muted/50 rounded-md px-4 py-2.5 text-sm text-muted-foreground truncate border border-border">
              {feedbackUrl}
            </div>
            <Button 
              onClick={handleCopyLink}
              className="gap-2 flex-shrink-0"
              data-testid="button-copy-link-bottom"
            >
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

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Invite Peers for Feedback
            </DialogTitle>
            <DialogDescription>
              Send personalized invitations to colleagues, friends, or family members
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                      data-testid={`button-remove-email-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addEmailField}
                className="gap-1"
                data-testid="button-add-email"
              >
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
              <p className="text-xs text-muted-foreground">
                The feedback link will be automatically added to your message.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteModal(false)}
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvites}
              disabled={sendingInvites}
              className="gap-2"
              data-testid="button-send-invites"
            >
              {sendingInvites ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Open Email Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
