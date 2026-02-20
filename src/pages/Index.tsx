import { Link } from 'react-router-dom';
import { Shield, Zap, BarChart3, Lock, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Aurora } from '@/components/Aurora';
import { Particles } from '@/components/Particles';
import { TextPressure } from '@/components/TextPressure';
import { MagnetLines } from '@/components/MagnetLines';

const features = [
  {
    icon: Zap,
    title: 'Instant AI Analysis',
    description: 'Submit profile data and get a risk score with detailed explanations in under 3 seconds.',
  },
  {
    icon: Shield,
    title: 'Multi-Signal Detection',
    description: 'Combines account age, follower ratios, posting patterns, and username signals.',
  },
  {
    icon: BarChart3,
    title: 'Admin Insights',
    description: 'Centralized dashboard for monitoring trends, flagged profiles, and detection accuracy.',
  },
  {
    icon: Lock,
    title: 'Enterprise-Ready',
    description: 'Built with role-based access, encrypted storage, and audit-grade logging.',
  },
];

const steps = [
  { step: '01', title: 'Submit Profile Data', desc: 'Enter the target account\'s metrics into our structured form.' },
  { step: '02', title: 'AI Analyzes Signals', desc: 'Our ML model evaluates dozens of behavioral and structural signals.' },
  { step: '03', title: 'Get Clear Results', desc: 'Receive a risk score, classification label, and factor breakdown.' },
];

const stats = [
  { value: '200K+', label: 'Profiles Scanned' },
  { value: '94%', label: 'Detection Accuracy' },
  { value: '< 3s', label: 'Analysis Time' },
  { value: '99.9%', label: 'Uptime SLA' },
];

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-24 text-center md:py-36">
        {/* Aurora background */}
        <div className="absolute inset-0 -z-10">
          <Aurora
            colorStops={["#4f46e5", "#7c3aed", "#6366f1"]}
            speed={0.4}
            blend={0.6}
            amplitude={1.2}
            className="w-full h-full"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-background/60" />
        <Particles quantity={40} color="#6366f1" staticity={60} size={0.5} opacity={0.4} />

        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-real animate-pulse-slow" />
          AI-Powered Detection — Now in Beta
        </div>

        <div className="w-full max-w-3xl mb-2">
          <TextPressure
            text="Detect Fake Profiles"
            weight
            width
            italic
            textColor="currentColor"
            className="h-16 sm:h-20 md:h-24"
            minFontSize={28}
          />
        </div>

        <h2 className="text-3xl font-bold text-primary tracking-tight sm:text-4xl">
          Before They Cause Harm
        </h2>

        <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          ProfileGuard uses machine learning to analyze social media accounts and surface fraud signals
          in seconds — with explainable results your team can act on.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/signup">
              Try Free Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          {['No credit card required', 'Free tier available', 'SOC 2 compliant'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-risk-real" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-muted/40">
        <div className="container grid grid-cols-2 gap-4 py-10 md:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-foreground">{value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Built for trust and scale</h2>
          <p className="mt-3 text-muted-foreground">
            Every feature is designed to give your team signal clarity at speed.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative bg-muted/40 py-20 overflow-hidden">
        {/* MagnetLines background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-60">
          <MagnetLines
            rows={10}
            columns={18}
            containerSize="100%"
            lineHeight="22px"
            lineWidth="1.5px"
            baseAngle={-5}
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="container relative z-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three steps from submission to clarity.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(({ step, title, desc }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-background text-lg font-bold text-primary">
                  {step}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="absolute right-0 top-5 hidden h-6 w-6 text-muted-foreground md:block" />
                )}
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Ready to protect your platform?</h2>
        <p className="mt-3 text-muted-foreground">Start detecting fake accounts today, free.</p>
        <Button size="lg" className="mt-8" asChild>
          <Link to="/signup">
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">ProfileGuard</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
