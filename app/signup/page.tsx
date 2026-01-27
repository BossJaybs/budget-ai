'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
   const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'verification' | 'completed'>('email');
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Countdown timer for code expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeRemaining > 0 && step === 'verification') {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setStep('email');
            setError('Verification code expired. Please start over.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeRemaining, step]);

  // Start signup (send OTP)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    console.log('🚀 Starting signup process for:', email);

    try {
      console.log('📡 Calling /api/signup...');
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📡 Response data:', result);

      if (!response.ok) {
        console.error('❌ Signup API error:', result);
        throw new Error(result.error || 'Failed to send verification code');
      }

      console.log('✅ Signup successful, moving to verification step');
      setStep('verification');
      setMessage('Verification code sent to your email. Please enter it below.');
      setTimeRemaining(300); // 5 minutes

      // For testing without Gmail, show the code in console
      console.log('🎯 TEST MODE: Check server logs for verification code');
    } catch (err: any) {
      console.error('❌ Signup error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    console.log('🔍 Starting verification process');
    console.log('Email:', email.trim());
    console.log('Code:', verificationCode.trim());

    try {
      console.log('📡 Calling /api/verify...');
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
          password: password
        }),
      });

      console.log('📡 Verify response status:', response.status);
      const result = await response.json();
      console.log('📡 Verify response data:', result);

      if (!response.ok) {
        console.error('❌ Verification failed:', result);
        throw new Error(result.error || 'Verification failed');
      }

      console.log('✅ Verification successful!');
      setStep('completed');
      setMessage('Signup completed successfully! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset flow
  const handleStartOver = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setVerificationCode('');
    setError('');
    setMessage('');
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to your account
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {step === 'email' && 'Sign Up'}
              {step === 'verification' && 'Verify Your Email'}
              {step === 'completed' && 'Account Created!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 'email' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                {loading && (
                  <div className="flex flex-col items-center space-y-2 py-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-sm text-indigo-600 font-medium animate-pulse">
                      Sending verification code...
                    </span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === 'verification' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 text-indigo-600" />
                  <p className="mt-2 text-sm text-gray-600">
                    We've sent a verification code to <strong>{email}</strong>
                  </p>
                </div>

                <div>
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    disabled={loading}
                  />
                </div>
                {timeRemaining > 0 && (
                  <small className="text-center block text-gray-500">
                    Code expires in: <span className="font-mono">{formatTime(timeRemaining)}</span>
                  </small>
                )}

                <Button type="submit" className="w-full" disabled={loading || timeRemaining === 0}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Create Account'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleStartOver}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              </form>
            )}

            {step === 'completed' && (
              <div className="text-center space-y-4 py-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <CheckCircle className="mx-auto h-16 w-16 text-green-600 relative z-10" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Account Created Successfully!</h3>
                  <p className="text-sm text-gray-600 mt-2">Redirecting to login page...</p>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && !error && step !== 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Alternative signup with Google */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
