import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UsersRound, Plus, Settings, Users, Building2, Home } from 'lucide-react';

const groups = [
  {
    id: 1,
    name: 'Family',
    type: 'family',
    icon: Home,
    members: [
      { name: 'Jane Doe', role: 'Spouse' },
      { name: 'Alex Doe', role: 'Child' },
      { name: 'Sam Doe', role: 'Child' },
    ],
    lastActivity: '2 days ago',
  },
  {
    id: 2,
    name: 'Product Team',
    type: 'team',
    icon: Building2,
    members: [
      { name: 'Sarah Johnson', role: 'Manager' },
      { name: 'Michael Chen', role: 'Engineer' },
      { name: 'Emily Davis', role: 'Designer' },
      { name: 'James Wilson', role: 'Engineer' },
    ],
    lastActivity: '1 day ago',
  },
  {
    id: 3,
    name: 'Close Friends',
    type: 'friends',
    icon: Users,
    members: [
      { name: 'Chris Martinez', role: 'Friend' },
      { name: 'Taylor Brown', role: 'Friend' },
    ],
    lastActivity: '1 week ago',
  },
];

export default function FamilyTeamsTab() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight" data-testid="text-teams-title">
            Family & Teams
          </h1>
          <p className="text-gray-500 mt-1">
            Organize feedback sources into meaningful groups
          </p>
        </div>
        <Button className="bg-[#0f172a] gap-2" data-testid="button-create-group">
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="bg-white border-[#0f172a]/10" data-testid={`card-group-${group.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0f172a]/5 flex items-center justify-center flex-shrink-0">
                    <group.icon className="w-5 h-5 text-[#0f172a]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-[#0f172a]">
                      {group.name}
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5 capitalize">
                      {group.type} group
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400" data-testid={`button-settings-group-${group.id}`}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 mb-4">
                <div className="flex -space-x-2">
                  {group.members.slice(0, 4).map((member, idx) => (
                    <Avatar key={idx} className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="bg-[#0f172a]/10 text-[#0f172a] text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {group.members.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-[#0f172a]/10 border-2 border-white flex items-center justify-center">
                      <span className="text-xs text-[#0f172a] font-medium">
                        +{group.members.length - 4}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500 ml-2">
                  {group.members.length} members
                </span>
              </div>
              
              <div className="space-y-2">
                {group.members.slice(0, 3).map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-[#0f172a]">{member.name}</span>
                    <Badge variant="outline" className="border-[#0f172a]/10 text-gray-500 text-xs">
                      {member.role}
                    </Badge>
                  </div>
                ))}
                {group.members.length > 3 && (
                  <p className="text-xs text-gray-400">
                    +{group.members.length - 3} more members
                  </p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-[#0f172a]/10 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400">
                  Active {group.lastActivity}
                </span>
                <Button variant="outline" size="sm" className="border-[#0f172a]/20" data-testid={`button-view-group-${group.id}`}>
                  View Group
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-[#0f172a]/5 border-dashed border-2 border-[#0f172a]/20 flex items-center justify-center min-h-[280px]">
          <CardContent className="text-center p-6">
            <div className="w-12 h-12 rounded-lg bg-[#0f172a]/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-[#0f172a]" />
            </div>
            <h3 className="font-semibold text-[#0f172a] mb-1">Create New Group</h3>
            <p className="text-sm text-gray-500 mb-4">
              Organize your feedback sources
            </p>
            <Button variant="outline" className="border-[#0f172a]/20" data-testid="button-create-new-group">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
