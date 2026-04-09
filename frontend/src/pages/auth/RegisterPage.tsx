import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { UserRole } from '../../types';

const roles: { value: UserRole; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'Take mock interviews & track progress' },
  { value: 'company', label: 'Company', description: 'Browse & shortlist pre-qualified talent' },
  { value: 'college_admin', label: 'College Admin', description: 'Manage students & placements' },
];

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, fullName, role);
      navigate('/');
    } catch {
      setError('Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MeshBackground />
      <GlassCard className="w-full max-w-md bg-white/80 backdrop-blur-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <GraduationCap className="text-purple-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join Talexis today</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <AnimatedInput
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
          />
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
            placeholder="Min 8 characters"
            required
            minLength={8}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
            <div className="grid grid-cols-1 gap-2">
              {roles.map((r) => (
                <motion.button
                  key={r.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    role === r.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{r.label}</p>
                  <p className="text-xs text-gray-500">{r.description}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <GradientButton type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </GradientButton>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-600 hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
