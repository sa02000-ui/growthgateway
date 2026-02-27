import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Briefcase, GraduationCap, Globe, Calendar, Save, Loader2, Mail, Phone, Lock, Settings, Info, AlertTriangle, Trash2, History, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const fieldExplanations = {
  householdIncome: "Research shows income correlates with stress levels and life satisfaction, which can influence personality expression over time.",
  parentalOccupation: "Studies indicate parental occupation shapes early values and work orientation, providing context for career-related personality traits.",
  parentalIncome: "Socioeconomic background during childhood is linked to resilience patterns and risk tolerance in adulthood.",
  culturalBackground: "Cultural context influences how personality traits are expressed and perceived by others.",
  maritalStatus: "Relationship status can affect social support systems and emotional wellbeing, impacting trait expression.",
};
import { Slider } from '@/components/ui/slider';
import {
  maritalStatusOptions,
  culturalBackgroundOptions,
  educationLevelOptions,
  incomeOptions,
  lifeEventOptions,
  occupationCategories,
  fieldOfStudyOptions,
  countryOptions,
  yearsInRegionOptions,
  youngestChildAgeOptions,
} from '@shared/schema';

interface ProfileData {
  maritalStatus: string;
  childrenCount: string;
  youngestChildAge: string;
  birthCountry: string;
  yearsInRegion: string;
  culturalBackground: string;
  profession: string;
  industry: string;
  educationLevel: string;
  fieldOfStudy: string;
  householdIncome: string;
  parentalOccupation: string;
  parentalIncome: string;
}

interface LifeEventEntry {
  type: string;
  year: string;
  significance: number;
}

interface LifeEventsData {
  events: LifeEventEntry[];
  otherEvent: string;
}

interface AccountData {
  displayName: string;
  legalFullName: string;
  phoneNumber: string;
  email: string;
}

export default function ProfileTab() {
  const { user, supabase, session, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "You must be logged in to delete your account.",
        variant: "destructive",
      });
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await fetch('/api/user/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      await signOut();
      setLocation('/');
    } catch (error) {
      console.error('Account deletion error:', error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const [account, setAccount] = useState<AccountData>({
    displayName: '',
    legalFullName: '',
    phoneNumber: '',
    email: '',
  });

  const [profile, setProfile] = useState<ProfileData>({
    maritalStatus: '',
    childrenCount: '',
    youngestChildAge: '',
    birthCountry: '',
    yearsInRegion: '',
    culturalBackground: '',
    profession: '',
    industry: '',
    educationLevel: '',
    fieldOfStudy: '',
    householdIncome: '',
    parentalOccupation: '',
    parentalIncome: '',
  });

  const [lifeEvents, setLifeEvents] = useState<LifeEventsData>({
    events: [],
    otherEvent: '',
  });

  const [profileHistory, setProfileHistory] = useState<any[]>([]);
  const [professionSearch, setProfessionSearch] = useState('');

  useEffect(() => {
    if (user) {
      setAccount({
        displayName: user.user_metadata?.display_name || user.user_metadata?.name || '',
        legalFullName: user.user_metadata?.full_name || user.user_metadata?.legal_name || '',
        phoneNumber: user.user_metadata?.phone || user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) {
        setLoadingProfile(false);
        return;
      }

      try {
        const response = await fetch(`/api/profile/${user.id}`);
        if (response.ok) {
          const { profile: data, lifeEvents: eventsData, history: historyData } = await response.json();
          if (historyData) setProfileHistory(historyData);

          if (data) {
            setProfile({
              maritalStatus: data.marital_status || '',
              childrenCount: data.children_count?.toString() || '',
              youngestChildAge: data.youngest_child_age || '',
              birthCountry: data.birth_country || '',
              yearsInRegion: data.years_in_region || '',
              culturalBackground: data.cultural_background || '',
              profession: data.profession || '',
              industry: data.industry || '',
              educationLevel: data.education_level || '',
              fieldOfStudy: data.field_of_study || '',
              householdIncome: data.household_income || '',
              parentalOccupation: data.parental_occupation || '',
              parentalIncome: data.parental_income || '',
            });
          }

          if (eventsData && eventsData.length > 0) {
            setLifeEvents({
              events: eventsData.map((e: { event_type: string; year: string; significance: number }) => ({
                type: e.event_type || '',
                year: e.year || '',
                significance: e.significance || 5,
              })),
              otherEvent: '',
            });
          }
        }
      } catch (err) {
        console.log('Profile not found, will create on save');
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [user?.id]);

  const handleSaveAccount = async () => {
    if (!user?.id || !supabase) return;

    setSavingAccount(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: account.displayName,
          full_name: account.legalFullName,
          legal_name: account.legalFullName,
          phone: account.phoneNumber,
        },
      });

      if (error) throw error;

      toast({
        title: 'Account updated',
        description: 'Your account settings have been saved.',
      });
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: 'Error saving account',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (!supabase) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (error.message.includes('reauthentication') || error.message.includes('session')) {
          toast({
            title: 'Session expired',
            description: 'Please sign out and sign back in, then try changing your password again.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error changing password',
        description: error?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/profile/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          lifeEvents: lifeEvents.events,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      toast({
        title: 'Profile saved',
        description: 'Your demographic information has been updated and a snapshot has been recorded.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error saving profile',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatFieldName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getSnapshotChanges = (current: any, previous: any) => {
    if (!previous) return ["Initial Profile Baseline Established"];

    const changes: string[] = [];
    const currentProfile = current.snapshot?.profile || {};
    const previousProfile = previous.snapshot?.profile || {};

    Object.keys(currentProfile).forEach(key => {
      if (currentProfile[key] !== previousProfile[key]) {
        const formattedKey = formatFieldName(key);
        const oldVal = previousProfile[key] || 'None';
        const newVal = currentProfile[key] || 'None';
        changes.push(`${formattedKey}: "${oldVal}" \u27A4 "${newVal}"`);
      }
    });

    const currentEvents = current.snapshot?.lifeEvents || [];
    const previousEvents = previous.snapshot?.lifeEvents || [];
    if (currentEvents.length > previousEvents.length) {
      changes.push(`Added ${currentEvents.length - previousEvents.length} new life event(s)`);
    } else if (currentEvents.length < previousEvents.length) {
      changes.push(`Removed ${previousEvents.length - currentEvents.length} life event(s)`);
    }

    return changes.length > 0 ? changes : ["Profile saved with no demographic changes"];
  };

  if (loadingProfile) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" data-testid="text-profile-title">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and demographic information
          </p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your account details and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Display Name
              </Label>
              <Input
                id="displayName"
                placeholder="How you'd like to be called"
                value={account.displayName}
                onChange={(e) => setAccount(a => ({ ...a, displayName: e.target.value }))}
                data-testid="input-display-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalFullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Legal Full Name
              </Label>
              <Input
                id="legalFullName"
                placeholder="Your legal name (optional)"
                value={account.legalFullName}
                onChange={(e) => setAccount(a => ({ ...a, legalFullName: e.target.value }))}
                data-testid="input-legal-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={account.phoneNumber}
                onChange={(e) => setAccount(a => ({ ...a, phoneNumber: e.target.value }))}
                data-testid="input-phone-number"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={account.email}
                disabled
                className="bg-muted"
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed directly. Contact support if needed.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="gap-2"
              data-testid="button-toggle-password"
            >
              <Lock className="w-4 h-4" />
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </Button>
            <Button
              onClick={handleSaveAccount}
              disabled={savingAccount}
              className="gap-2"
              data-testid="button-save-account"
            >
              {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Account
            </Button>
          </div>

          {showPasswordChange && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="gap-2"
                data-testid="button-change-password"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Demographic History</h2>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
          data-testid="button-save-profile"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Demographics
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Basic information about you and your background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maritalStatus" className="flex items-center gap-2">
                Marital Status
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{fieldExplanations.maritalStatus}</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select 
                value={profile.maritalStatus} 
                onValueChange={(value) => setProfile(p => ({ ...p, maritalStatus: value }))}
              >
                <SelectTrigger data-testid="select-marital-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {maritalStatusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="childrenCount">Number of Children</Label>
              <Input
                id="childrenCount"
                type="number"
                min="0"
                placeholder="0"
                value={profile.childrenCount}
                onChange={(e) => setProfile(p => ({ ...p, childrenCount: e.target.value }))}
                data-testid="input-children-count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youngestChildAge">Age of Youngest Child</Label>
              <Select 
                value={profile.youngestChildAge} 
                onValueChange={(value) => setProfile(p => ({ ...p, youngestChildAge: value }))}
              >
                <SelectTrigger data-testid="select-youngest-child-age">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  {youngestChildAgeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="culturalBackground" className="flex items-center gap-2">
                Cultural Background
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{fieldExplanations.culturalBackground}</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select 
                value={profile.culturalBackground} 
                onValueChange={(value) => setProfile(p => ({ ...p, culturalBackground: value }))}
              >
                <SelectTrigger data-testid="select-cultural-background">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  {culturalBackgroundOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Professional Information
            </CardTitle>
            <CardDescription>
              Your career and work details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profession">Occupation Category (SOC)</Label>
              <Select 
                value={profile.profession} 
                onValueChange={(value) => setProfile(p => ({ ...p, profession: value }))}
              >
                <SelectTrigger data-testid="select-profession">
                  <SelectValue placeholder="Start typing to filter..." />
                </SelectTrigger>
                <SelectContent>
                  {occupationCategories
                    .filter(opt => 
                      !professionSearch || 
                      opt.label.toLowerCase().includes(professionSearch.toLowerCase())
                    )
                    .map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry / Sector</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology, Healthcare, Finance"
                value={profile.industry}
                onChange={(e) => setProfile(p => ({ ...p, industry: e.target.value }))}
                data-testid="input-industry"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="householdIncome" className="flex items-center gap-2">
                Household Income
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{fieldExplanations.householdIncome}</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select 
                value={profile.householdIncome} 
                onValueChange={(value) => setProfile(p => ({ ...p, householdIncome: value }))}
              >
                <SelectTrigger data-testid="select-household-income">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {incomeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Education & Background
            </CardTitle>
            <CardDescription>
              Your educational history and family context
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="educationLevel">Highest Education Level</Label>
              <Select 
                value={profile.educationLevel} 
                onValueChange={(value) => setProfile(p => ({ ...p, educationLevel: value }))}
              >
                <SelectTrigger data-testid="select-education-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {educationLevelOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldOfStudy">Field of Study</Label>
              <Select 
                value={profile.fieldOfStudy} 
                onValueChange={(value) => setProfile(p => ({ ...p, fieldOfStudy: value }))}
              >
                <SelectTrigger data-testid="select-field-of-study">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fieldOfStudyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentalOccupation" className="flex items-center gap-2">
                Parent's Primary Occupation
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{fieldExplanations.parentalOccupation}</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="parentalOccupation"
                placeholder="e.g., Teacher"
                value={profile.parentalOccupation}
                onChange={(e) => setProfile(p => ({ ...p, parentalOccupation: e.target.value }))}
                data-testid="input-parental-occupation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentalIncome" className="flex items-center gap-2">
                Parent's Income Level (Growing Up)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{fieldExplanations.parentalIncome}</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select 
                value={profile.parentalIncome} 
                onValueChange={(value) => setProfile(p => ({ ...p, parentalIncome: value }))}
              >
                <SelectTrigger data-testid="select-parental-income">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {incomeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Geography
            </CardTitle>
            <CardDescription>
              Your geographic background and mobility history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthCountry">Country of Birth</Label>
              <Select 
                value={profile.birthCountry} 
                onValueChange={(value) => setProfile(p => ({ ...p, birthCountry: value }))}
              >
                <SelectTrigger data-testid="select-birth-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsInRegion">Years in Current Region</Label>
              <Select 
                value={profile.yearsInRegion} 
                onValueChange={(value) => setProfile(p => ({ ...p, yearsInRegion: value }))}
              >
                <SelectTrigger data-testid="select-years-in-region">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {yearsInRegionOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Life Events Log
            </CardTitle>
            <CardDescription>
              Major life changes become a permanent part of your profile history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track significant life events with their approximate year and personal significance. 
              These events are permanently recorded to help understand how life transitions affect your growth.
            </p>

            {lifeEvents.events.map((event, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={event.type} 
                      onValueChange={(value) => {
                        const newEvents = [...lifeEvents.events];
                        newEvents[index].type = value;
                        setLifeEvents(le => ({ ...le, events: newEvents }));
                      }}
                    >
                      <SelectTrigger data-testid={`select-event-type-${index}`}>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {lifeEventOptions.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2023"
                      value={event.year}
                      onChange={(e) => {
                        const newEvents = [...lifeEvents.events];
                        newEvents[index].year = e.target.value;
                        setLifeEvents(le => ({ ...le, events: newEvents }));
                      }}
                      data-testid={`input-event-year-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Significance (1-10): {event.significance}</Label>
                    <Slider
                      value={[event.significance]}
                      onValueChange={(value) => {
                        const newEvents = [...lifeEvents.events];
                        newEvents[index].significance = value[0];
                        setLifeEvents(le => ({ ...le, events: newEvents }));
                      }}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                      data-testid={`slider-event-significance-${index}`}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newEvents = lifeEvents.events.filter((_, i) => i !== index);
                    setLifeEvents(le => ({ ...le, events: newEvents }));
                  }}
                  className="text-destructive"
                  data-testid={`button-remove-event-${index}`}
                >
                  Remove Event
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() => {
                setLifeEvents(le => ({
                  ...le,
                  events: [...le.events, { type: '', year: '', significance: 5 }]
                }));
              }}
              className="gap-2"
              data-testid="button-add-life-event"
            >
              Add Life Event
            </Button>

            <div className="space-y-2 pt-2">
              <Label htmlFor="otherEvent">Other Significant Event (Notes)</Label>
              <Textarea
                id="otherEvent"
                placeholder="Describe any other major life change or additional context..."
                value={lifeEvents.otherEvent}
                onChange={(e) => setLifeEvents(le => ({ ...le, otherEvent: e.target.value }))}
                className="resize-none"
                rows={3}
                data-testid="textarea-other-event"
              />
            </div>
          </CardContent>
        </Card>

        {profileHistory && profileHistory.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Chronological Profile History
              </CardTitle>
              <CardDescription>
                A timeline of your life changes and profile updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto pr-4 space-y-6">
                {profileHistory.map((entry, index) => {
                  const parsed = typeof entry.snapshot === 'string' ? { ...entry, snapshot: JSON.parse(entry.snapshot) } : entry;
                  const previousRaw = profileHistory[index + 1];
                  const previousEntry = previousRaw
                    ? typeof previousRaw.snapshot === 'string' ? { ...previousRaw, snapshot: JSON.parse(previousRaw.snapshot) } : previousRaw
                    : null;
                  const changes = getSnapshotChanges(parsed, previousEntry);

                  return (
                    <div key={entry.id || index} className="relative pl-6 border-l-2 border-primary/20 last:border-transparent" data-testid={`timeline-entry-${index}`}>
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background" />
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground" data-testid={`text-snapshot-date-${index}`}>
                          {parsed.snapshot?.timestamp
                            ? new Date(parsed.snapshot.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : 'Unknown date'}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Latest</span>
                        )}
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-1">
                        {changes.map((change, i) => (
                          <li key={i}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-destructive/30 rounded-md bg-background">
              <div className="space-y-1">
                <h4 className="font-medium text-foreground">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="gap-2 shrink-0"
                    disabled={deletingAccount}
                    data-testid="button-delete-account"
                  >
                    {deletingAccount ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your data from our servers, including:
                      </span>
                      <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                        <li>All assessment results and history</li>
                        <li>Peer feedback received</li>
                        <li>Profile information</li>
                        <li>Group memberships</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deletingAccount}
                      data-testid="button-confirm-delete"
                    >
                      {deletingAccount ? 'Deleting...' : 'Yes, delete my account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
