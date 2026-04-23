import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import OtpInput from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resendSeconds) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', form);
      setPendingEmail(data.email);
      setStep(2);
      setOtp('');
      setResendSeconds(60);
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login/verify', { email: pendingEmail, otp });
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      setOtp('');
      setError(err?.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);

    try {
      await api.post('/api/auth/otp/resend', { email: pendingEmail, purpose: 'login' });
      setOtp('');
      setResendSeconds(60);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Family Digital Vault</p>
          <h2 className="mt-3 text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to access your family documents.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending OTP...' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-center text-sm text-slate-300">A 6-digit OTP has been sent to {pendingEmail}</p>
            <OtpInput value={otp} onChange={setOtp} error={Boolean(error)} disabled={loading} />

            {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify and sign in'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep(1)} className="font-semibold text-slate-300 hover:text-white">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendSeconds > 0 || resending}
                className="font-semibold text-sky-300 hover:text-sky-200 disabled:cursor-not-allowed disabled:text-slate-500"
              >
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : resending ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-sky-300 hover:text-sky-200">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
