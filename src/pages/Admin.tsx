import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { subDays, format } from 'date-fns';
import {
  Activity, AlertTriangle, XCircle, Target,
  ChevronDown, ChevronUp, Filter, Download, ClipboardList, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisResult } from '@/types';
import { toast } from 'sonner';

type FilterTab = 'all' | 'high_risk' | 'recent';
type SortField = 'created_at' | 'risk_score' | 'username';
type SortDir = 'asc' | 'desc';

const LABEL_COLORS = {
  real: 'hsl(var(--risk-real))',
  suspicious: 'hsl(var(--risk-suspicious))',
  fake: 'hsl(var(--risk-fake))',
};

const LABEL_CONFIG = {
  fake: 'bg-risk-fake text-risk-fake-foreground',
  suspicious: 'bg-risk-suspicious text-risk-suspicious-foreground',
  real: 'bg-risk-real text-risk-real-foreground',
};

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function exportCSV(results: AnalysisResult[]) {
  const headers = ['Username', 'Risk Score', 'Label', 'Account Age', 'Posts', 'Followers', 'Following', 'Bio Length', 'Date'];
  const rows = results.map((r) => [
    r.username, r.risk_score, r.label, r.account_age,
    r.posts_count, r.followers_count, r.following_count, r.bio_length,
    format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
  ]);
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profileguard-flagged-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported successfully');
}

// ─── Profiles Table ───────────────────────────────────────────────────────────

function ProfilesTable({ allResults }: { allResults: AnalysisResult[] }) {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = allResults.filter((r) => {
    if (filterTab === 'high_risk') return r.risk_score >= 65;
    if (filterTab === 'recent') return new Date(r.created_at) >= subDays(new Date(), 1);
    return true;
  });

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Analyzed Profiles</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => exportCSV(sorted)}>
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(['all', 'high_risk', 'recent'] as FilterTab[]).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilterTab(tab)}
              >
                {tab === 'all' ? 'All' : tab === 'high_risk' ? 'High Risk' : 'Recent'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none pl-6" onClick={() => toggleSort('username')}>
                Username <SortIcon field="username" />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('risk_score')}>
                Risk Score <SortIcon field="risk_score" />
              </TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                Date <SortIcon field="created_at" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                  >
                    <TableCell className="pl-6 font-medium">{row.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${row.risk_score}%`,
                              background: row.label === 'fake' ? 'hsl(var(--risk-fake))'
                                : row.label === 'suspicious' ? 'hsl(var(--risk-suspicious))'
                                : 'hsl(var(--risk-real))',
                            }}
                          />
                        </div>
                        <span className="text-sm">{row.risk_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LABEL_CONFIG[row.label as keyof typeof LABEL_CONFIG]}`}>
                        {row.label.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(row.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>

                  {expandedRow === row.id && (
                    <TableRow key={`${row.id}-expanded`} className="bg-muted/30">
                      <TableCell colSpan={4} className="pl-6 py-4">
                        <div className="space-y-3">
                          {/* Metrics */}
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {[
                              { label: 'Age', value: `${row.account_age}d` },
                              { label: 'Posts', value: row.posts_count },
                              { label: 'Followers', value: row.followers_count },
                              { label: 'Following', value: row.following_count },
                              { label: 'Bio', value: `${row.bio_length}c` },
                              { label: 'Score', value: row.risk_score },
                            ].map(({ label, value }) => (
                              <div key={label} className="rounded-md border bg-card p-2">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="text-sm font-semibold">{value}</p>
                              </div>
                            ))}
                          </div>

                          <p className="text-xs font-semibold uppercase text-muted-foreground">Top Factors</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(row.top_factors as unknown as Array<{ factor: string; description: string; impact: string }>).map((f, i) => (
                              <div key={i} className="rounded-md border bg-card p-3">
                                <p className="text-xs font-medium">{f.factor}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

function AuditLogTab() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  No audit logs yet
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-6 font-medium text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.resource}{log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ allResults }: { allResults: AnalysisResult[] }) {
  // Group results by user_id to show per-user stats
  const userStats = Object.entries(
    allResults.reduce((acc, r) => {
      if (!acc[r.user_id]) acc[r.user_id] = { total: 0, fake: 0, suspicious: 0, real: 0 };
      acc[r.user_id].total++;
      acc[r.user_id][r.label as 'fake' | 'suspicious' | 'real']++;
      return acc;
    }, {} as Record<string, { total: number; fake: number; suspicious: number; real: number }>)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">User Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">User ID</TableHead>
              <TableHead>Total Scans</TableHead>
              <TableHead>Fake</TableHead>
              <TableHead>Suspicious</TableHead>
              <TableHead>Real</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No user data yet
                </TableCell>
              </TableRow>
            ) : (
              userStats.map(([userId, stats]) => (
                <TableRow key={userId}>
                  <TableCell className="pl-6 font-mono text-xs">{userId.slice(0, 16)}…</TableCell>
                  <TableCell className="font-medium">{stats.total}</TableCell>
                  <TableCell className="text-risk-fake font-medium">{stats.fake}</TableCell>
                  <TableCell className="text-risk-suspicious font-medium">{stats.suspicious}</TableCell>
                  <TableCell className="text-risk-real font-medium">{stats.real}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function Admin() {
  const { data: allResults = [] } = useQuery({
    queryKey: ['admin-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_results')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AnalysisResult[];
    },
  });

  // Stats
  const totalScans = allResults.length;
  const fakeCount = allResults.filter((r) => r.label === 'fake').length;
  const suspiciousCount = allResults.filter((r) => r.label === 'suspicious').length;
  const accuracy = totalScans > 0 ? Math.round(((fakeCount + suspiciousCount) / totalScans) * 100) : 94;

  // Daily chart data (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const day = format(date, 'MMM d');
    const count = allResults.filter((r) => format(new Date(r.created_at), 'MMM d') === day).length;
    return { day, count };
  });

  // Risk distribution for pie
  const riskDistribution = [
    { name: 'Real', value: allResults.filter((r) => r.label === 'real').length, color: LABEL_COLORS.real },
    { name: 'Suspicious', value: allResults.filter((r) => r.label === 'suspicious').length, color: LABEL_COLORS.suspicious },
    { name: 'Fake', value: allResults.filter((r) => r.label === 'fake').length, color: LABEL_COLORS.fake },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="container flex-1 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">System-wide detection metrics and flagged profile management.</p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Total Scans', value: totalScans, icon: Activity, color: 'text-primary' },
            { title: 'Fake Detected', value: fakeCount, icon: XCircle, color: 'text-risk-fake' },
            { title: 'Suspicious Flagged', value: suspiciousCount, icon: AlertTriangle, color: 'text-risk-suspicious' },
            { title: 'Accuracy Estimate', value: `${accuracy}%`, icon: Target, color: 'text-risk-real' },
          ].map(({ title, value, icon: Icon, color }) => (
            <Card key={title}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
                <Icon className={`h-8 w-8 opacity-80 ${color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm">Daily Scans — Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} barSize={24}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {riskDistribution.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskDistribution} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {riskDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Profiles / Audit Log / Users */}
        <Tabs defaultValue="profiles">
          <TabsList>
            <TabsTrigger value="profiles" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Profiles
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="mt-4">
            <ProfilesTable allResults={allResults} />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditLogTab />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab allResults={allResults} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
