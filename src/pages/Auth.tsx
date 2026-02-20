import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Eye, EyeOff, Loader2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const phoneSchema = z.object({
  phone: z.string().min(8, 'Enter a valid phone number'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

interface AuthPageProps {
  mode: 'login' | 'signup';
}

type AuthTab = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp';

// ─── Helpers ────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

// ─── Email Auth Form ─────────────────────────────────────────────────────────

function EmailAuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLogin = mode === 'login';
  const schema = isLogin ? loginSchema : signupSchema;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm | SignupForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm | SignupForm) => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: (data as LoginForm).email,
          password: (data as LoginForm).password,
        });
        if (error) throw error;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
          toast.success('Welcome back!');
          navigate(roleData?.role === 'admin' ? '/admin' : '/dashboard');
        }
      } else {
        const signupData = data as SignupForm;
        const { error } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            data: { display_name: signupData.displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Account created! Please check your email to confirm.');
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!isLogin && (
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Full Name</Label>
          <Input id="displayName" placeholder="John Doe" {...register('displayName' as keyof (LoginForm | SignupForm))} />
          {(errors as Record<string, { message?: string }>).displayName && (
            <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).displayName?.message}</p>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-10" {...register('password')} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      {!isLogin && (
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword' as keyof (LoginForm | SignupForm))} />
          {(errors as Record<string, { message?: string }>).confirmPassword && (
            <p className="text-xs text-destructive">{(errors as Record<string, { message?: string }>).confirmPassword?.message}</p>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLogin ? 'Sign In' : 'Create Account'}
      </Button>
    </form>
  );
}

// ─── Phone Auth Form ──────────────────────────────────────────────────────────

function PhoneAuthForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<PhoneStep>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const sendOtp = async (data: PhoneForm) => {
    setLoading(true);
    try {
      const formatted = data.phone.startsWith('+') ? data.phone : `+${data.phone}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
      setPhone(formatted);
      setStep('otp');
      toast.success('OTP sent to your phone!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (data: OtpForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: data.otp, type: 'sms' });
      if (error) throw error;
      toast.success('Signed in successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="otp">Verification Code</Label>
          <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to {phone}</p>
          <Input id="otp" placeholder="123456" maxLength={6} {...otpForm.register('otp')} />
          {otpForm.formState.errors.otp && <p className="text-xs text-destructive">{otpForm.formState.errors.otp.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify Code
        </Button>
        <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep('phone')}>
          ← Use a different number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={phoneForm.handleSubmit(sendOtp)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...phoneForm.register('phone')} />
        {phoneForm.formState.errors.phone && <p className="text-xs text-destructive">{phoneForm.formState.errors.phone.message}</p>}
        <p className="text-xs text-muted-foreground">Include country code (e.g. +1 for US)</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Phone className="mr-2 h-4 w-4" />
        Send Code
      </Button>
    </form>
  );
}

// ─── Main Auth Page ────────────────────────────────────────────────────────────

export default function Auth({ mode }: AuthPageProps) {
  const [authTab, setAuthTab] = useState<AuthTab>('email');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const isLogin = mode === 'login';

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result?.error) throw result.error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Link to="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold">ProfileGuard</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? 'Welcome back' : 'Create your account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to access your dashboard' : 'Start detecting fake profiles today'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
            >
              {oauthLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              <span className="ml-2">Google</span>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuth('apple')}
              disabled={!!oauthLoading}
            >
              {oauthLoading === 'apple' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon />}
              <span className="ml-2">Apple</span>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Tab switcher: Email / Phone */}
          <div className="flex rounded-lg border p-1 gap-1">
            <button
              type="button"
              onClick={() => setAuthTab('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                authTab === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                authTab === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              Phone
            </button>
          </div>

          {/* Form content */}
          {authTab === 'email' ? (
            <EmailAuthForm mode={mode} />
          ) : (
            <PhoneAuthForm />
          )}

          {/* Switch between login / signup */}
          {authTab === 'email' && (
            <div className="text-center text-sm text-muted-foreground">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
