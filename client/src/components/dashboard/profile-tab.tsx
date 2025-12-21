import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Briefcase, GraduationCap, Globe, Calendar, Save, Loader2, Mail, Phone, Lock, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  maritalStatusOptions,
  culturalBackgroundOptions,
  educationLevelOptions,
  incomeOptions,
  lifeEventOptions,
} from '@shared/schema';

interface ProfileData {
  maritalStatus: string;
  yearsInCurrentRegion: string;
  culturalBackground: string;
  profession: string;
  industry: string;
  educationLevel: string;
  householdIncome: string;
  parentalOccupation: string;
  parentalIncome: string;
}

interface LifeEventsData {
  newJob: boolean;
  relocation: boolean;
  marriage: boolean;
  divorce: boolean;
  lossOfLovedOne: boolean;
  newChild: boolean;
  healthChange: boolean;
  retirement: boolean;
  otherEvent: string;
}

interface AccountData {
  displayName: string;
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
    householdIncome: '',
    parentalOccupation: '',
    parentalIncome: '',
  });

  const [lifeEvents, setLifeEvents] = useState<LifeEventsData>({
    newJob: false,
    relocation: false,
    marriage: false,
    divorce: false,
    lossOfLovedOne: false,
    newChild: false,
    healthChange: false,
    retirement: false,
    otherEvent: '',
  });

  useEffect(() => {
    if (user) {
      setAccount({
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || '',
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
            householdIncome: data.household_income || '',
            parentalOccupation: data.parental_occupation || '',
            parentalIncome: data.parental_income || '',
          });
        }

        const { data: lifeEventsData } = await supabase
          .from('life_events')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (lifeEventsData) {
          setLifeEvents({
            newJob: lifeEventsData.new_job || false,
            relocation: lifeEventsData.relocation || false,
            marriage: lifeEventsData.marriage || false,
            divorce: lifeEventsData.divorce || false,
            lossOfLovedOne: lifeEventsData.loss_of_loved_one || false,
            newChild: lifeEventsData.new_child || false,
            healthChange: lifeEventsData.health_change || false,
            retirement: lifeEventsData.retirement || false,
            otherEvent: lifeEventsData.other_event || '',
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
          full_name: account.displayName,
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
        household_income: profile.householdIncome || null,
        parental_occupation: profile.parentalOccupation || null,
        parental_income: profile.parentalIncome || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      const lifeEventsData = {
        user_id: user.id,
        new_job: lifeEvents.newJob,
        relocation: lifeEvents.relocation,
        marriage: lifeEvents.marriage,
        divorce: lifeEvents.divorce,
        loss_of_loved_one: lifeEvents.lossOfLovedOne,
        new_child: lifeEvents.newChild,
        health_change: lifeEvents.healthChange,
        retirement: lifeEvents.retirement,
        other_event: lifeEvents.otherEvent || null,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('life_events')
        .upsert(lifeEventsData, { onConflict: 'user_id' });

      const snapshot = {
        profile: profileData,
        lifeEvents: lifeEventsData,
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
                placeholder="Your name"
                value={account.displayName}
                onChange={(e) => setAccount(a => ({ ...a, displayName: e.target.value }))}
                data-testid="input-display-name"
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
              <Label htmlFor="maritalStatus">Marital Status</Label>
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
              <Label htmlFor="culturalBackground">Cultural Background</Label>
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
              <Label htmlFor="profession">Profession / Job Title</Label>
              <Input
                id="profession"
                placeholder="e.g., Software Engineer"
                value={profile.profession}
                onChange={(e) => setProfile(p => ({ ...p, profession: e.target.value }))}
                data-testid="input-profession"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology"
                value={profile.industry}
                onChange={(e) => setProfile(p => ({ ...p, industry: e.target.value }))}
                data-testid="input-industry"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="householdIncome">Household Income</Label>
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
              <Label htmlFor="educationLevel">Education Level</Label>
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
              <Label htmlFor="parentalOccupation">Parent's Primary Occupation</Label>
              <Input
                id="parentalOccupation"
                placeholder="e.g., Teacher"
                value={profile.parentalOccupation}
                onChange={(e) => setProfile(p => ({ ...p, parentalOccupation: e.target.value }))}
                data-testid="input-parental-occupation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentalIncome">Parent's Income Level (Growing Up)</Label>
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
              <Calendar className="w-5 h-5 text-primary" />
              Life Events (Past 12 Months)
            </CardTitle>
            <CardDescription>
              Major life changes that may influence your personality expression
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lifeEventOptions.map((event) => (
                <div key={event.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.key}
                    checked={lifeEvents[event.key as keyof Omit<LifeEventsData, 'otherEvent'>] as boolean}
                    onCheckedChange={(checked) => 
                      setLifeEvents(le => ({ ...le, [event.key]: checked }))
                    }
                    data-testid={`checkbox-${event.key}`}
                  />
                  <Label htmlFor={event.key} className="text-sm cursor-pointer">
                    {event.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="otherEvent">Other Significant Event</Label>
              <Textarea
                id="otherEvent"
                placeholder="Describe any other major life change..."
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
