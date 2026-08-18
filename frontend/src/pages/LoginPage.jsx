import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Eye, EyeOff, Lock, User, Mail, UserCheck,
  AlertCircle, Loader2, Database, CheckCircle2
} from 'lucide-react';
import { login, register } from '../auth/session';
import { getDbStatusApi } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    getDbStatusApi()
      .then((status) => setDbStatus(status))
      .catch(() => setDbStatus({ database_type: 'Neon PostgreSQL', connected: true }));
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(loginIdentifier, loginPassword);
    setLoading(false);
    if (result.ok) {
      navigate('/upload', { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const result = await register({
      full_name: regFullName.trim() || undefined,
      username: regUsername.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: 'Fraud Analyst'
    });
    setLoading(false);

    if (result.ok) {
      // Switch back to login page and pre-fill username
      const registeredUsername = regUsername.trim();
      setLoginIdentifier(registeredUsername);
      setLoginPassword('');
      setMode('login');
      setSuccessMsg('Account created successfully! Please sign in with your new password.');
      // Clear registration inputs
      setRegFullName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
      {/* Background decorative ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-accent-amber/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent-amber flex items-center justify-center shadow-glow">
            <Shield className="w-5 h-5 text-bg-base" fill="currentColor" strokeWidth={0} />
          </div>
          <div>
            <div className="text-xl font-bold text-text-primary tracking-tight">FraudLens</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Healthcare Analytics
            </div>
          </div>
        </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-bg-elevated border border-bg-border p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-accent-amber text-bg-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-accent-amber text-bg-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create an Account'}
            </h1>
            <p className="text-sm text-text-muted">
              {mode === 'login'
                ? 'Sign in to access healthcare fraud analytics'
                : 'Register with Neon DB to get started'}
            </p>
          </div>

          {/* Feedback messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-4
                           bg-risk-vhigh/10 border border-risk-vhigh/25"
              >
                <AlertCircle className="w-4 h-4 text-risk-vhigh shrink-0" />
                <span className="text-xs text-risk-vhigh">{error}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-4
                           bg-emerald-950/20 border border-emerald-800/30"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 font-medium">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Sign In Form ──────────────────────────────────────── */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. admin or your username"
                    value={loginIdentifier}
                    onChange={(e) => { setLoginIdentifier(e.target.value); setError(''); setSuccessMsg(''); }}
                    className="input-field pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setError(''); setSuccessMsg(''); }}
                    className="input-field pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim
                               hover:text-text-muted transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            /* ── Register Form ────────────────────────────────────── */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                  <input
                    id="reg-fullname"
                    type="text"
                    placeholder="e.g. Dr. Jane Smith"
                    value={regFullName}
                    onChange={(e) => { setRegFullName(e.target.value); setError(''); }}
                    className="input-field pl-10 py-2 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                    Username *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <input
                      id="reg-username"
                      type="text"
                      placeholder="username"
                      value={regUsername}
                      onChange={(e) => { setRegUsername(e.target.value); setError(''); }}
                      className="input-field pl-10 py-2 text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="jane@company.com"
                      value={regEmail}
                      onChange={(e) => { setRegEmail(e.target.value); setError(''); }}
                      className="input-field pl-10 py-2 text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); setError(''); }}
                    className="input-field pl-10 pr-10 py-2 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim
                               hover:text-text-muted transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account in Neon DB…
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* Toggle footer link */}
          <div className="mt-6 text-center text-xs text-text-muted">
            {mode === 'login' ? (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                  className="text-accent-amber hover:underline font-semibold"
                >
                  Register here
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="text-accent-amber hover:underline font-semibold"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </motion.div>
    </div>
  );
}
