import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, Briefcase, GraduationCap, Globe, Calendar, Save, Loader2 } from 'lucide-react';
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

export default function ProfileTab() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

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
      } catch (err) {
        console.log('Profile not found, will create on save');
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [user?.id, supabase]);

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

      toast({
        title: 'Profile saved',
        description: 'Your demographic information has been updated.',
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
            Manage your demographic information for longitudinal tracking
          </p>
        </div>
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
          Save Profile
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
              Career & Profession
            </CardTitle>
            <CardDescription>
              Your current professional situation
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
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Education & Economics
            </CardTitle>
            <CardDescription>
              Your educational background and household information
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
              <Label htmlFor="householdIncome">Household Income</Label>
              <Select 
                value={profile.householdIncome} 
                onValueChange={(value) => setProfile(p => ({ ...p, householdIncome: value }))}
              >
                <SelectTrigger data-testid="select-household-income">
                  <SelectValue placeholder="Select bracket" />
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
              Parental Context
            </CardTitle>
            <CardDescription>
              Information about your childhood background for social mobility insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="parentalIncome">Parent's Income Level (during childhood)</Label>
              <Select 
                value={profile.parentalIncome} 
                onValueChange={(value) => setProfile(p => ({ ...p, parentalIncome: value }))}
              >
                <SelectTrigger data-testid="select-parental-income">
                  <SelectValue placeholder="Select bracket" />
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
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Life Events (Last 12 Months)
          </CardTitle>
          <CardDescription>
            Major life changes that may correlate with personality shifts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {lifeEventOptions.map((event) => (
              <div key={event.key} className="flex items-center gap-3">
                <Checkbox
                  id={event.key}
                  checked={lifeEvents[event.key as keyof typeof lifeEvents] as boolean}
                  onCheckedChange={(checked) => 
                    setLifeEvents(prev => ({ ...prev, [event.key]: checked === true }))
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
            <Label htmlFor="otherEvent">Other Significant Events</Label>
            <Textarea
              id="otherEvent"
              placeholder="Describe any other major life changes..."
              value={lifeEvents.otherEvent}
              onChange={(e) => setLifeEvents(prev => ({ ...prev, otherEvent: e.target.value }))}
              className="resize-none"
              data-testid="textarea-other-event"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
