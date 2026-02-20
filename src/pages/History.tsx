import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search, Filter, ChevronDown, ChevronUp, User,
  AlertTriangle, CheckCircle, XCircle, Calendar, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnalysisResult, TopFactor } from '@/types';

type FilterLabel = 'all' | 'real' | 'suspicious' | 'fake';
type SortField = 'created_at' | 'risk_score' | 'username';
type SortDir = 'asc' | 'desc';

const labelConfig = {
  fake: {
    label: 'FAKE',
    color: 'bg-risk-fake text-risk-fake-foreground',
    icon: XCircle,
    bar: 'hsl(var(--risk-fake))',
  },
  suspicious: {
    label: 'SUSPICIOUS',
    color: 'bg-risk-suspicious text-risk-suspicious-foreground',
    icon: AlertTriangle,
    bar: 'hsl(var(--risk-suspicious))',
  },
  real: {
    label: 'REAL',
    color: 'bg-risk-real text-risk-real-foreground',
    icon: CheckCircle,
    bar: 'hsl(var(--risk-real))',
  },
};

const impactColor = {
  high: 'text-risk-fake',
  medium: 'text-risk-suspicious',
  low: 'text-risk-real',
};

function exportCSV(results: AnalysisResult[]) {
  const headers = ['Username', 'Risk Score', 'Label', 'Account Age', 'Posts', 'Followers', 'Following', 'Bio Length', 'Date'];
  const rows = results.map((r) => [
    r.username,
    r.risk_score,
    r.label,
    r.account_age,
    r.posts_count,
    r.followers_count,
    r.following_count,
    r.bio_length,
    format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
  ]);
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profileguard-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState<FilterLabel>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_results')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AnalysisResult[];
    },
    enabled: !!user,
  });

  // Filter + search + sort
  const filtered = results
    .filter((r) => filterLabel === 'all' || r.label === filterLabel)
    .filter((r) => !search || r.username.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'risk_score') return (a.risk_score - b.risk_score) * mult;
    if (sortField === 'username') return a.username.localeCompare(b.username) * mult;
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mult;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortDir === 'desc' ? <ChevronDown className="ml-1 inline h-3 w-3" /> : <ChevronUp className="ml-1 inline h-3 w-3" />
      : null;

  // Summary stats
  const totalScans = results.length;
  const fakeCount = results.filter((r) => r.label === 'fake').length;
  const suspiciousCount = results.filter((r) => r.label === 'suspicious').length;
  const avgScore = totalScans > 0 ? Math.round(results.reduce((s, r) => s + r.risk_score, 0) / totalScans) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="container flex-1 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scan History</h1>
            <p className="text-sm text-muted-foreground">All your past profile analyses in one place.</p>
          </div>
          {sorted.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportCSV(sorted)}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Scans', value: totalScans, color: 'text-primary' },
            { label: 'Fake Detected', value: fakeCount, color: 'text-risk-fake' },
            { label: 'Suspicious', value: suspiciousCount, color: 'text-risk-suspicious' },
            { label: 'Avg Risk Score', value: avgScore, color: 'text-foreground' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters + search */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search username..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                {(['all', 'real', 'suspicious', 'fake'] as FilterLabel[]).map((tab) => (
                  <Button
                    key={tab}
                    variant={filterLabel === tab ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs capitalize"
                    onClick={() => setFilterLabel(tab)}
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {results.length === 0 ? "You haven't run any analyses yet." : "No results match your filters."}
              </div>
            ) : (
              <div className="divide-y">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <button className="col-span-4 text-left flex items-center" onClick={() => toggleSort('username')}>
                    Username <SortIcon field="username" />
                  </button>
                  <button className="col-span-2 text-left flex items-center" onClick={() => toggleSort('risk_score')}>
                    Score <SortIcon field="risk_score" />
                  </button>
                  <div className="col-span-2">Label</div>
                  <button className="col-span-3 text-left flex items-center" onClick={() => toggleSort('created_at')}>
                    <Calendar className="mr-1 h-3 w-3" />Date <SortIcon field="created_at" />
                  </button>
                  <div className="col-span-1" />
                </div>

                {/* Table rows */}
                {sorted.map((row) => {
                  const cfg = labelConfig[row.label as keyof typeof labelConfig];
                  const isExpanded = expandedId === row.id;
                  return (
                    <div key={row.id}>
                      <div
                        className="grid grid-cols-12 gap-2 items-center px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        {/* Username */}
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{row.username}</span>
                        </div>

                        {/* Risk score bar */}
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted flex-shrink-0">
                            <div className="h-full rounded-full" style={{ width: `${row.risk_score}%`, background: cfg.bar }} />
                          </div>
                          <span className="text-sm font-medium">{row.risk_score}</span>
                        </div>

                        {/* Label */}
                        <div className="col-span-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="col-span-3 text-xs text-muted-foreground">
                          {format(new Date(row.created_at), 'MMM d, yyyy HH:mm')}
                        </div>

                        {/* Expand arrow */}
                        <div className="col-span-1 flex justify-end">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20 px-4 py-4">
                          {/* Input metrics */}
                          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                            {[
                              { label: 'Account Age', value: `${row.account_age}d` },
                              { label: 'Posts', value: row.posts_count },
                              { label: 'Followers', value: row.followers_count.toLocaleString() },
                              { label: 'Following', value: row.following_count.toLocaleString() },
                              { label: 'Bio Length', value: `${row.bio_length}c` },
                              { label: 'Risk Score', value: row.risk_score },
                            ].map(({ label, value }) => (
                              <div key={label} className="rounded-md border bg-card p-2.5">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="mt-0.5 text-sm font-semibold">{value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Top factors */}
                          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Detection Factors</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(row.top_factors as unknown as TopFactor[]).map((f, i) => (
                              <div key={i} className="rounded-md border bg-card p-3">
                                <div className="flex items-start gap-2">
                                  <span className={`mt-0.5 text-xs font-bold uppercase ${impactColor[f.impact]}`}>{f.impact}</span>
                                  <div>
                                    <p className="text-xs font-medium">{f.factor}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {sorted.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Showing {sorted.length} of {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
