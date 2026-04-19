import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { GraduationCap, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        email,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to reset password. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MeshBackground />
      <GlassCard className="w-full max-w-md bg-white/80 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <GraduationCap className="text-emerald-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 mt-1">Enter your email and set a new password</p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Password Reset!</h2>
            <p className="text-gray-500 text-sm mb-6">Your password has been updated. You can now sign in.</p>
            <Link to="/login">
              <GradientButton className="w-full">
                Go to Sign In
              </GradientButton>
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <AnimatedInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <AnimatedInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
            <AnimatedInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={6}
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <GradientButton type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </GradientButton>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-emerald-600 hover:underline font-medium flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
