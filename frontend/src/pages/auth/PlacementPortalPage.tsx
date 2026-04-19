import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { Users, BarChart3, Calendar } from 'lucide-react';

export function PlacementPortalPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await register(email, password, fullName, 'college_admin');
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch {
      setError(mode === 'signup' ? 'Registration failed. Email may already be in use.' : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MeshBackground />
      <div className="max-w-md w-full relative z-10">
        <GlassCard className="bg-white/80 backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
              <Users size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Placement Office</h1>
            <p className="text-gray-500 text-sm mt-1">Manage students & coordinate with companies</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: <Users size={14} />, label: 'Candidate Roster' },
              { icon: <Calendar size={14} />, label: 'Approvals' },
              { icon: <BarChart3 size={14} />, label: 'Analytics' },
            ].map((f) => (
              <div key={f.label} className="text-center p-2 bg-orange-50 rounded-lg">
                <div className="text-orange-600 flex justify-center mb-1">{f.icon}</div>
                <p className="text-[10px] text-orange-700 font-medium">{f.label}</p>
              </div>
            ))}
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Sign In</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'signup' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Sign Up</button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            {mode === 'signup' && (
              <AnimatedInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Placement Officer name" required />
            )}
            <AnimatedInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="placement@college.edu" required />
            <AnimatedInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'} required minLength={mode === 'signup' ? 8 : undefined} />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {mode === 'login' && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-emerald-600 hover:underline">Forgot Password?</Link>
              </div>
            )}

            <GradientButton type="submit" className="w-full" disabled={loading}>
              {loading ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Create Placement Account' : 'Sign In')}
            </GradientButton>
          </form>

          {mode === 'signup' && (
            <p className="text-[10px] text-gray-400 mt-3 text-center">
              After signing up, you&apos;ll be asked to set your college name on first login.
            </p>
          )}
        </GlassCard>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/" className="hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
