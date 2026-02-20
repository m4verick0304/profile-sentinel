import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Save, Loader2, Activity, XCircle, AlertTriangle,
  CheckCircle, TrendingUp, Calendar, Mail, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnalysisResult } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Settings() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch scan stats
  const { data: results = [] } = useQuery({
    queryKey: ['settings-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_results')
        .select('risk_score, label, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Pick<AnalysisResult, 'risk_score' | 'label' | 'created_at'>[];
    },
    enabled: !!user,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { display_name: profile?.display_name ?? '' },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user!.id, display_name: data.display_name, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Profile updated!');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  // Compute stats
  const totalScans = results.length;
  const fakeCount = results.filter((r) => r.label === 'fake').length;
  const suspiciousCount = results.filter((r) => r.label === 'suspicious').length;
  const realCount = results.filter((r) => r.label === 'real').length;
  const avgScore = totalScans > 0
    ? Math.round(results.reduce((s, r) => s + r.risk_score, 0) / totalScans)
    : 0;
  const detectionRate = totalScans > 0
    ? Math.round(((fakeCount + suspiciousCount) / totalScans) * 100)
    : 0;
  const lastScan = results[0]?.created_at
    ? format(new Date(results[0].created_at), 'MMM d, yyyy')
    : 'Never';

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'MMMM yyyy')
    : '—';

  const stats = [
    { label: 'Total Scans', value: totalScans, icon: Activity, color: 'text-primary' },
    { label: 'Fake Detected', value: fakeCount, icon: XCircle, color: 'text-risk-fake' },
    { label: 'Suspicious', value: suspiciousCount, icon: AlertTriangle, color: 'text-risk-suspicious' },
    { label: 'Real Profiles', value: realCount, icon: CheckCircle, color: 'text-risk-real' },
    { label: 'Avg Risk Score', value: avgScore, icon: TrendingUp, color: 'text-foreground' },
    { label: 'Detection Rate', value: `${detectionRate}%`, icon: Shield, color: 'text-primary' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="container max-w-3xl flex-1 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and view your account statistics.</p>
        </div>

        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your display name and account details.</CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading profile…
              </div>
            ) : (
              <form onSubmit={handleSubmit((d) => updateProfile.mutate(d))} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input id="display_name" placeholder="Your name" {...register('display_name')} />
                  {errors.display_name && (
                    <p className="text-xs text-destructive">{errors.display_name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    {user?.email ?? '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="capitalize">{userRole ?? 'user'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Member Since</Label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    {memberSince}
                  </div>
                </div>

                <Button type="submit" disabled={updateProfile.isPending || saved}>
                  {updateProfile.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Stats */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Account Statistics</h2>
            <p className="text-sm text-muted-foreground">
              Your detection activity since joining.
              {totalScans > 0 && (
                <span className="ml-1 text-muted-foreground">Last scan: {lastScan}.</span>
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`h-7 w-7 opacity-70 ${color}`} />
                </CardContent>
              </Card>
            ))}
          </div>

          {totalScans === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No scans yet — run your first profile analysis from the dashboard.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
