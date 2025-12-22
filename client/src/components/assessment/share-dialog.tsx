import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, Check, Mail, Link2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ShareDialogProps {
  resultId: string;
  userId: string;
  assessmentName: string;
}

export function ShareDialog({ resultId, userId, assessmentName }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const { toast } = useToast();

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', '/api/share-result', {
        resultId,
        userId,
      });
      
      const data = await response.json();
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}/shared/${data.token}`;
      setShareUrl(fullUrl);
      setExpiresAt(new Date(data.expiresAt).toLocaleDateString());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate share link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Share link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please manually copy the link.',
        variant: 'destructive',
      });
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`My ${assessmentName} Results`);
    const body = encodeURIComponent(
      `I wanted to share my ${assessmentName} results with you!\n\nView my results here: ${shareUrl}\n\nThis link will expire on ${expiresAt}.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !shareUrl) {
      generateShareLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" data-testid="button-share-results">
          <Share2 className="w-4 h-4 mr-2" />
          Share Results
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Results</DialogTitle>
          <DialogDescription>
            Share your {assessmentName} results with others. The link will expire in 7 days.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : shareUrl ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-link">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                    data-testid="input-share-link"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    data-testid="button-copy-link"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires on {expiresAt}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="w-full justify-start"
                  data-testid="button-copy-link-full"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={shareViaEmail}
                  className="w-full justify-start"
                  data-testid="button-share-email"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Share via Email
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to generate share link. Please try again.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
