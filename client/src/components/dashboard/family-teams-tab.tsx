import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersRound, Plus, Settings, Users, Building2, Home, Lock, Eye, EyeOff, Mail, Trash2, X, Shield, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  type: 'family' | 'team' | 'friends';
  icon: typeof Home | typeof Building2 | typeof Users;
  members: GroupMember[];
  lastActivity: string;
  privacySettings: {
    showAverages: boolean;
    showIndividual: boolean;
    anonymizeMembers: boolean;
  };
}

const defaultGroups: Group[] = [
  {
    id: '1',
    name: 'Family',
    type: 'family',
    icon: Home,
    members: [
      { id: '1', name: 'Jane Doe', email: 'jane@example.com', role: 'Spouse' },
      { id: '2', name: 'Alex Doe', email: 'alex@example.com', role: 'Child' },
      { id: '3', name: 'Sam Doe', email: 'sam@example.com', role: 'Child' },
    ],
    lastActivity: '2 days ago',
    privacySettings: { showAverages: true, showIndividual: false, anonymizeMembers: true },
  },
  {
    id: '2',
    name: 'Product Team',
    type: 'team',
    icon: Building2,
    members: [
      { id: '4', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Manager' },
      { id: '5', name: 'Michael Chen', email: 'michael@example.com', role: 'Engineer' },
      { id: '6', name: 'Emily Davis', email: 'emily@example.com', role: 'Designer' },
      { id: '7', name: 'James Wilson', email: 'james@example.com', role: 'Engineer' },
    ],
    lastActivity: '1 day ago',
    privacySettings: { showAverages: true, showIndividual: true, anonymizeMembers: false },
  },
  {
    id: '3',
    name: 'Close Friends',
    type: 'friends',
    icon: Users,
    members: [
      { id: '8', name: 'Chris Martinez', email: 'chris@example.com', role: 'Friend' },
      { id: '9', name: 'Taylor Brown', email: 'taylor@example.com', role: 'Friend' },
    ],
    lastActivity: '1 week ago',
    privacySettings: { showAverages: true, showIndividual: false, anonymizeMembers: true },
  },
];

const groupTypes = [
  { value: 'family', label: 'Family', icon: Home },
  { value: 'team', label: 'Team', icon: Building2 },
  { value: 'friends', label: 'Friends', icon: Users },
];

export default function FamilyTeamsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>(defaultGroups);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'family' | 'team' | 'friends'>('family');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  const getIconForType = (type: string) => {
    switch (type) {
      case 'family': return Home;
      case 'team': return Building2;
      default: return Users;
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a group name.',
        variant: 'destructive',
      });
      return;
    }

    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName,
      type: newGroupType,
      icon: getIconForType(newGroupType),
      members: [],
      lastActivity: 'Just now',
      privacySettings: {
        showAverages: true,
        showIndividual: false,
        anonymizeMembers: true,
      },
    };

    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setNewGroupType('family');
    setShowCreateModal(false);
    toast({
      title: 'Group created',
      description: `"${newGroup.name}" has been created. Add members to start collecting feedback.`,
    });
  };

  const handleAddMember = () => {
    if (!selectedGroup || !newMemberEmail.trim()) return;

    const newMember: GroupMember = {
      id: Date.now().toString(),
      name: newMemberName || newMemberEmail.split('@')[0],
      email: newMemberEmail,
      role: newMemberRole || 'Member',
    };

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return { ...g, members: [...g.members, newMember], lastActivity: 'Just now' };
      }
      return g;
    });

    setGroups(updatedGroups);
    setSelectedGroup({ ...selectedGroup, members: [...selectedGroup.members, newMember] });
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberRole('');
    toast({
      title: 'Member added',
      description: `${newMember.name} has been added to ${selectedGroup.name}.`,
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedGroup) return;

    const updatedMembers = selectedGroup.members.filter(m => m.id !== memberId);
    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return { ...g, members: updatedMembers };
      }
      return g;
    });

    setGroups(updatedGroups);
    setSelectedGroup({ ...selectedGroup, members: updatedMembers });
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    setShowViewModal(false);
    setSelectedGroup(null);
    toast({
      title: 'Group deleted',
      description: 'The group has been removed.',
    });
  };

  const handleUpdatePrivacy = (key: keyof Group['privacySettings'], value: boolean) => {
    if (!selectedGroup) return;

    const updatedSettings = { ...selectedGroup.privacySettings, [key]: value };
    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroup.id) {
        return { ...g, privacySettings: updatedSettings };
      }
      return g;
    });

    setGroups(updatedGroups);
    setSelectedGroup({ ...selectedGroup, privacySettings: updatedSettings });
  };

  const openViewModal = (group: Group) => {
    setSelectedGroup(group);
    setShowViewModal(true);
  };

  const openSettingsModal = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGroup(group);
    setShowSettingsModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-teams-title">
            Family & Teams
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize feedback sources into meaningful groups
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2" data-testid="button-create-group">
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="bg-card border-border" data-testid={`card-group-${group.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <group.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {group.name}
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5 capitalize">
                      {group.type} group
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground" 
                  onClick={(e) => openSettingsModal(group, e)}
                  data-testid={`button-settings-group-${group.id}`}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 mb-4">
                <div className="flex -space-x-2">
                  {group.members.slice(0, 4).map((member) => (
                    <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {group.members.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                      <span className="text-xs text-primary font-medium">
                        +{group.members.length - 4}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground ml-2">
                  {group.members.length} members
                </span>
              </div>
              
              <div className="space-y-2">
                {group.members.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{member.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                ))}
                {group.members.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{group.members.length - 3} more members
                  </p>
                )}
                {group.members.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No members yet
                  </p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Active {group.lastActivity}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openViewModal(group)}
                  data-testid={`button-view-group-${group.id}`}
                >
                  View Group
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/30 border-dashed border-2 border-border flex items-center justify-center min-h-[280px]">
          <CardContent className="text-center p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Create New Group</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Organize your feedback sources
            </p>
            <Button variant="outline" onClick={() => setShowCreateModal(true)} data-testid="button-create-new-group">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-primary" />
              Create New Group
            </DialogTitle>
            <DialogDescription>
              Create a group to organize feedback from specific people in your life
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                placeholder="e.g., Work Team, College Friends"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                data-testid="input-group-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Group Type</Label>
              <Select value={newGroupType} onValueChange={(v: 'family' | 'team' | 'friends') => setNewGroupType(v)}>
                <SelectTrigger data-testid="select-group-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} className="gap-2" data-testid="button-confirm-create">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGroup && <selectedGroup.icon className="w-5 h-5 text-primary" />}
              {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>
              Manage members and invite new people to provide feedback
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invite">Invite</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4 py-4">
              {selectedGroup?.members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members yet. Use the Invite tab to add people.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedGroup?.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{member.role}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive"
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invite" className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    data-testid="input-member-email"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Name (Optional)</Label>
                    <Input
                      placeholder="John Smith"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      data-testid="input-member-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role (Optional)</Label>
                    <Input
                      placeholder="Manager, Friend, etc."
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      data-testid="input-member-role"
                    />
                  </div>
                </div>
                <Button onClick={handleAddMember} className="w-full gap-2" data-testid="button-add-member">
                  <Plus className="w-4 h-4" />
                  Add Member
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedGroup && handleDeleteGroup(selectedGroup.id)}
              className="gap-2"
              data-testid="button-delete-group"
            >
              <Trash2 className="w-4 h-4" />
              Delete Group
            </Button>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy Settings
            </DialogTitle>
            <DialogDescription>
              Control how feedback from this group is displayed
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base">Show Group Averages</Label>
                <p className="text-sm text-muted-foreground">
                  Display average scores across all group members
                </p>
              </div>
              <Switch
                checked={selectedGroup?.privacySettings.showAverages ?? true}
                onCheckedChange={(checked) => handleUpdatePrivacy('showAverages', checked)}
                data-testid="switch-show-averages"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base">Show Individual Scores</Label>
                <p className="text-sm text-muted-foreground">
                  Allow viewing each member's feedback separately
                </p>
              </div>
              <Switch
                checked={selectedGroup?.privacySettings.showIndividual ?? false}
                onCheckedChange={(checked) => handleUpdatePrivacy('showIndividual', checked)}
                data-testid="switch-show-individual"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base">Anonymize Members</Label>
                <p className="text-sm text-muted-foreground">
                  Hide member names until threshold is met
                </p>
              </div>
              <Switch
                checked={selectedGroup?.privacySettings.anonymizeMembers ?? true}
                onCheckedChange={(checked) => handleUpdatePrivacy('anonymizeMembers', checked)}
                data-testid="switch-anonymize"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettingsModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
