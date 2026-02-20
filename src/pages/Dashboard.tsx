import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, History, TrendingUp, User, Link2, Sparkles, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Navbar } from '@/components/Navbar';
import { Particles } from '@/components/Particles';
import { AnimatedList } from '@/components/AnimatedList';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AnalysisResult, TopFactor } from '@/types';
import { useQuery } from '@tanstack/react-query';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  account_age: z.coerce.number().min(0, 'Must be 0 or more'),
  posts_count: z.coerce.number().min(0),
  followers_count: z.coerce.number().min(0),
  following_count: z.coerce.number().min(0),
  bio_length: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

type AnalysisPhase = 'idle' | 'loading' | 'results';

const labelConfig = {
  fake: {
    label: 'FAKE',
    color: 'bg-risk-fake text-risk-fake-foreground',
    icon: XCircle,
    bar: 'bg-risk-fake',
  },
  suspicious: {
    label: 'SUSPICIOUS',
    color: 'bg-risk-suspicious text-risk-suspicious-foreground',
    icon: AlertTriangle,
    bar: 'bg-risk-suspicious',
  },
  real: {
    label: 'REAL',
    color: 'bg-risk-real text-risk-real-foreground',
    icon: CheckCircle,
    bar: 'bg-risk-real',
  },
};

const impactColor = {
  high: 'text-risk-fake',
  medium: 'text-risk-suspicious',
  low: 'text-risk-real',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [result, setResult] = useState<{ risk_score: number; label: string; top_factors: TopFactor[]; id: string } | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [flags, setFlags] = useState({
    numbers_heavy: false,
    no_profile_pic: false,
    random_characters: false,
    very_short: false,
  });

  // URL scraping state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeConfidence, setScrapeConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [scrapePlatform, setScrapePlatform] = useState<string | null>(null);
  const [scrapeNotes, setScrapeNotes] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Recent scans
  const { data: recentScans, refetch: refetchScans } = useQuery({
    queryKey: ['recent-scans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as unknown as AnalysisResult[];
    },
    enabled: !!user,
  });

  const runLoadingAnimation = () => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 90) {
          setLoadingProgress(90);
          clearInterval(interval);
          resolve();
        } else {
          setLoadingProgress(progress);
        }
      }, 200);
    });
  };

  const onSubmit = async (data: FormData) => {
    setPhase('loading');
    setLoadingProgress(0);

    try {
      await runLoadingAnimation();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ...data, username_flags: flags }),
        }
      );

      if (!res.ok) throw new Error('Analysis failed');

      const analysisResult = await res.json();
      setLoadingProgress(100);

      setTimeout(() => {
        setResult(analysisResult);
        setPhase('results');
        refetchScans();
      }, 400);

    } catch (err) {
      console.error(err);
      toast.error('Analysis failed. Please try again.');
      setPhase('idle');
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    setScrapeConfidence(null);
    setScrapePlatform(null);
    setScrapeNotes(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url: scrapeUrl }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Scrape failed');

      const p = data.profile;
      // Auto-fill the form
      reset({
        username: p.username,
        account_age: p.account_age,
        posts_count: p.posts_count,
        followers_count: p.followers_count,
        following_count: p.following_count,
        bio_length: p.bio_length,
      });
      setFlags(p.username_flags);
      setScrapeConfidence(data.confidence);
      setScrapePlatform(data.platform);
      setScrapeNotes(data.notes);

      toast.success(`Profile data scraped from ${data.platform}! Review & run analysis.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to scrape profile');
    } finally {
      setIsScraping(false);
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setResult(null);
    setLoadingProgress(0);
    setScrapeUrl('');
    setScrapeConfidence(null);
    setScrapePlatform(null);
    setScrapeNotes(null);
    reset();
    setFlags({ numbers_heavy: false, no_profile_pic: false, random_characters: false, very_short: false });
  };

  const cfg = result ? labelConfig[result.label as keyof typeof labelConfig] : null;

  return (
    <div className="relative flex min-h-screen flex-col">
      <Particles quantity={50} color="#6366f1" staticity={70} size={0.4} opacity={0.3} />
      <Navbar />

      <div className="container flex-1 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Profile Analysis</h1>
          <p className="text-sm text-muted-foreground">Submit profile metrics to detect fake accounts instantly.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form / Loading / Results */}
          <div className="lg:col-span-2 space-y-6">

            {/* URL Scraper */}
            {phase === 'idle' && (
              <Card className="animate-fade-in border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Auto-fill from Social Media URL
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Paste a public profile URL — we'll scrape the data and fill the form automatically.
                    Supports Instagram, Twitter/X, TikTok, Reddit, YouTube, LinkedIn and more.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="https://instagram.com/username"
                        className="pl-9"
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                        disabled={isScraping}
                      />
                    </div>
                    <Button onClick={handleScrape} disabled={isScraping || !scrapeUrl.trim()} size="sm">
                      {isScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scrape'}
                    </Button>
                  </div>

                  {scrapePlatform && scrapeConfidence && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2.5 text-xs">
                      <Badge variant="outline" className="text-xs">{scrapePlatform}</Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${scrapeConfidence === 'high' ? 'border-risk-real text-risk-real' : scrapeConfidence === 'medium' ? 'border-risk-suspicious text-risk-suspicious' : 'border-risk-fake text-risk-fake'}`}
                      >
                        {scrapeConfidence} confidence
                      </Badge>
                      {scrapeNotes && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Info className="h-3 w-3" />
                          {scrapeNotes}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    ⚠️ Only works on public profiles. Some platforms (Instagram, Twitter) may restrict scraping — review extracted data before running analysis.
                  </p>
                </CardContent>
              </Card>
            )}

            <Separator className={phase === 'idle' ? 'opacity-50' : 'hidden'} />

            {/* IDLE — Form */}
            {phase === 'idle' && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-base">Profile Data</CardTitle>
                  <CardDescription>
                    {scrapeConfidence ? 'Review the auto-filled data below and adjust if needed.' : "Enter the target account's metrics below."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="@handle" {...register('username')} />
                        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="account_age">Account Age (days)</Label>
                        <Input id="account_age" type="number" placeholder="365" {...register('account_age')} />
                        {errors.account_age && <p className="text-xs text-destructive">{errors.account_age.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="posts_count">Posts Count</Label>
                        <Input id="posts_count" type="number" placeholder="120" {...register('posts_count')} />
                        {errors.posts_count && <p className="text-xs text-destructive">{errors.posts_count.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="followers_count">Followers</Label>
                        <Input id="followers_count" type="number" placeholder="500" {...register('followers_count')} />
                        {errors.followers_count && <p className="text-xs text-destructive">{errors.followers_count.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="following_count">Following</Label>
                        <Input id="following_count" type="number" placeholder="300" {...register('following_count')} />
                        {errors.following_count && <p className="text-xs text-destructive">{errors.following_count.message}</p>}
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="bio_length">Bio Length (characters)</Label>
                        <Input id="bio_length" type="number" placeholder="80" {...register('bio_length')} />
                        {errors.bio_length && <p className="text-xs text-destructive">{errors.bio_length.message}</p>}
                      </div>
                    </div>

                    {/* Username flags */}
                    <div className="space-y-2">
                      <Label>Username Flags</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['numbers_heavy', 'Numbers-heavy username'],
                          ['no_profile_pic', 'No profile picture'],
                          ['random_characters', 'Random characters'],
                          ['very_short', 'Very short username'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked={flags[key]}
                              onCheckedChange={(checked) =>
                                setFlags((f) => ({ ...f, [key]: !!checked }))
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Analyze Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* LOADING */}
            {phase === 'loading' && (
              <Card className="animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium">Analyzing profile data...</p>
                    <p className="text-sm text-muted-foreground">Running ML scoring algorithm</p>
                  </div>
                  <div className="w-full max-w-xs space-y-1.5">
                    <Progress value={loadingProgress} className="h-1.5" />
                    <p className="text-center text-xs text-muted-foreground">{Math.round(loadingProgress)}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RESULTS */}
            {phase === 'results' && result && cfg && (
              <div className="space-y-4 animate-slide-up">
                {/* Score + Badge */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                      {/* Circular score */}
                      <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke={result.label === 'fake' ? 'hsl(var(--risk-fake))' : result.label === 'suspicious' ? 'hsl(var(--risk-suspicious))' : 'hsl(var(--risk-real))'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - result.risk_score / 100)}`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{result.risk_score}</div>
                          <div className="text-xs text-muted-foreground">/ 100</div>
                        </div>
                      </div>

                      <div className="flex-1 text-center sm:text-left">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${cfg.color}`}>
                          <cfg.icon className="h-4 w-4" />
                          {cfg.label}
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Risk score of <strong>{result.risk_score}/100</strong> — this account was classified as <strong>{result.label}</strong> based on the signals below.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={handleReset}>
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            Analyze Another
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top factors */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {(result.top_factors as TopFactor[]).map((f, i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 text-xs font-bold uppercase ${impactColor[f.impact]}`}>
                            {f.impact}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{f.factor}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Recent Scans */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {!recentScans || recentScans.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No scans yet</p>
                ) : (
                  <AnimatedList
                    items={recentScans}
                    className="h-64"
                    showGradients
                    displayScrollbar={false}
                    renderItem={(scan, _, isSelected) => {
                      const lcfg = labelConfig[scan.label as keyof typeof labelConfig];
                      return (
                        <div className={`flex items-center justify-between rounded-md border p-2.5 my-1 transition-colors ${isSelected ? 'border-primary/40 bg-accent/50' : 'hover:bg-muted/40'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">{scan.username}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-xs text-muted-foreground">{scan.risk_score}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lcfg.color}`}>
                              {lcfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
