import { useEffect } from 'react';
import { useLocation, Switch, Route, Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { Home, ClipboardList, Users, UsersRound, LogOut, Leaf, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import HomeTab from '@/components/dashboard/home-tab';
import AssessmentsTab from '@/components/dashboard/assessments-tab';
import PeerFeedbackTab from '@/components/dashboard/peer-feedback-tab';
import FamilyTeamsTab from '@/components/dashboard/family-teams-tab';
import ProfileTab from '@/components/dashboard/profile-tab';
import ExploreTab from '@/components/dashboard/explore-tab';
import Footer from '@/components/footer';
import { Compass } from 'lucide-react';

const navItems = [
  { title: 'Growth Overview', icon: Home, href: '/dashboard' },
  { title: 'My Assessments', icon: ClipboardList, href: '/dashboard/assessments' },
  { title: 'Explore', icon: Compass, href: '/dashboard/explore' },
  { title: 'Peer Feedback', icon: Users, href: '/dashboard/feedback' },
  { title: 'Family & Teams', icon: UsersRound, href: '/dashboard/teams' },
  { title: 'My Profile', icon: UserCircle, href: '/dashboard/profile' },
];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/auth');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = user.email?.slice(0, 2).toUpperCase() || 'U';
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Leaf className="w-6 h-6 text-primary" />
              <span className="text-sidebar-foreground font-semibold text-lg tracking-tight">GrowthPortal</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location === item.href || 
                      (item.href !== '/dashboard' && location.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild
                          isActive={isActive}
                          className="text-sidebar-foreground/70 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                        >
                          <a href={item.href} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <Link 
              href="/dashboard/profile"
              className="flex items-center gap-3 mb-3 hover-elevate p-2 -m-2 rounded-md cursor-pointer"
              data-testid="link-sidebar-profile"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="w-full justify-start text-muted-foreground gap-2"
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between gap-4 px-4 bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="text-foreground" />
            <Link 
              href="/dashboard/profile"
              className="flex items-center gap-2 hover-elevate px-2 py-1 rounded-md cursor-pointer"
              data-testid="link-header-profile"
            >
              <span className="text-sm text-muted-foreground">Welcome back,</span>
              <span className="text-sm font-medium text-foreground">{userName}</span>
            </Link>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-6 md:p-8">
              <Switch>
                <Route path="/dashboard" component={HomeTab} />
                <Route path="/dashboard/assessments" component={AssessmentsTab} />
                <Route path="/dashboard/explore" component={ExploreTab} />
                <Route path="/dashboard/feedback" component={PeerFeedbackTab} />
                <Route path="/dashboard/teams" component={FamilyTeamsTab} />
                <Route path="/dashboard/profile" component={ProfileTab} />
              </Switch>
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
