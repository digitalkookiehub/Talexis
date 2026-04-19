import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Brain, TrendingUp, ClipboardCheck, GraduationCap } from 'lucide-react';

export function StudentPortalPage() {
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
        await register(email, password, fullName, 'student');
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
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
              <Briefcase size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Candidate Portal</h1>
            <p className="text-gray-500 text-sm mt-1">Showcase your skills & get discovered by companies</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { icon: <Brain size={14} />, label: 'AI Interviews' },
              { icon: <ClipboardCheck size={14} />, label: '4D Scoring' },
              { icon: <TrendingUp size={14} />, label: 'Get Discovered' },
            ].map((f) => (
              <div key={f.label} className="text-center p-2 bg-indigo-50 rounded-lg">
                <div className="text-indigo-600 flex justify-center mb-1">{f.icon}</div>
                <p className="text-[10px] text-indigo-700 font-medium">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Sign In</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'signup' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Sign Up</button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            {mode === 'signup' && (
              <AnimatedInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
            )}
            <AnimatedInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            <AnimatedInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'} required minLength={mode === 'signup' ? 8 : undefined} />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {mode === 'login' && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-emerald-600 hover:underline">Forgot Password?</Link>
              </div>
            )}

            <GradientButton type="submit" className="w-full" disabled={loading}>
              {loading
                ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
                : (mode === 'signup' ? 'Create Candidate Account' : 'Sign In')
              }
            </GradientButton>
          </form>

          {mode === 'signup' && (
            <p className="text-[10px] text-gray-400 mt-3 text-center">
              For experienced professionals and independent candidates. College students are registered by their placement office.
            </p>
          )}

          {mode === 'login' && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                <GraduationCap size={10} /> College students: your account is created by your placement officer. Use your credentials to sign in here.
              </p>
            </div>
          )}
        </GlassCard>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/" className="hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
