import { useEffect, useState } from 'react';
import OtpInput from './OtpInput';
import {
  forgotDocumentPassword,
  resetDocumentPassword,
  verifyDocumentPassword,
} from '../api/documentPassword';

const Spinner = () => (
  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

export default function DocumentPasswordModal({ documentId, documentName, onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleUnlock = async (event) => {
    event.preventDefault();
    setError('');

    if (!password) {
      setError('Enter the document password.');
      return;
    }

    setUnlocking(true);
    try {
      const { data } = await verifyDocumentPassword(documentId, password);
      onSuccess?.(data.accessToken || null);
    } catch (err) {
      const message = err?.response?.status === 401 ? 'Incorrect password' : err?.response?.data?.message || 'Unable to unlock document.';
      setError(message);
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    } finally {
      setUnlocking(false);
    }
  };

  const handleSendOtp = async () => {
    setResetError('');
    setResetMessage('');
    setResetBusy(true);

    try {
      const { data } = await forgotDocumentPassword(documentId);
      setOtpSent(true);
      setResendCooldown(60);
      setResetMessage(data?.email ? `OTP sent to ${data.email}.` : 'OTP sent to your registered email address.');
    } catch (err) {
      setResetError(err?.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setResetError('');
    setResetMessage('');

    if (newPassword.length < 4) {
      setResetError('New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetBusy(true);
    try {
      await resetDocumentPassword(documentId, otp, newPassword, confirmPassword);
      setResetMessage('Password reset successfully!');
      setOtpSent(false);
      setResetOpen(false);
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setResetError(err?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetBusy(false);
    }
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-soft">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Cancel"
          >
            x
          </button>
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-3xl">
            🔒
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">🔒 Protected Document</h2>
          <p className="mt-2 break-words text-sm text-slate-400">{documentName || 'This document requires a password.'}</p>
        </div>

        {!resetOpen ? (
          <form onSubmit={handleUnlock} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Document password</span>
              <div className={`flex rounded-2xl border border-white/10 bg-slate-950 focus-within:border-sky-400/50 focus-within:ring-2 focus-within:ring-sky-500/20 ${shake ? 'password-shake' : ''}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 rounded-2xl bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="Enter document password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="px-4 text-sm font-semibold text-sky-300 hover:text-sky-200"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
            {resetMessage ? <p className="text-sm font-medium text-emerald-300">{resetMessage}</p> : null}

            <button
              type="submit"
              disabled={unlocking}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {unlocking ? <Spinner /> : null}
              {unlocking ? 'Unlocking...' : 'Unlock Document'}
            </button>

            <button
              type="button"
              onClick={() => {
                setResetOpen(true);
                setResetError('');
                setResetMessage('');
              }}
              className="w-full text-sm font-semibold text-amber-200 hover:text-amber-100"
            >
              Forgot Password?
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            {!otpSent ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">An OTP will be sent to your registered email address.</p>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resetBusy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetBusy ? <Spinner /> : null}
                  {resetBusy ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <OtpInput value={otp} onChange={setOtp} error={Boolean(resetError)} disabled={resetBusy} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
                />
                {confirmPassword ? (
                  <p className={`text-sm font-medium ${passwordsMatch ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetBusy ? <Spinner /> : null}
                  {resetBusy ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resetBusy || resendCooldown > 0}
                  className="w-full text-sm font-semibold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </form>
            )}

            {resetError ? <p className="text-sm font-medium text-rose-300">{resetError}</p> : null}
            {resetMessage ? <p className="text-sm font-medium text-emerald-300">{resetMessage}</p> : null}

            <button
              type="button"
              onClick={() => {
                setResetOpen(false);
                setOtpSent(false);
                setResetError('');
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 hover:bg-white/10"
            >
              Back to unlock
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
