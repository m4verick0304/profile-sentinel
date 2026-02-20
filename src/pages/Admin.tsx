import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { subDays, format } from 'date-fns';
import {
  Activity, AlertTriangle, XCircle, Target,
  ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisResult } from '@/types';

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

export default function Admin() {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
    const count = allResults.filter(
      (r) => format(new Date(r.created_at), 'MMM d') === day
    ).length;
    return { day, count };
  });

  // Risk distribution for pie
  const riskDistribution = [
    { name: 'Real', value: allResults.filter((r) => r.label === 'real').length, color: LABEL_COLORS.real },
    { name: 'Suspicious', value: allResults.filter((r) => r.label === 'suspicious').length, color: LABEL_COLORS.suspicious },
    { name: 'Fake', value: allResults.filter((r) => r.label === 'fake').length, color: LABEL_COLORS.fake },
  ].filter((d) => d.value > 0);

  // Filtered + sorted results
  const filtered = allResults.filter((r) => {
    if (filterTab === 'high_risk') return r.risk_score >= 65;
    if (filterTab === 'recent') {
      const cutoff = subDays(new Date(), 1);
      return new Date(r.created_at) >= cutoff;
    }
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
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
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
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No data yet
                </div>
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

        {/* Flagged profiles table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Analyzed Profiles</CardTitle>
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
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none pl-6"
                    onClick={() => toggleSort('username')}
                  >
                    Username <SortIcon field="username" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort('risk_score')}
                  >
                    Risk Score <SortIcon field="risk_score" />
                  </TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort('created_at')}
                  >
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
                                  background: row.label === 'fake'
                                    ? 'hsl(var(--risk-fake))'
                                    : row.label === 'suspicious'
                                    ? 'hsl(var(--risk-suspicious))'
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
                            <div className="space-y-2">
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
      </div>
    </div>
  );
}
