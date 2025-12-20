import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Send, Mail, CheckCircle2, Clock, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const feedbackRequests = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 's.johnson@example.com',
    relationship: 'Manager',
    status: 'completed',
    respondedAt: '2024-01-18',
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'm.chen@example.com',
    relationship: 'Colleague',
    status: 'completed',
    respondedAt: '2024-01-17',
  },
  {
    id: 3,
    name: 'Emily Davis',
    email: 'e.davis@example.com',
    relationship: 'Direct Report',
    status: 'pending',
    sentAt: '2024-01-16',
  },
  {
    id: 4,
    name: 'James Wilson',
    email: 'j.wilson@example.com',
    relationship: 'Colleague',
    status: 'pending',
    sentAt: '2024-01-15',
  },
];

export default function PeerFeedbackTab() {
  const { toast } = useToast();

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://growthportal.app/feedback/abc123');
    toast({
      title: 'Link copied!',
      description: 'Share this link with peers to request feedback.',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight" data-testid="text-feedback-title">
            Peer Feedback
          </h1>
          <p className="text-gray-500 mt-1">
            Gather insights from people who know you best
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2 border-[#0f172a]/20" onClick={handleCopyLink} data-testid="button-copy-link">
            <Copy className="w-4 h-4" />
            Copy Link
          </Button>
          <Button className="bg-[#0f172a] gap-2" data-testid="button-invite-peers">
            <Send className="w-4 h-4" />
            Invite Peers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-[#0f172a]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Responses</p>
                <p className="text-3xl font-bold text-[#0f172a]" data-testid="text-total-responses">12</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#0f172a]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Pending Requests</p>
                <p className="text-3xl font-bold text-[#0f172a]" data-testid="text-pending-requests">4</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#0f172a]/10">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
            <Users className="w-5 h-5" />
            Feedback Requests
          </CardTitle>
          <CardDescription>
            Track the status of your feedback requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackRequests.map((request) => (
              <div 
                key={request.id} 
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#0f172a]/10"
                data-testid={`row-feedback-request-${request.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-[#0f172a]/5 text-[#0f172a] text-sm">
                      {request.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-[#0f172a]">{request.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-3 h-3" />
                      {request.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <Badge variant="outline" className="border-[#0f172a]/20 text-gray-600">
                    {request.relationship}
                  </Badge>
                  {request.status === 'completed' ? (
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Responded
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-700 border-0">
                      <Clock className="w-3 h-3" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
