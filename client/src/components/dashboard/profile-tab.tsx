import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Briefcase, GraduationCap, Globe, Calendar, Save, Loader2, Mail, Phone, Lock, Settings, Info } from 'lucide-react';
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
} from '@shared/schema';

interface ProfileData {
  maritalStatus: string;
  yearsInCurrentRegion: string;
  culturalBackground: string;
  profession: string;
  industry: string;
  educationLevel: string;
  fieldOfStudy: string;
  householdIncome: string;
  parentalOccupation: string;
  parentalIncome: string;
  countryOfBirth: string;
  currentCountry: string;
  totalRegionsLived: string;
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
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [account, setAccount] = useState<AccountData>({
    displayName: '',
    legalFullName: '',
    phoneNumber: '',
    email: '',
  });

  const [profile, setProfile] = useState<ProfileData>({
    maritalStatus: '',
    yearsInCurrentRegion: '',
    culturalBackground: '',
    profession: '',
    industry: '',
    educationLevel: '',
    fieldOfStudy: '',
    householdIncome: '',
    parentalOccupation: '',
    parentalIncome: '',
    countryOfBirth: '',
    currentCountry: '',
    totalRegionsLived: '',
  });

  const [lifeEvents, setLifeEvents] = useState<LifeEventsData>({
    events: [],
    otherEvent: '',
  });

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
      if (!user?.id || !supabase) {
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setProfile({
            maritalStatus: data.marital_status || '',
            yearsInCurrentRegion: data.years_in_current_region?.toString() || '',
            culturalBackground: data.cultural_background || '',
            profession: data.profession || '',
            industry: data.industry || '',
            educationLevel: data.education_level || '',
            fieldOfStudy: data.field_of_study || '',
            householdIncome: data.household_income || '',
            parentalOccupation: data.parental_occupation || '',
            parentalIncome: data.parental_income || '',
            countryOfBirth: data.country_of_birth || '',
            currentCountry: data.current_country || '',
            totalRegionsLived: data.total_regions_lived?.toString() || '',
          });
        }

        const { data: lifeEventsData } = await supabase
          .from('life_events_log')
          .select('*')
          .eq('user_id', user.id)
          .order('year', { ascending: false });

        if (lifeEventsData && lifeEventsData.length > 0) {
          setLifeEvents({
            events: lifeEventsData.map((e: { event_type: string; year: string; significance: number }) => ({
              type: e.event_type || '',
              year: e.year || '',
              significance: e.significance || 5,
            })),
            otherEvent: '',
          });
        }
      } catch (err) {
        console.log('Profile not found, will create on save');
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [user?.id, supabase]);

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
    if (!user?.id || !supabase) return;

    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        marital_status: profile.maritalStatus || null,
        years_in_current_region: profile.yearsInCurrentRegion ? parseInt(profile.yearsInCurrentRegion) : null,
        cultural_background: profile.culturalBackground || null,
        profession: profile.profession || null,
        industry: profile.industry || null,
        education_level: profile.educationLevel || null,
        field_of_study: profile.fieldOfStudy || null,
        household_income: profile.householdIncome || null,
        parental_occupation: profile.parentalOccupation || null,
        parental_income: profile.parentalIncome || null,
        country_of_birth: profile.countryOfBirth || null,
        current_country: profile.currentCountry || null,
        total_regions_lived: profile.totalRegionsLived ? parseInt(profile.totalRegionsLived) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      for (const event of lifeEvents.events) {
        if (event.type && event.year) {
          await supabase
            .from('life_events_log')
            .upsert({
              user_id: user.id,
              event_type: event.type,
              year: event.year,
              significance: event.significance,
            }, { onConflict: 'user_id,event_type,year' });
        }
      }

      const snapshot = {
        profile: profileData,
        lifeEvents: lifeEvents.events,
        timestamp: new Date().toISOString(),
      };

      const historyResponse = await fetch('/api/profile-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          snapshot: snapshot,
        }),
      });

      if (!historyResponse.ok) {
        console.error('Failed to save profile history snapshot');
        toast({
          title: 'Profile saved',
          description: 'Your demographic information has been updated, but the history snapshot could not be recorded.',
        });
        return;
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
              <Label htmlFor="countryOfBirth">Country of Birth</Label>
              <Select 
                value={profile.countryOfBirth} 
                onValueChange={(value) => setProfile(p => ({ ...p, countryOfBirth: value }))}
              >
                <SelectTrigger data-testid="select-country-of-birth">
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
              <Label htmlFor="currentCountry">Current Country of Residence</Label>
              <Select 
                value={profile.currentCountry} 
                onValueChange={(value) => setProfile(p => ({ ...p, currentCountry: value }))}
              >
                <SelectTrigger data-testid="select-current-country">
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
              <Input
                id="yearsInRegion"
                type="number"
                placeholder="e.g., 5"
                value={profile.yearsInCurrentRegion}
                onChange={(e) => setProfile(p => ({ ...p, yearsInCurrentRegion: e.target.value }))}
                data-testid="input-years-in-region"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalRegionsLived">Total Regions/Countries Lived In</Label>
              <Input
                id="totalRegionsLived"
                type="number"
                placeholder="e.g., 3"
                value={profile.totalRegionsLived}
                onChange={(e) => setProfile(p => ({ ...p, totalRegionsLived: e.target.value }))}
                data-testid="input-total-regions"
              />
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
      </div>
    </div>
  );
}
