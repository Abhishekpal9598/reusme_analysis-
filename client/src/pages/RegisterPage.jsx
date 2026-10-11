import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, UserPlus, Lock, Mail, User, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';

export const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password does not satisfy the security requirements.');
      return;
    }

    try {
      setSubmitting(true);
      await register(fullName.trim(), email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 items-center justify-center text-emerald-400 mb-2">
          <Bot className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Create CareerAI Account</h1>
          <Badge variant="success" size="sm">Phase 3 Ready</Badge>
        </div>
        <p className="text-sm text-slate-400">
          Get started with AI-powered resume analysis and job matching.
        </p>
      </div>

      <Card className="space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-start gap-3 text-xs text-rose-200 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-semibold text-rose-300">Registration Error</span>
              <p className="text-rose-200 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-fullname">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                id="reg-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Sharma"
                disabled={submitting}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={submitting}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-password">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={submitting}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition-colors"
              />
            </div>
          </div>

          {/* Dynamic Password Validation Requirements */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-[11px]">
            <span className="font-semibold text-slate-300 block mb-1">Password Requirements:</span>
            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-400'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
              At least 8 characters
            </div>
            <div className={`flex items-center gap-1.5 ${hasUpperCase && hasLowerCase ? 'text-emerald-400' : 'text-slate-400'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpperCase && hasLowerCase ? 'text-emerald-400' : 'text-slate-600'}`} />
              Uppercase and lowercase letters
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumber && hasSpecialChar ? 'text-emerald-400' : 'text-slate-400'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber && hasSpecialChar ? 'text-emerald-400' : 'text-slate-600'}`} />
              At least one number and special character
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={submitting || !isPasswordValid}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Free Account
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Already registered?</span>
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
          >
            Sign In
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
};
