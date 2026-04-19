import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
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
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Talexis</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

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
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-emerald-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <GradientButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </GradientButton>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/" className="text-emerald-600 hover:underline font-medium">
            Back to portals
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
